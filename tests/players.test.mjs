import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// scores.js touches localStorage only inside functions, so a tiny in-memory
// stand-in is enough to exercise the per-player progress store in Node.
const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
};

const { STORAGE_KEYS } = await import('../public/js/config.js');
const {
  normaliseName, getPlayer, setPlayer, listPlayers, migrateProgress, loadPlayers, savePlayers, DEFAULT_PLAYER_NAME,
} = await import('../public/js/scores.js');

beforeEach(() => memory.clear());

test('names match case-insensitively and ignore surrounding spaces', () => {
  assert.equal(normaliseName('  Zelda '), 'zelda');
  assert.equal(normaliseName('ZELDA'), normaliseName('zelda'));
  assert.equal(normaliseName('Åsa'), 'åsa');
});

test('play-test scenario: Zelda 3 levels, Lars 2 levels, Zelda continues on level 4', () => {
  const store = { current: '', players: {} };
  const zelda = getPlayer(store, 'Zelda');
  assert.equal(zelda.level, 1, 'unknown name starts fresh');
  zelda.level = 4; zelda.score = 900; zelda.bestLevel = 3;
  setPlayer(store, zelda);
  const lars = getPlayer(store, 'Lars');
  assert.equal(lars.level, 1, 'Lars does not inherit Zelda\'s progress');
  lars.level = 3; lars.score = 500; lars.bestLevel = 2;
  setPlayer(store, lars);
  assert.equal(store.current, 'lars');
  const back = getPlayer(store, 'zelda');
  assert.equal(back.level, 4, 'Zelda continues on level 4');
  assert.equal(back.score, 900);
  assert.equal(back.name, 'zelda', 'the latest spelling is shown');
  assert.equal(getPlayer(store, 'Lars').level, 3);
});

test('unknown / empty names get the default player record', () => {
  const store = { current: '', players: {} };
  assert.equal(getPlayer(store, '').name, DEFAULT_PLAYER_NAME);
  assert.equal(getPlayer(store, '   ').level, 1);
  setPlayer(store, getPlayer(store, ''));
  assert.deepEqual(Object.keys(store.players), [normaliseName(DEFAULT_PLAYER_NAME)]);
});

test('listPlayers puts the current player first, then alphabetical (sv)', () => {
  const store = { current: '', players: {} };
  for (const n of ['Örjan', 'Anna', 'Zelda']) setPlayer(store, { ...getPlayer(store, n), level: 2 });
  store.current = 'zelda';
  assert.deepEqual(listPlayers(store).map((p) => p.name), ['Zelda', 'Anna', 'Örjan']);
  assert.equal(listPlayers(store)[0].current, true);
});

test('the single-player progress of earlier builds is migrated once', () => {
  memory.set(STORAGE_KEYS.progress, JSON.stringify({ level: 5, score: 1200, name: 'Wilma', bestLevel: 4 }));
  const store = loadPlayers();
  assert.equal(store.current, 'wilma');
  assert.deepEqual(store.players.wilma, { name: 'Wilma', level: 5, score: 1200, bestLevel: 4 });
  assert.equal(memory.has(STORAGE_KEYS.progress), false, 'old key removed');
  assert.ok(memory.has(STORAGE_KEYS.players));
  assert.deepEqual(loadPlayers(), store, 'second load reads the new key');
  assert.deepEqual(migrateProgress(null), { current: '', players: {} });
});

test('savePlayers round-trips through storage', () => {
  const store = { current: 'zelda', players: { zelda: { name: 'Zelda', level: 4, score: 900, bestLevel: 3 } } };
  savePlayers(store);
  assert.deepEqual(loadPlayers(), store);
});
