// Level definitions and the deterministic course generator.
// A level is data: theme colours, speed, length and a weighted set of
// "chunks" (hand-designed patterns). The generator lays chunks out along the
// course with a seeded RNG so every level plays the same each time.

import { SONG_COUNT } from './audio.js';
//
// Difficulty curve (tuned after the first play-test with a 7-year-old):
//   levels 1–15  keep the calm pace of the original level 1 while new things
//                (bubbles, arches, crystals, clouds, hearts) are introduced,
//   levels 16–24 speed up a little per level,
//   level 25     runs at the pace the original level 5 had.

export const LEVEL_COUNT = 25;
export const CALM_LEVELS = 15;            // levels 1..CALM_LEVELS share the calm speed
export const SPEED_CALM = 9;
export const SPEED_MAX = 14.5;
export const BUBBLE_SCALE_CALM = 2.0;     // bubbles are twice their original size on the calm levels
export const BUBBLE_SCALE_MAX_LEVEL = 1.25;
const GAP_CALM = [7, 12];
const GAP_MAX_LEVEL = [5, 8];
const LENGTH_FIRST = 420;
const LENGTH_CALM_LAST = 560;
const LENGTH_MAX_LEVEL = 860;
const HEART_GUARANTEE_AT = 0.45;          // fraction of the course where a heart is forced if none came yet

// ---------- themes (base colours + roadside decor) ----------
const THEMES = {
  meadow: {
    skyTop: 0x7fc8ff, skyBottom: 0xfff1f7, fog: 0xffe6f2,
    ground: 0x9be27a, decor: 'meadow', sun: 0xfff2a8, sunY: 40,
    musicKey: 0, musicTempo: 118, musicWave: 'triangle',
  },
  clouds: {
    skyTop: 0x62b3ff, skyBottom: 0xe8f6ff, fog: 0xe4f1ff,
    ground: null, decor: 'clouds', sun: 0xfff6c8, sunY: 45,
    musicKey: 2, musicTempo: 122, musicWave: 'triangle',
  },
  candy: {
    skyTop: 0xff9ecf, skyBottom: 0xfff4c2, fog: 0xffe9d6,
    ground: 0xffc2e2, decor: 'candy', sun: 0xfff7b0, sunY: 38,
    musicKey: 4, musicTempo: 126, musicWave: 'square',
  },
  night: {
    skyTop: 0x1b1f5e, skyBottom: 0x6a4fb3, fog: 0x5a47a6,
    ground: 0x2f2a6b, decor: 'night', sun: 0xfff6d5, sunY: 42, moon: true,
    musicKey: -3, musicTempo: 122, musicWave: 'sine',
  },
  city: {
    skyTop: 0x3b7bff, skyBottom: 0xffd9a8, fog: 0xf2d9c4,
    ground: 0x8c94a8, decor: 'city', sun: 0xffe08a, sunY: 30,
    musicKey: 5, musicTempo: 130, musicWave: 'square',
  },
};

// Chunk weight profiles. `focus` chunks get extra weight on a level.
const BASE_CHUNKS = {
  calm:  { starLine: 5, starZigzag: 3, rockJump: 3, fenceJump: 1, crystalHop: 1 },
  mixed: { starLine: 4, starZigzag: 3, rockJump: 3, fenceJump: 2, archDuck: 2, bubbleCluster: 3, crystalHop: 2, cloudWall: 1, heartGift: 1 },
  busy:  { starLine: 3, starZigzag: 3, rockJump: 3, fenceJump: 3, archDuck: 4, bubbleCluster: 4, crystalHop: 4, cloudWall: 3, heartGift: 1 },
};

