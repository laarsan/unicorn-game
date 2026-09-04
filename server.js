// Regnbågsgaloppen – local game server.
// Serves ./public, persists high scores in ./data/scores.json, launches the
// browser in app mode and shuts everything down on POST /api/quit.
// No npm dependencies: Node 24 standard library only.

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const LOG_FILE = path.join(ROOT, 'logs', 'server_log.txt');
const CERT_DIR = path.join(ROOT, 'cert');

const HTTP_PORT = Number(process.env.PORT || 8765);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 8443);
const MAX_SCORES = 10;
const MAX_NAME_LENGTH = 20;
const QUIT_GRACE_MS = 400; // let the quit response reach the browser first
const OPEN_BROWSER = !process.argv.includes('--no-browser');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

let browserProcess = null;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (err) {
    // Logging must never take the game down; report to console instead.
    console.error('log write failed:', err.message);
  }
}

// ---------- scores ----------

export function readScores() {
  try {
    const raw = fs.readFileSync(SCORES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidScore) : [];
  } catch (err) {
    if (err.code !== 'ENOENT') log(`scores.json unreadable, starting fresh: ${err.message}`);
    return [];
  }
}

function isValidScore(entry) {
  return Boolean(entry) && typeof entry.name === 'string' && Number.isFinite(entry.score);
}

export function sanitizeScore(input) {
  if (!input || typeof input !== 'object') return null;
  const score = Math.floor(Number(input.score));
  if (!Number.isFinite(score) || score < 0) return null;
  const name = String(input.name ?? '').trim().slice(0, MAX_NAME_LENGTH) || 'Enhörningsvän';
  const levels = Math.max(0, Math.min(99, Math.floor(Number(input.levels ?? 0)) || 0));
  return { name, score, levels, date: new Date().toISOString().slice(0, 10) };
}

export function mergeScores(existing, entry) {
  return [...existing, entry]
    .sort((a, b) => b.score - a.score || (a.date < b.date ? -1 : 1))
    .slice(0, MAX_SCORES);
}

function writeScores(scores) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = SCORES_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(scores, null, 2), 'utf8');
  fs.renameSync(tmp, SCORES_FILE);
}

// ---------- http helpers ----------

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function serveStatic(res, urlPath) {
  let relative;
  try {
    relative = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400); res.end('Bad request'); return;
  }
  if (relative === '/' || relative === '') relative = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/scores' && req.method === 'GET') {
      return sendJson(res, 200, readScores());
    }
    if (url.pathname === '/api/scores' && req.method === 'POST') {
      const entry = sanitizeScore(JSON.parse((await readBody(req)) || '{}'));
      if (!entry) return sendJson(res, 400, { error: 'invalid score' });
      const scores = mergeScores(readScores(), entry);
      writeScores(scores);
      log(`score saved: ${entry.name} ${entry.score} (levels ${entry.levels})`);
      return sendJson(res, 200, scores);
    }
    if (url.pathname === '/api/quit' && req.method === 'POST') {
      log('quit requested from game');
      sendJson(res, 200, { ok: true });
      setTimeout(shutdown, QUIT_GRACE_MS);
      return;
    }
    if (url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, https: httpsEnabled(), lan: lanAddresses(), httpsPort: HTTPS_PORT });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405); res.end(); return;
    }
    return serveStatic(res, url.pathname);
  } catch (err) {
    log(`request failed ${req.method} ${req.url}: ${err.message}`);
    sendJson(res, 500, { error: err.message });
  }
}

// ---------- browser launch ----------

function findBrowser() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function openBrowser(url) {
  const exe = findBrowser();
  if (!exe) {
    log('no Edge/Chrome found, opening default browser');
    execFile('cmd', ['/c', 'start', '', url], { windowsHide: true });
    return;
  }
  // A private profile dir makes the browser start a NEW process (so we can close
  // it on quit) and keeps the game's localStorage separate from normal browsing.
  const profileDir = path.join(ROOT, 'temp', 'browser-profile');
  fs.mkdirSync(profileDir, { recursive: true });
  const args = [
    `--app=${url}`,
    `--user-data-dir=${profileDir}`,
    '--start-fullscreen',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-session-crashed-bubble',
    '--autoplay-policy=no-user-gesture-required',
  ];
  browserProcess = spawn(exe, args, { detached: false, stdio: 'ignore' });
  browserProcess.on('exit', () => {
    log('browser window closed by user, shutting down');
    browserProcess = null;
    shutdown();
  });
  log(`browser launched: ${exe}`);
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const finish = () => {
    log('server stopped');
    process.exit(0);
  };
  if (browserProcess && browserProcess.exitCode === null) {
    // taskkill /T closes the whole browser tree; a plain kill leaves renderers alive.
    execFile('taskkill', ['/PID', String(browserProcess.pid), '/T', '/F'], { windowsHide: true }, finish);
  } else {
    finish();
  }
}

// ---------- https (VR on Quest needs a secure context) ----------

function httpsEnabled() {
  return fs.existsSync(path.join(CERT_DIR, 'key.pem')) && fs.existsSync(path.join(CERT_DIR, 'cert.pem'));
}

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

// ---------- main ----------

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const server = http.createServer(handle);
  server.listen(HTTP_PORT, () => {
    log(`http://localhost:${HTTP_PORT}`);
    if (OPEN_BROWSER) openBrowser(`http://localhost:${HTTP_PORT}/`);
  });
  server.on('error', (err) => {
    log(`http server error: ${err.message}`);
    if (err.code === 'EADDRINUSE' && OPEN_BROWSER) {
      // Another instance is already running: just open a window for it and let
      // this process stay alive until that window is closed.
      openBrowser(`http://localhost:${HTTP_PORT}/`);
    } else {
      process.exit(1);
    }
  });

  if (httpsEnabled()) {
    const options = {
      key: fs.readFileSync(path.join(CERT_DIR, 'key.pem')),
      cert: fs.readFileSync(path.join(CERT_DIR, 'cert.pem')),
    };
    https.createServer(options, handle).listen(HTTPS_PORT, () => {
      for (const ip of lanAddresses()) log(`VR (Quest-webbläsaren): https://${ip}:${HTTPS_PORT}`);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
