import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upsertScore, isBetterScore, starRating, MAX_SCORES } from '../public/js/scoreboard.js';
import { STAR_RATING } from '../public/js/config.js';

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

test('star rating is generous: a third of the stars gives three, an eighth gives two', () => {
  assert.equal(starRating(7, 20), 3);
  assert.equal(starRating(6, 20), 2);
  assert.equal(starRating(3, 20), 2);
  assert.equal(starRating(2, 20), 1);
  assert.equal(starRating(0, 20), 1);
  assert.equal(starRating(0, 0), 3, 'a level without stars is always three');
  assert.ok(STAR_RATING.three <= 0.35 && STAR_RATING.two <= 0.12, 'thresholds must stay at or below play-test 7 values');
});

test('a flight-mode entry keeps its mode through the merge', () => {
  const list = upsertScore([], { ...row('Zelda', 900, 3), mode: 'fly' });
  assert.equal(list[0].mode, 'fly');
});
