// High scores + progress persistence. Scores go to the local server
// (data/scores.json) with a localStorage fallback so the game still works when
// opened as a plain file or from a browser that can't reach the API.

import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from './config.js';

const MAX_SCORES = 10;

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn('localStorage read failed', key, err);
    return fallback;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('localStorage write failed', key, err);
  }
}

// Drop data written under an older storage namespace so a fresh version of
// the game looks unplayed (no "continue on level N", no stale local top list).
export function forgetLegacyStorage() {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn('localStorage cleanup failed', key, err);
    }
  }
}

export async function loadScores() {
  try {
    const res = await fetch('/api/scores', { cache: 'no-store' });
    if (res.ok) {
      const scores = await res.json();
      writeLocal(STORAGE_KEYS.scores, scores);
      return scores;
    }
  } catch (err) {
    console.warn('score API unavailable, using localStorage', err.message);
  }
  return readLocal(STORAGE_KEYS.scores, []);
}

export async function saveScore(entry) {
  const local = readLocal(STORAGE_KEYS.scores, []);
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const merged = [...local, { ...entry, date }]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SCORES);
  writeLocal(STORAGE_KEYS.scores, merged);
  try {
    const res = await fetch('/api/scores', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry),
    });
    if (res.ok) {
      const scores = await res.json();
      writeLocal(STORAGE_KEYS.scores, scores);
      return scores;
    }
  } catch (err) {
    console.warn('score API unavailable, saved locally only', err.message);
  }
  return merged;
}

// Progress is kept per player name so siblings can share the computer: Zelda
// stops after three levels, Lars plays two, and when Zelda types her name again
// she continues on level 4. Names are matched case-insensitively ("zelda" ==
// "Zelda"); the most recent spelling is what the menu shows.
export const DEFAULT_PLAYER_NAME = 'Enhörningsvän';

export function normaliseName(name) {
  return String(name || '').trim().toLocaleLowerCase('sv');
}

export function newPlayer(name) {
  return { name: String(name || '').trim() || DEFAULT_PLAYER_NAME, level: 1, score: 0, bestLevel: 0 };
}

// Pure store operations (also unit-tested): the store is { current, players }.
export function getPlayer(store, name) {
  const key = normaliseName(name);
  const existing = key ? store.players[key] : null;
  return existing ? { ...existing, name: String(name).trim() || existing.name } : newPlayer(name);
}

export function setPlayer(store, record) {
  const key = normaliseName(record.name);
  if (!key) return store;
  store.players[key] = { ...record };
  store.current = key;
  return store;
}

export function listPlayers(store) {
  const current = store.current;
  return Object.entries(store.players)
    .map(([key, p]) => ({ key, ...p, current: key === current }))
    .sort((a, b) => (a.current ? -1 : b.current ? 1 : a.name.localeCompare(b.name, 'sv')));
}

// Convert the single-player progress record of earlier builds into the store.
export function migrateProgress(legacy) {
  const store = { current: '', players: {} };
  if (legacy && legacy.name) setPlayer(store, { ...newPlayer(legacy.name), level: legacy.level || 1, score: legacy.score || 0, bestLevel: legacy.bestLevel || 0 });
  return store;
}

export function loadPlayers() {
  const stored = readLocal(STORAGE_KEYS.players, null);
  if (stored && stored.players) return { current: stored.current || '', players: stored.players };
  const store = migrateProgress(readLocal(STORAGE_KEYS.progress, null));
  writeLocal(STORAGE_KEYS.players, store);
  try { localStorage.removeItem(STORAGE_KEYS.progress); } catch (err) { console.warn('localStorage cleanup failed', err); }
  return store;
}

export function savePlayers(store) {
  writeLocal(STORAGE_KEYS.players, store);
}

export function loadSettings() {
  return readLocal(STORAGE_KEYS.settings, { muted: false });
}

export function saveSettings(settings) {
  writeLocal(STORAGE_KEYS.settings, settings);
}

export async function requestQuit() {
  try {
    await fetch('/api/quit', { method: 'POST' });
    return true;
  } catch (err) {
    console.warn('quit API unavailable', err.message);
    return false;
  }
}