// One row per level: name, subtitle, theme, colour overrides, chunk profile,
// focus chunks and tutorial tips. Everything numeric (speed, gap, length,
// bubble size) comes from the difficulty curve below.
const LEVEL_ROWS = [
  // --- 1–5: one new thing per level ---
  { name: 'Regnbågsängen', subtitle: 'Samla stjärnor och hoppa över stenar!', theme: 'meadow',
    chunks: 'calm', tips: ['move', 'jump'] },
  { name: 'Molnriket', subtitle: 'Klicka på bubblorna med musen – och fånga hjärtat!', theme: 'clouds',
    chunks: { starLine: 4, starZigzag: 3, rockJump: 3, fenceJump: 1, bubbleCluster: 5, crystalHop: 1, heartGift: 1 }, tips: ['bubble', 'heart'] },
  { name: 'Godislandet', subtitle: 'Ducka under regnbågsbågarna!', theme: 'candy',
    chunks: { starLine: 3, starZigzag: 3, rockJump: 3, fenceJump: 1, archDuck: 5, bubbleCluster: 3, crystalHop: 1, heartGift: 1 }, tips: ['duck'] },
  { name: 'Stjärnnatten', subtitle: 'Hoppa högt efter kristallerna!', theme: 'night',
    chunks: { starLine: 3, starZigzag: 3, rockJump: 3, fenceJump: 2, archDuck: 2, bubbleCluster: 3, crystalHop: 5, heartGift: 1 }, tips: [] },
  { name: 'Spindelstaden', subtitle: 'Spindelvännerna hejar på dig – akta molnen!', theme: 'city', spiders: true,
    chunks: { starLine: 3, starZigzag: 3, rockJump: 3, fenceJump: 2, archDuck: 3, bubbleCluster: 3, crystalHop: 3, cloudWall: 3, heartGift: 1 }, tips: ['cloud'] },
  // --- 6–15: calm pace, varied worlds ---
  { name: 'Blomsterdalen', subtitle: 'Blommorna doftar – samla alla stjärnor!', theme: 'meadow',
    colors: { skyTop: 0x9ad8ff, skyBottom: 0xfff7e0, ground: 0xa8e88c }, chunks: 'mixed', focus: ['starLine', 'rockJump'], tips: [] },
  { name: 'Bubbelhimlen', subtitle: 'Himlen är full av bubblor!', theme: 'clouds',
    colors: { skyTop: 0x7ac4ff, skyBottom: 0xf4faff }, chunks: 'mixed', focus: ['bubbleCluster', 'bubbleCluster'], tips: [] },
  { name: 'Glassberget', subtitle: 'Ducka under bågarna och fånga hjärtat!', theme: 'candy',
    colors: { skyTop: 0xffb0d8, skyBottom: 0xfff9e6, ground: 0xffd6ea }, chunks: 'mixed', focus: ['archDuck', 'archDuck'], tips: [] },
  { name: 'Månskensskogen', subtitle: 'Kristallerna glittrar i månskenet.', theme: 'night',
    colors: { skyTop: 0x141a4d, skyBottom: 0x7a5bc9, ground: 0x2a3a6b }, chunks: 'mixed', focus: ['crystalHop', 'crystalHop'], tips: [] },
  { name: 'Glitterstaden', subtitle: 'Byt fil förbi de sura molnen!', theme: 'city',
    colors: { skyTop: 0x5a8dff, skyBottom: 0xffe6c2 }, chunks: 'mixed', focus: ['cloudWall'], tips: [] },
  { name: 'Smultronängen', subtitle: 'Smultron och stjärnor så långt ögat når.', theme: 'meadow',
    colors: { skyTop: 0x6fc0ff, skyBottom: 0xffe9ee, ground: 0x8fd96e }, chunks: 'mixed', focus: ['starZigzag', 'fenceJump'], tips: [] },
  { name: 'Regnbågsmolnen', subtitle: 'Bubblor och hopp mellan molnen.', theme: 'clouds',
    colors: { skyTop: 0x8fb8ff, skyBottom: 0xffe4f3 }, chunks: 'mixed', focus: ['bubbleCluster', 'rockJump'], tips: [] },
  { name: 'Sockervaddslandet', subtitle: 'Mjukt som sockervadd – men ducka i tid!', theme: 'candy',
    colors: { skyTop: 0xffc4e6, skyBottom: 0xfffbea, ground: 0xffe0f0 }, chunks: 'mixed', focus: ['archDuck', 'bubbleCluster'], tips: [] },
  { name: 'Norrskensnatten', subtitle: 'Norrskenet dansar över himlen.', theme: 'night',
    colors: { skyTop: 0x0f2a4d, skyBottom: 0x4fb39a, fog: 0x3f7f8a, ground: 0x24405c }, chunks: 'mixed', focus: ['crystalHop', 'starLine'], tips: [] },
  { name: 'Diamantstaden', subtitle: 'Sista lugna banan – allt på en gång!', theme: 'city', spiders: true,
    colors: { skyTop: 0x4f6fff, skyBottom: 0xffd0b0 }, chunks: 'mixed', focus: ['cloudWall', 'crystalHop'], tips: [] },
  // --- 16–24: a little faster for every level ---
  { name: 'Solskensängen', subtitle: 'Nu galopperar vi lite fortare!', theme: 'meadow',
    colors: { skyTop: 0xffd27a, skyBottom: 0xfff4d6, ground: 0xb4e87c, sun: 0xffb347 }, chunks: 'mixed', focus: ['rockJump', 'fenceJump'], tips: [] },
  { name: 'Vindarnas rike', subtitle: 'Vinden viner bland bubblorna.', theme: 'clouds',
    colors: { skyTop: 0x4d9fff, skyBottom: 0xdcefff }, chunks: 'mixed', focus: ['bubbleCluster', 'cloudWall'], tips: [] },
  { name: 'Chokladfloden', subtitle: 'Bågar överallt – håll huvudet lågt!', theme: 'candy',
    colors: { skyTop: 0xff8fbf, skyBottom: 0xffe6b8, ground: 0xd9a06b }, chunks: 'busy', focus: ['archDuck'], tips: [] },
  { name: 'Kometnatten', subtitle: 'Kometerna far över himlen.', theme: 'night',
    colors: { skyTop: 0x1a1140, skyBottom: 0x8a4fb3, ground: 0x352a6b }, chunks: 'busy', focus: ['crystalHop'], tips: [] },
  { name: 'Fyrverkeristaden', subtitle: 'Staden firar dig!', theme: 'city',
    colors: { skyTop: 0x2f4fbf, skyBottom: 0xffc2a0 }, chunks: 'busy', focus: ['cloudWall', 'bubbleCluster'], tips: [] },
  { name: 'Fjärilsängen', subtitle: 'Fjärilarna hinner knappt med!', theme: 'meadow',
    colors: { skyTop: 0x5fb8ff, skyBottom: 0xffeaf4, ground: 0x9fe07a }, chunks: 'busy', focus: ['starZigzag', 'rockJump'], tips: [] },
  { name: 'Stormmolnen', subtitle: 'Sura moln överallt – hitta den fria filen!', theme: 'clouds',
    colors: { skyTop: 0x4a6fa8, skyBottom: 0xcfdcee, fog: 0xd0dcea }, chunks: 'busy', focus: ['cloudWall', 'cloudWall'], tips: [] },
  { name: 'Karamellkusten', subtitle: 'Karameller, bågar och bubblor i ett!', theme: 'candy',
    colors: { skyTop: 0xff9ad0, skyBottom: 0xfff0c8, ground: 0xffc8de }, chunks: 'busy', focus: ['archDuck', 'bubbleCluster'], tips: [] },
  { name: 'Drakmånens natt', subtitle: 'Nästan framme – kristaller överallt!', theme: 'night',
    colors: { skyTop: 0x2a0f4d, skyBottom: 0xb35f8a, ground: 0x3f2a6b }, chunks: 'busy', focus: ['crystalHop', 'fenceJump'], tips: [] },
  // --- 25: the grand finale ---
  { name: 'Enhörningsslottet', subtitle: 'Sista banan – hela slottet hejar på dig!', theme: 'city', spiders: true,
    colors: { skyTop: 0x6a4fff, skyBottom: 0xffd9f0, fog: 0xf0d6f2, ground: 0xa89ccf }, chunks: 'busy', tips: [] },
];

