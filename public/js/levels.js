// Level definitions and the deterministic course generator.
// A level is data: theme colours, speed, length and a weighted set of
// "chunks" (hand-designed patterns). The generator lays chunks out along the
// course with a seeded RNG so every level plays the same each time.

export const LEVELS = [
  {
    id: 1,
    name: 'Regnbågsängen',
    subtitle: 'Samla stjärnor och hoppa över stenar!',
    seed: 11,
    speed: 9,
    length: 420,
    gap: [7, 12],
    theme: {
      skyTop: 0x7fc8ff, skyBottom: 0xfff1f7, fog: 0xffe6f2,
      ground: 0x9be27a, decor: 'meadow', sun: 0xfff2a8, sunY: 40,
      musicKey: 0, musicTempo: 118, musicWave: 'triangle',
    },
    chunks: { starLine: 5, starZigzag: 3, rockJump: 4, fenceJump: 1, crystalHop: 1 },
    tips: ['move', 'jump'],
  },
  {
    id: 2,
    name: 'Molnriket',
    subtitle: 'Klicka på bubblorna med musen!',
    seed: 22,
    speed: 10,
    length: 520,
    gap: [6, 11],
    theme: {
      skyTop: 0x62b3ff, skyBottom: 0xe8f6ff, fog: 0xe4f1ff,
      ground: 0xbfe0ff, decor: 'clouds', sun: 0xfff6c8, sunY: 45,
      musicKey: 2, musicTempo: 124, musicWave: 'triangle',
    },
    chunks: { starLine: 4, starZigzag: 3, rockJump: 3, fenceJump: 2, bubbleCluster: 5, crystalHop: 1, cloudWall: 1 },
    tips: ['bubble'],
  },
  {
    id: 3,
    name: 'Godislandet',
    subtitle: 'Ducka under regnbågsbågarna!',
    seed: 33,
    speed: 11.5,
    length: 620,
    gap: [6, 10],
    theme: {
      skyTop: 0xff9ecf, skyBottom: 0xfff4c2, fog: 0xffe9d6,
      ground: 0xffc2e2, decor: 'candy', sun: 0xfff7b0, sunY: 38,
      musicKey: 4, musicTempo: 130, musicWave: 'square',
    },
    chunks: { starLine: 3, starZigzag: 3, rockJump: 3, fenceJump: 2, archDuck: 5, bubbleCluster: 3, crystalHop: 2, cloudWall: 2 },
    tips: ['duck'],
  },
  {
    id: 4,
    name: 'Stjärnnatten',
    subtitle: 'Hoppa högt efter kristallerna!',
    seed: 44,
    speed: 13,
    length: 720,
    gap: [5, 9],
    theme: {
      skyTop: 0x1b1f5e, skyBottom: 0x6a4fb3, fog: 0x5a47a6,
      ground: 0x2f2a6b, decor: 'night', sun: 0xfff6d5, sunY: 42, moon: true,
      musicKey: -3, musicTempo: 126, musicWave: 'sine',
    },
    chunks: { starLine: 3, starZigzag: 3, rockJump: 3, fenceJump: 3, archDuck: 3, bubbleCluster: 3, crystalHop: 5, cloudWall: 2 },
    tips: [],
  },
  {
    id: 5,
    name: 'Spindelstaden',
    subtitle: 'Spindelvännerna hejar på dig – kör allt du kan!',
    seed: 55,
    speed: 14.5,
    length: 860,
    gap: [5, 8],
    theme: {
      skyTop: 0x3b7bff, skyBottom: 0xffd9a8, fog: 0xf2d9c4,
      ground: 0x8c94a8, decor: 'city', sun: 0xffe08a, sunY: 30, spiders: true,
      musicKey: 5, musicTempo: 138, musicWave: 'square',
    },
    chunks: { starLine: 3, starZigzag: 3, rockJump: 3, fenceJump: 3, archDuck: 4, bubbleCluster: 4, crystalHop: 4, cloudWall: 3 },
    tips: [],
  },
];

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
  bubbleCluster(rng) {
    const n = 2 + Math.floor(rng() * 2);
    const items = [];
    for (let i = 0; i < n; i++) {
      items.push({ d: i * 3, lane: 0, type: 'bubble', x: (rng() - 0.5) * 9, y: 2.4 + rng() * 2.4 });
    }
    return { length: n * 3, items };
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
export function generateCourse(level) {
  const rng = makeRng(level.seed);
  const items = [];
  const intro = 40;
  const outro = 30;
  let d = intro;
  let last = null;
  // Make sure the level's tutorial chunks come first.
  const forced = [];
  if (level.tips.includes('jump')) forced.push('starLine', 'rockJump');
  if (level.tips.includes('bubble')) forced.push('bubbleCluster');
  if (level.tips.includes('duck')) forced.push('archDuck');
  while (d < level.length - outro) {
    let name = forced.length ? forced.shift() : weightedPick(rng, level.chunks);
    if (name === last && rng() < 0.6) name = weightedPick(rng, level.chunks);
    const chunk = CHUNKS[name](rng);
    for (const it of chunk.items) items.push({ ...it, d: d + it.d });
    d += chunk.length + level.gap[0] + rng() * (level.gap[1] - level.gap[0]);
    last = name;
  }
  items.sort((a, b) => a.d - b.d);
  return items;
}

export const TIPS = {
  move: { text: 'Byt fil med A och D eller ← →', icon: '⬅️➡️' },
  jump: { text: 'Hoppa med MELLANSLAG, W eller ↑', icon: '⬆️' },
  duck: { text: 'Ducka med S eller ↓', icon: '⬇️' },
  bubble: { text: 'Klicka på bubblorna med musen!', icon: '🖱️' },
};
