import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeScore, mergeScores } from '../server.js';

test('sanitizeScore trims, caps and defaults the name', () => {
  const e = sanitizeScore({ name: '  Lisa  ', score: 123.7, levels: 5 });
  assert.equal(e.name, 'Lisa');
  assert.equal(e.score, 123);
  assert.equal(e.levels, 5);
  assert.equal(sanitizeScore({ name: '', score: 10 }).name, 'Enhörningsvän');
  assert.equal(sanitizeScore({ name: 'x'.repeat(50), score: 1 }).name.length, 20);
});

test('sanitizeScore rejects garbage', () => {
  assert.equal(sanitizeScore(null), null);
  assert.equal(sanitizeScore({ score: 'abc' }), null);
  assert.equal(sanitizeScore({ score: -5 }), null);
});

test('mergeScores sorts descending and keeps top 10', () => {
  const existing = Array.from({ length: 10 }, (_, i) => ({ name: 'n' + i, score: (i + 1) * 100, levels: 1, date: '2026-01-01' }));
  const merged = mergeScores(existing, { name: 'new', score: 550, levels: 2, date: '2026-02-01' });
  assert.equal(merged.length, 10);
  assert.equal(merged[0].score, 1000);
  assert.ok(merged.some((s) => s.name === 'new'));
  assert.ok(!merged.some((s) => s.score === 100));
});

test('mergeScores keeps one row per player (case-insensitive) with the best run', () => {
  const merged = mergeScores([{ name: 'Zelda', score: 300, levels: 1, date: '2026-09-05' }], { name: 'zelda', score: 620, levels: 2, date: '2026-09-05' });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].score, 620);
  assert.equal(merged[0].levels, 2);
});
