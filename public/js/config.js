// Shared gameplay constants. Everything tunable lives here – no magic numbers
// scattered through the modules.

export const LANE_WIDTH = 2.6;
export const LANES = [-1, 0, 1];
export const ROAD_WIDTH = 9;
export const ROAD_LENGTH = 320;         // visible road mesh length (scrolled by texture offset)
export const SPAWN_Z = -140;            // where new objects appear (negative z = ahead)
export const DESPAWN_Z = 14;            // behind the camera
export const UNICORN_Z = 0;

export const GRAVITY = 30;
export const JUMP_VELOCITY = 11.5;      // apex ≈ 2.2 units, airtime ≈ 0.77 s
export const LANE_CHANGE_SPEED = 12;    // units / s sideways
export const UNICORN_HEIGHT = 1.9;      // standing bounding height
export const UNICORN_DUCK_HEIGHT = 1.0;
export const UNICORN_HALF_DEPTH = 0.9;
export const INVULNERABLE_SECONDS = 1.5;
export const HEARTS_PER_LEVEL = 5;
export const MAX_HEARTS = 7;            // hearts caught on the course can add extra lives up to this
export const SPEED_RAMP_SECONDS = 1.6;  // ease-in at level start

export const POINTS = {
  star: 10,
  bubble: 25,
  crystal: 50,
  heart: 100,
  levelClear: 200,
  perHeart: 50,
};

// Heights (y of the object center / clearance) used by collision + rendering.
export const OBJECT = {
  star:    { y: 1.0, radius: 0.55 },
  airStar: { y: 2.9, radius: 0.55 },
  crystal: { y: 3.0, radius: 0.6 },
  bubble:  { radius: 0.95 },        // base radius; levels scale it via level.bubbleScale
  heart:   { y: 1.1, radius: 0.5 },
  rock:    { height: 1.0, halfDepth: 0.6 },
  fence:   { height: 1.35, halfDepth: 0.25 },
  arch:    { clearance: 1.45, halfDepth: 0.35 },
  cloud:   { height: 3.2, halfDepth: 0.8 },
};

// Storage namespace. Bumping the version gives every browser a fresh start
// (progress, local top list); the old keys are removed on boot.
export const STORAGE_KEYS = {
  progress: 'regnbagsgaloppen.v3.progress',   // pre-player-switch shape, migrated into `players` on boot
  players: 'regnbagsgaloppen.v3.players',
  scores: 'regnbagsgaloppen.v3.scores',
  settings: 'regnbagsgaloppen.v3.settings',
};
export const LEGACY_STORAGE_KEYS = [
  'regnbagsgaloppen.progress', 'regnbagsgaloppen.scores', 'regnbagsgaloppen.settings',
  'regnbagsgaloppen.v2.progress', 'regnbagsgaloppen.v2.players', 'regnbagsgaloppen.v2.scores', 'regnbagsgaloppen.v2.settings',
];

export const PALETTE = {
  rainbow: [0xff5d8f, 0xff9f43, 0xffe066, 0x7bed9f, 0x70c1ff, 0x9b7bff, 0xff8ad8],
  unicornBody: 0xfff7fb,
  unicornHoof: 0xd7b6ff,
  horn: 0xffd23f,
  cheek: 0xffb3c7,
};