const lerp = (a, b, t) => a + (b - a) * t;
const round1 = (v) => Math.round(v * 100) / 100;

// Fraction of the way from the last calm level to the final level (0 on
// calm levels, 1 on level LEVEL_COUNT).
function rampFraction(id) {
  if (id <= CALM_LEVELS) return 0;
  return (id - CALM_LEVELS) / (LEVEL_COUNT - CALM_LEVELS);
}

export function speedForLevel(id) {
  return round1(lerp(SPEED_CALM, SPEED_MAX, rampFraction(id)));
}

export function bubbleScaleForLevel(id) {
  return round1(lerp(BUBBLE_SCALE_CALM, BUBBLE_SCALE_MAX_LEVEL, rampFraction(id)));
}

function gapForLevel(id) {
  const f = rampFraction(id);
  return [round1(lerp(GAP_CALM[0], GAP_MAX_LEVEL[0], f)), round1(lerp(GAP_CALM[1], GAP_MAX_LEVEL[1], f))];
}

function lengthForLevel(id) {
  if (id <= CALM_LEVELS) return Math.round(lerp(LENGTH_FIRST, LENGTH_CALM_LAST, (id - 1) / (CALM_LEVELS - 1)));
  return Math.round(lerp(LENGTH_CALM_LAST, LENGTH_MAX_LEVEL, rampFraction(id)));
}

