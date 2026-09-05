// The top list: one row per player (name matched case-insensitively), showing
// the best score that player has reached and how many levels that run had
// cleared. Pure functions shared by the server (data/scores.json) and the
// browser's localStorage fallback so both keep the list the same way.

import { STAR_RATING } from './config.js';

export const MAX_SCORES = 10;

// 1–3 stars for a cleared level from the share of its stars that were
// collected. A level without stars is always three.
export function starRating(got, total) {
  const ratio = total ? got / total : 1;
  return ratio >= STAR_RATING.three ? 3 : ratio >= STAR_RATING.two ? 2 : 1;
}

export function normaliseName(name) {
  return String(name || '').trim().toLocaleLowerCase('sv');
}

// A run beats another when it has more points; equal points → more levels.
export function isBetterScore(a, b) {
  return a.score > b.score || (a.score === b.score && (a.levels || 0) > (b.levels || 0));
}

// Insert `entry` and keep only the best row per name. The list is sorted by
// score, then levels, then the earlier date wins ties, capped at MAX_SCORES.
export function upsertScore(existing, entry) {
  const key = normaliseName(entry.name);
  const rest = existing.filter((s) => normaliseName(s.name) !== key);
  const previous = existing.find((s) => normaliseName(s.name) === key);
  const winner = previous && !isBetterScore(entry, previous) ? previous : entry;
  return [...rest, winner]
    .sort((a, b) => b.score - a.score || (b.levels || 0) - (a.levels || 0) || String(a.date || '').localeCompare(String(b.date || '')))
    .slice(0, MAX_SCORES);
}
