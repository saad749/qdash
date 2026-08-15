// Central tuning table. Every feel-defining number lives here.

export const GAME_W = 1280;
export const GAME_H = 720;

export const CELL = 64;            // grid unit in px
export const GROUND_Y = 656;       // world y of the ground surface
export const ROWS = 10;            // playable rows above the ground (row 0 rests on it)

export const SCROLL_VX = 560;      // constant horizontal speed, px/s (8.75 cells/s)

export const CUBE = {
  GRAVITY: 5000,
  // Peak ~129 px (2.0 cells), airtime 0.45 s, length ~4.0 cells. Tuned so a
  // TRIPLE spike leaves 4.4 frames — the hardest obstacle allowed sits just above
  // the 4-frame floor. At the old -1050 a triple was 1.4 frames (unfair) and a
  // double 8.3 (too easy), with nothing in between: see tools/window.mjs.
  // tools/autoplay.js hardcodes this value too — change both together.
  JUMP_VY: -1136,
  MAX_VY: 1450,                    // above |PAD.VY| so pad launches aren't clamped; fall is still
                                   // <25 px per physics step, well under one block
  SPIN_DEG: 415,                   // air spin, snaps to 90° on landing
  BODY: 60,                        // outer hitbox (vs blocks)
  INNER: 32,                       // inner hitbox (vs hazards)
  SIZE: 60,                        // sprite px
};

export const TOP_Y = 16;           // world y of the playfield ceiling (top of row 9)

export const SHIP = {
  GRAVITY: 1700,
  THRUST: -3400,                   // applied while held → net -1700 upward
  MAX_VY: 640,
  W: 76, H: 44,                    // sprite px
  BODY_W: 56, BODY_H: 36,
  INNER: 26,
  // The ship must fly: touching the roof or any surface kills. Entering the mode
  // from a grounded cube would therefore be instant death, so the portal flings
  // you off the floor — you are airborne before the first surface check runs.
  LIFTOFF_VY: -420,
  // Respawning mid-corridor can put you anywhere between floor and roof, so no
  // single launch velocity is safe (upward kills a roof-adjacent respawn). The
  // player comes back at rest instead, with surfaces briefly harmless so there
  // is time to start flying.
  RESPAWN_GRACE_MS: 350,
};

export const TRI = {
  GRAVITY: 4500,                   // toward the current gravity side
  MAX_VY: 1000,
  SIZE: 56,                        // sprite px
  BODY: 46,
  INNER: 26,
  STEP_RIDE_PX: 88,                // step-face overlap that still rides up: 1 cell (64) plus one
                                   // frame of max fall (~17) — so 1-cell zigs ride like a slope,
                                   // 2-cell shifts (128 px) kill unless you ride the receding edge
};

export const SPIKE_HIT = { W: 22, H: 30 };  // kill box centered on a 64 px spike base

export const PAD = {
  VY: -1400,                       // launch: peak ~196 px (3 cells) → reaches +2-cell platforms
  COOLDOWN_MS: 350,                // one fire per pass-over
};

export const DEATH_RESPAWN_MS = 700;
export const CHECKPOINT_PCTS = [15, 33, 50, 67, 85];

export const MODES = { CUBE: 'cube', SHIP: 'ship', TRI: 'triangle' };

export const COLORS = {
  purple: 0xa55eea,
  green:  0x26de81,
  blue:   0x45aaf2,
  red:    0xfc5c65,
  pink:   0xfd79a8,
  orange: 0xfd9644,
  yellow: 0xfed330,
};
export const COLOR_NAMES = ['purple', 'green', 'blue', 'red', 'pink', 'orange', 'yellow'];
export const DEFAULT_COLOR = 'green';

export const PORTAL_TINT = { cube: 0x7bed6f, ship: 0xd980fa, triangle: 0x34e7e4 };

export const DEPTH = {
  BG: 0, DECO: 1, TUNNEL: 2, GROUND: 4, BLOCK: 5, HAZARD: 6,
  SENSOR: 7, PLAYER: 10, FX: 12,
};

// Grid → world helpers (cell centers). x in cells from level start, y in rows above ground.
export const gx = (x) => x * CELL + CELL / 2;
export const gy = (y) => GROUND_Y - y * CELL - CELL / 2;
