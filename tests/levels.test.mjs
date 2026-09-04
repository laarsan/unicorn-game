import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, generateCourse } from '../public/js/levels.js';

const OBSTACLES = new Set(['rock', 'fence', 'arch', 'cloud']);

test('five levels with increasing speed and length', () => {
  assert.equal(LEVELS.length, 5);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].speed > LEVELS[i - 1].speed, `level ${i + 1} faster`);
    assert.ok(LEVELS[i].length > LEVELS[i - 1].length, `level ${i + 1} longer`);
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
  const firstObstacle = l1.find((i) => OBSTACLES.has(i.type));
  assert.equal(firstObstacle.type, 'rock');
  const l3 = generateCourse(LEVELS[2]);
  assert.equal(l3.find((i) => OBSTACLES.has(i.type)).type, 'arch');
  assert.ok(generateCourse(LEVELS[1]).some((i) => i.type === 'bubble'));
});