function chunksForRow(row) {
  const base = typeof row.chunks === 'string' ? BASE_CHUNKS[row.chunks] : row.chunks;
  const chunks = { ...base };
  for (const name of row.focus || []) chunks[name] = (chunks[name] || 0) + 2;
  return chunks;
}

function buildLevel(row, index) {
  const id = index + 1;
  const base = THEMES[row.theme];
  return {
    id,
    name: row.name,
    subtitle: row.subtitle,
    seed: id * 11,
    speed: speedForLevel(id),
    length: lengthForLevel(id),
    gap: gapForLevel(id),
    bubbleScale: bubbleScaleForLevel(id),
    theme: {
      ...base,
      ...(row.colors || {}),
      spiders: Boolean(row.spiders),
      // small musical variation between levels sharing a theme, and the
      // three songs rotate so consecutive levels never repeat a tune
      musicTempo: base.musicTempo + (index % 3) * 3 + Math.round(rampFraction(id) * 8),
      musicSong: index % SONG_COUNT,
    },
    chunks: chunksForRow(row),
    tips: row.tips,
  };
}

export const LEVELS = LEVEL_ROWS.map(buildLevel);

// ---------- seeded RNG (mulberry32) ----------
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pickLane = (rng) => [-1, 0, 1][Math.floor(rng() * 3)];
const otherLanes = (lane) => [-1, 0, 1].filter((l) => l !== lane);

// Each chunk returns { items: [{ d, lane, type, x?, y? }], length }.
// d = distance from chunk start along the course. Bubbles carry free x/y.
// Chunks receive the level so they can adapt (bubble size → spacing).
export const CHUNKS = {
  starLine(rng) {
    const lane = pickLane(rng);
    const n = 4 + Math.floor(rng() * 3);
    return { length: n * 1.8, items: Array.from({ length: n }, (_, i) => ({ d: i * 1.8, lane, type: 'star' })) };
  },
  starZigzag(rng) {
    const start = rng() < 0.5 ? -1 : 1;
    const items = [];
    let lane = start;
    for (let i = 0; i < 6; i++) {
      items.push({ d: i * 2.2, lane, type: 'star' });
      if (i % 2 === 1) lane = lane === start ? -start : start;
    }
    return { length: 6 * 2.2, items };
  },
  rockJump(rng) {
    const lane = pickLane(rng);
    return {
      length: 8,
      items: [
        { d: 4, lane, type: 'rock' },
        { d: 2.6, lane, type: 'airStar' }, { d: 4, lane, type: 'airStar' }, { d: 5.4, lane, type: 'airStar' },
        { d: 4, lane: otherLanes(lane)[Math.floor(rng() * 2)], type: 'star' },
      ],
    };
  },
  fenceJump(rng) {
    const lane = pickLane(rng);
    const other = otherLanes(lane)[Math.floor(rng() * 2)];
    return {
      length: 9,
      items: [
        { d: 4.5, lane, type: 'fence' },
        { d: 4.5, lane, type: 'airStar' },
        { d: 2, lane: other, type: 'star' }, { d: 4.5, lane: other, type: 'star' }, { d: 7, lane: other, type: 'star' },
      ],
    };
  },
  archDuck(rng) {
    const lane = pickLane(rng);
    return {
      length: 9,
      items: [
        { d: 4.5, lane, type: 'arch' },
        { d: 2.5, lane, type: 'star' }, { d: 4.5, lane, type: 'star' }, { d: 6.5, lane, type: 'star' },
      ],
    };
  },
  cloudWall(rng) {
    const free = pickLane(rng);
    const blocked = otherLanes(free);
    return {
      length: 10,
      items: [
        { d: 5, lane: blocked[0], type: 'cloud' }, { d: 5, lane: blocked[1], type: 'cloud' },
        { d: 2, lane: free, type: 'star' }, { d: 5, lane: free, type: 'star' }, { d: 8, lane: free, type: 'star' },
      ],
    };
  },
  crystalHop(rng) {
    const lane = pickLane(rng);
    return {
      length: 6,
      items: [
        { d: 3, lane, type: 'crystal' },
        { d: 1, lane, type: 'star' }, { d: 5, lane, type: 'star' },
      ],
    };
  },
  bubbleCluster(rng, level) {
    const scale = level ? level.bubbleScale : 1;
    const n = 2 + Math.floor(rng() * 2);
    const spacing = 2.5 + 1.6 * scale;          // big bubbles need more room between them
    const items = [];
    for (let i = 0; i < n; i++) {
      items.push({ d: i * spacing, lane: 0, type: 'bubble', x: (rng() - 0.5) * 8, y: 1.6 + 0.9 * scale + rng() * 1.6 });
    }
    return { length: n * spacing, items };
  },
  // A heart (extra life) with two stars leading into its lane.
  heartGift(rng) {
    const lane = pickLane(rng);
    return {
      length: 6,
      items: [
        { d: 0.5, lane, type: 'star' }, { d: 2, lane, type: 'star' },
        { d: 4, lane, type: 'heart' },
      ],
    };
  },
};

