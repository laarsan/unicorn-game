import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, SONG_COUNT } from '../public/js/audio.js';

test('three songs with consistent grids', () => {
  assert.equal(SONG_COUNT, 3);
  assert.equal(new Set(SONGS.map((s) => s.name)).size, SONG_COUNT, 'names unique');
  for (const song of SONGS) {
    const { stepsPerBar, melody, bass, bassPattern, kick, hat } = song;
    assert.ok(stepsPerBar === 6 || stepsPerBar === 8, `${song.name}: 3/4 or 4/4`);
    assert.equal(melody.length % stepsPerBar, 0, `${song.name}: whole bars`);
    assert.equal(bass.length, melody.length / stepsPerBar, `${song.name}: one bass root per bar`);
    for (const pattern of [bassPattern, kick, hat]) assert.equal(pattern.length, stepsPerBar, `${song.name}: pattern per bar`);
    assert.ok(kick[0] && bassPattern[0] === 'r', `${song.name}: bar starts on the root with a kick`);
    for (const n of melody) assert.ok(n === null || (n >= 60 && n <= 96), `${song.name}: melody note ${n} in range`);
    for (const n of bass) assert.ok(n >= 40 && n <= 60, `${song.name}: bass root ${n} in range`);
    assert.ok(melody.filter((n) => n !== null).length >= melody.length * 0.4, `${song.name}: not mostly rests`);
  }
});

test('songs are different tunes', () => {
  const shape = (s) => s.melody.join(',');
  assert.equal(new Set(SONGS.map(shape)).size, SONG_COUNT);
});
