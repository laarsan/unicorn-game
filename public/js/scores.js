// High scores + progress persistence. Scores go to the local server
// (data/scores.json) with a localStorage fallback so the game still works when
// opened as a plain file or from a browser that can't reach the API.

import { STORAGE_KEYS } from './config.js';

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

// Progress: which level the player reached and the running score, so a child
// can stop after two levels and continue tomorrow.
export function loadProgress() {
  return readLocal(STORAGE_KEYS.progress, { level: 1, score: 0, name: '', bestLevel: 0 });
}

export function saveProgress(progress) {
  writeLocal(STORAGE_KEYS.progress, progress);
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