function weightedPick(rng, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [name, w] of entries) {
    r -= w;
    if (r <= 0) return name;
  }
  return entries[entries.length - 1][0];
}

// Lays chunks along the course. Returns items sorted by distance.
// The first `intro` units stay empty so the player gets a calm start, and the
// first appearance of each chunk kind is guaranteed early when a tip needs it.
// Levels with hearts always get at least one, by HEART_GUARANTEE_AT of the way.
export function generateCourse(level) {
  const rng = makeRng(level.seed);
  const items = [];
  const intro = 40;
  const outro = 30;
  let d = intro;
  let last = null;
  let heartPlaced = false;
  // Make sure the level's tutorial chunks come first.
  const forced = [];
  if (level.tips.includes('jump')) forced.push('starLine', 'rockJump');
  if (level.tips.includes('bubble')) forced.push('bubbleCluster');
  if (level.tips.includes('duck')) forced.push('archDuck');
  if (level.tips.includes('cloud')) forced.push('starLine', 'cloudWall');
  while (d < level.length - outro) {
    let name = forced.length ? forced.shift() : weightedPick(rng, level.chunks);
    if (name === last && rng() < 0.6) name = weightedPick(rng, level.chunks);
    if (level.chunks.heartGift && !heartPlaced && !forced.length && d >= level.length * HEART_GUARANTEE_AT) name = 'heartGift';
    if (name === 'heartGift') heartPlaced = true;
    const chunk = CHUNKS[name](rng, level);
    for (const it of chunk.items) items.push({ ...it, d: d + it.d });
    d += chunk.length + level.gap[0] + rng() * (level.gap[1] - level.gap[0]);
    last = name;
  }
  items.sort((a, b) => a.d - b.d);
  return items;
}

// ---------- flight mode ----------
// The same levels, but the course hangs in the air: only collectibles (the
// usual ones plus candy), laid out in arcs, waves and clusters at heights the
// flying unicorn reaches with W/S. Nothing to crash into.
const FLY_Y = { low: 1.0, mid: 2.4, high: 4.0, top: 5.0 };
const flyHeight = (rng) => FLY_Y.low + rng() * (FLY_Y.top - FLY_Y.low);

