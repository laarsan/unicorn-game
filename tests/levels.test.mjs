import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS, CHUNKS, generateCourse, LEVEL_COUNT, CALM_LEVELS, SPEED_CALM, SPEED_MAX,
  BUBBLE_SCALE_CALM, BUBBLE_SCALE_MAX_LEVEL,
} from '../public/js/levels.js';

const OBSTACLES = new Set(['rock', 'fence', 'arch', 'cloud']);

test('25 levels with sequential ids, unique names and seeds', () => {
  assert.equal(LEVELS.length, LEVEL_COUNT);
  assert.equal(LEVEL_COUNT, 25);
  LEVELS.forEach((l, i) => assert.equal(l.id, i + 1));
  assert.equal(new Set(LEVELS.map((l) => l.name)).size, LEVELS.length, 'names unique');
  assert.equal(new Set(LEVELS.map((l) => l.seed)).size, LEVELS.length, 'seeds unique');
  for (const l of LEVELS) assert.ok(/[a-zåäöA-ZÅÄÖ]/.test(l.name) && l.subtitle.length > 5, `${l.id} has name + subtitle`);
});

test('difficulty curve: calm through level 15, gentle ramp to level 25', () => {
  for (const l of LEVELS.slice(0, CALM_LEVELS)) {
    assert.equal(l.speed, SPEED_CALM, `level ${l.id} keeps the calm speed`);
    assert.deepEqual(l.gap, LEVELS[0].gap, `level ${l.id} keeps the calm spacing`);
  }
  assert.equal(LEVELS[LEVEL_COUNT - 1].speed, SPEED_MAX, 'level 25 runs at the old level-5 speed');
  assert.equal(SPEED_MAX, 14.5);
  for (let i = CALM_LEVELS; i < LEVEL_COUNT; i++) {
    const step = LEVELS[i].speed - LEVELS[i - 1].speed;
    assert.ok(step > 0 && step <= 0.6, `level ${i + 1} is a little faster (+${step.toFixed(2)})`);
    assert.ok(LEVELS[i].gap[0] <= LEVELS[i - 1].gap[0], `level ${i + 1} spacing does not grow`);
  }
  for (let i = 1; i < LEVEL_COUNT; i++) assert.ok(LEVELS[i].length >= LEVELS[i - 1].length, `level ${i + 1} not shorter`);
});

test('bubble size: double on calm levels, shrinking to 125 % on level 25', () => {
  for (const l of LEVELS.slice(0, CALM_LEVELS)) assert.equal(l.bubbleScale, BUBBLE_SCALE_CALM);
  assert.equal(BUBBLE_SCALE_CALM, 2);
  assert.equal(LEVELS[LEVEL_COUNT - 1].bubbleScale, BUBBLE_SCALE_MAX_LEVEL);
  assert.equal(BUBBLE_SCALE_MAX_LEVEL, 1.25);
  for (let i = CALM_LEVELS; i < LEVEL_COUNT; i++) {
    assert.ok(LEVELS[i].bubbleScale < LEVELS[i - 1].bubbleScale, `level ${i + 1} bubbles smaller`);
  }
});

test('every level references only existing chunks', () => {
  for (const l of LEVELS) {
    for (const name of Object.keys(l.chunks)) assert.ok(CHUNKS[name], `${l.name}: chunk ${name}`);
  }
});

test('course generation is deterministic', () => {
  for (const level of LEVELS) {
    const a = generateCourse(level), b = generateCourse(level);
    assert.deepEqual(a, b);
    assert.ok(a.length > 50, `${level.name} has content`);
  }
});

test('at least one lane is always free of obstacles', () => {
  for (const level of LEVELS) {
    const obstacles = generateCourse(level).filter((i) => OBSTACLES.has(i.type));
    for (const o of obstacles) {
      const near = obstacles.filter((p) => Math.abs(p.d - o.d) < 2.5);
      const blocked = new Set(near.map((p) => p.lane));
      assert.ok(blocked.size < 3, `${level.name}: all lanes blocked near d=${o.d}`);
    }
  }
});

test('obstacles leave a calm intro and room before the finish', () => {
  for (const level of LEVELS) {
    const obstacles = generateCourse(level).filter((i) => OBSTACLES.has(i.type));
    assert.ok(Math.min(...obstacles.map((o) => o.d)) >= 30, `${level.name}: intro`);
    assert.ok(Math.max(...obstacles.map((o) => o.d)) <= level.length - 20, `${level.name}: outro`);
  }
});

test('tutorial levels place their teaching chunk first', () => {
  const l1 = generateCourse(LEVELS[0]);
  assert.equal(l1.find((i) => OBSTACLES.has(i.type)).type, 'rock');
  assert.ok(generateCourse(LEVELS[1]).some((i) => i.type === 'bubble'));
  assert.equal(generateCourse(LEVELS[2]).find((i) => OBSTACLES.has(i.type)).type, 'arch');
  assert.equal(generateCourse(LEVELS[4]).find((i) => OBSTACLES.has(i.type)).type, 'cloud');
});

test('every level from 2 on has at least one heart (extra life), level 1 none', () => {
  assert.equal(generateCourse(LEVELS[0]).filter((i) => i.type === 'heart').length, 0);
  for (const level of LEVELS.slice(1)) {
    const hearts = generateCourse(level).filter((i) => i.type === 'heart');
    assert.ok(hearts.length >= 1, `${level.name}: heart`);
    assert.ok(hearts[0].d <= level.length * 0.6, `${level.name}: first heart before 60 %`);
  }
});

test('big bubbles are spaced so they do not overlap', () => {
  for (const level of [LEVELS[1], LEVELS[14], LEVELS[24]]) {
    const bubbles = generateCourse(level).filter((i) => i.type === 'bubble');
    const radius = 0.95 * level.bubbleScale;
    for (let i = 1; i < bubbles.length; i++) {
      const a = bubbles[i - 1], b = bubbles[i];
      const dist = Math.hypot(a.d - b.d, a.x - b.x, a.y - b.y);
      assert.ok(dist >= radius * 1.6, `${level.name}: bubbles ${i - 1}/${i} too close (${dist.toFixed(1)})`);
    }
  }
});
