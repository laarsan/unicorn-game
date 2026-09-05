import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upsertScore, isBetterScore, MAX_SCORES } from '../public/js/scoreboard.js';

const row = (name, score, levels, date = '2026-09-05') => ({ name, score, levels, date });

test('every player who cleared a level gets a row, sorted by score', () => {
  let list = upsertScore([], row('Zelda', 900, 3));
  list = upsertScore(list, row('Lars', 500, 2));
  assert.deepEqual(list.map((s) => [s.name, s.score, s.levels]), [['Zelda', 900, 3], ['Lars', 500, 2]]);
});

test('clearing the next level replaces the player\'s row instead of adding one', () => {
  let list = upsertScore([], row('Zelda', 300, 1));
  list = upsertScore(list, row('zelda ', 620, 2));
  list = upsertScore(list, row('ZELDA', 900, 3));
  assert.equal(list.length, 1);
  assert.equal(list[0].score, 900);
  assert.equal(list[0].levels, 3);
  assert.equal(list[0].name, 'ZELDA', 'latest spelling wins');
});

test('a new run from level 1 keeps the old best until it is beaten', () => {
  let list = upsertScore([], row('Zelda', 900, 3));
  list = upsertScore(list, row('Zelda', 250, 1));
  assert.deepEqual(list.map((s) => [s.score, s.levels]), [[900, 3]]);
  list = upsertScore(list, row('Zelda', 950, 3));
  assert.deepEqual(list.map((s) => [s.score, s.levels]), [[950, 3]]);
});

test('equal points: more cleared levels wins', () => {
  assert.equal(isBetterScore(row('a', 500, 3), row('a', 500, 2)), true);
  assert.equal(isBetterScore(row('a', 500, 2), row('a', 500, 3)), false);
  const list = upsertScore([row('Lars', 500, 2)], row('Zelda', 500, 3));
  assert.equal(list[0].name, 'Zelda');
});

test('the list is capped at MAX_SCORES distinct players', () => {
  let list = [];
  for (let i = 0; i < MAX_SCORES + 3; i++) list = upsertScore(list, row('n' + i, (i + 1) * 100, 1));
  assert.equal(list.length, MAX_SCORES);
  assert.equal(list[0].score, (MAX_SCORES + 3) * 100);
  assert.ok(!list.some((s) => s.score === 100));
});