export const FLIGHT_CHUNKS = {
  // a rainbow-shaped arc of stars rising and falling in one lane
  starArc(rng) {
    const lane = pickLane(rng);
    const n = 7;
    const base = FLY_Y.low + rng() * 1.2;
    const items = Array.from({ length: n }, (_, i) => ({ d: i * 1.9, lane, type: 'star', y: round1(base + Math.sin((i / (n - 1)) * Math.PI) * 3.2) }));
    return { length: n * 1.9, items };
  },
  // a wave of stars sweeping across all three lanes
  starWave(rng) {
    const dir = rng() < 0.5 ? -1 : 1;
    const items = [];
    for (let i = 0; i < 9; i++) {
      const lane = Math.max(-1, Math.min(1, dir * (Math.floor(i / 3) - 1)));
      items.push({ d: i * 1.7, lane, type: 'star', y: round1(FLY_Y.mid + Math.sin(i * 0.9) * 1.6) });
    }
    return { length: 9 * 1.7, items };
  },
  // a zigzag trail of candy pieces climbing through the sky
  candyTrail(rng) {
    const start = pickLane(rng);
    const items = [];
    let lane = start;
    for (let i = 0; i < 6; i++) {
      items.push({ d: i * 2.1, lane, type: 'candy', y: round1(FLY_Y.low + 0.5 + i * 0.6 + rng() * 0.4) });
      if (i % 2 === 1) lane = lane === start ? otherLanes(start)[Math.floor(rng() * 2)] : start;
    }
    return { length: 6 * 2.1, items };
  },
  // a handful of candy hanging in a ring around a crystal
  candyRing(rng) {
    const lane = pickLane(rng);
    const y = FLY_Y.mid + rng() * 1.5;
    const items = [{ d: 3, lane, type: 'crystal', y: round1(y) }];
    [[0, -1.2], [1.5, 0], [3, 1.2], [4.5, 0], [6, -1.2]].forEach(([d, dy]) => items.push({ d, lane, type: 'candy', y: round1(y + dy) }));
    return { length: 7.5, items };
  },
  // crystals high up, one per lane
  crystalCloud(rng) {
    const items = [-1, 0, 1].map((lane, i) => ({ d: i * 2.4, lane, type: 'crystal', y: round1(FLY_Y.high + rng() * 1.2) }));
    return { length: 7.2, items };
  },
  bubbleCloud(rng, level) {
    const scale = level ? level.bubbleScale : 1;
    const n = 2 + Math.floor(rng() * 2);
    const spacing = 2.5 + 1.6 * scale;
    const items = [];
    for (let i = 0; i < n; i++) items.push({ d: i * spacing, lane: 0, type: 'bubble', x: (rng() - 0.5) * 8, y: round1(1.6 + 0.9 * scale + rng() * 1.6) });
    return { length: n * spacing, items };
  },
  // a heart with two candies leading in – the extra life adds finish points here
  heartGift(rng) {
    const lane = pickLane(rng);
    const y = flyHeight(rng);
    return { length: 6, items: [{ d: 0.5, lane, type: 'candy', y: round1(y) }, { d: 2, lane, type: 'candy', y: round1(y) }, { d: 4, lane, type: 'heart', y: round1(y) }] };
  },
};
const FLIGHT_WEIGHTS = { starArc: 4, starWave: 3, candyTrail: 4, candyRing: 2, crystalCloud: 2, bubbleCloud: 2, heartGift: 1 };

export function generateFlightCourse(level) {
  const rng = makeRng(level.seed + 7);
  const items = [];
  const intro = 30;
  const outro = 30;
  let d = intro;
  let last = null;
  let heartPlaced = false;
  while (d < level.length - outro) {
    let name = weightedPick(rng, FLIGHT_WEIGHTS);
    if (name === last && rng() < 0.6) name = weightedPick(rng, FLIGHT_WEIGHTS);
    if (!heartPlaced && d >= level.length * HEART_GUARANTEE_AT) name = 'heartGift';
    if (name === 'heartGift') heartPlaced = true;
    const chunk = FLIGHT_CHUNKS[name](rng, level);
    for (const it of chunk.items) items.push({ ...it, d: d + it.d });
    d += chunk.length + level.gap[0] * 0.6 + rng() * (level.gap[1] - level.gap[0]) * 0.6;
    last = name;
  }
  items.sort((a, b) => a.d - b.d);
  return items;
}

export const TIPS = {
  move: { text: 'Byt fil med A och D eller ← →', icon: '⬅️➡️' },
  fly: { text: 'Flyg upp med W eller ↑ och ner med S eller ↓', icon: '☁️' },
  laser: { text: 'Mätaren är full – tryck E för regnbågslaser!', icon: '🌈' },
  jump: { text: 'Hoppa med MELLANSLAG, W eller ↑', icon: '⬆️' },
  duck: { text: 'Ducka med S eller ↓', icon: '⬇️' },
  bubble: { text: 'Klicka på bubblorna med musen!', icon: '🖱️' },
  heart: { text: 'Fånga hjärtat – ett extra liv!', icon: '💖' },
  cloud: { text: 'Sura moln går inte att hoppa över – byt fil!', icon: '⛈️' },
};
