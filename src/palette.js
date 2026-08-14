// Per-level colour. One accent per mode section; block/spike/ground are derived
// from it so a section stays internally coherent and the world visibly changes
// colour at every portal.
//
// The block/spike/ground textures are drawn in greyscale precisely so tinting
// them here produces the colour — tint multiplies, so a white edge becomes the
// accent at full strength while a mid-grey body lands darker.

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

// Per-channel lerp toward a target colour. t=0 keeps c, t=1 becomes target.
function mix(c, target, t) {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  const tr = (target >> 16) & 0xff, tg = (target >> 8) & 0xff, tb = target & 0xff;
  return (clamp255(r + (tr - r) * t) << 16)
    | (clamp255(g + (tg - g) * t) << 8)
    | clamp255(b + (tb - b) * t);
}

export { mix };
export const darken = (c, t) => mix(c, 0x000000, t);
export const lighten = (c, t) => mix(c, 0xffffff, t);

// Accent per level per mode. Each level stays in its background's colour family
// while the three modes pull far enough apart to read as different places.
const ACCENTS = {
  // --- season 1 ---
  1:  { cube: 0x4a86ff, ship: 0x9b6bff, triangle: 0x2fe0d0 },
  2:  { cube: 0x36c6f0, ship: 0x5f8bff, triangle: 0x46f0a8 },
  3:  { cube: 0x9a6cff, ship: 0xd062ff, triangle: 0x5ce1ff },
  4:  { cube: 0xff9f2e, ship: 0xffd24a, triangle: 0xff6f4a },
  5:  { cube: 0xff4f6b, ship: 0xff7ab8, triangle: 0xffc24a },
  // --- season 2: ember → violet → night → gold → blood ---
  6:  { cube: 0xd9863a, ship: 0xf0b45a, triangle: 0xc25a2a },
  7:  { cube: 0x8a5cf0, ship: 0xb44ce0, triangle: 0x5ad0f0 },
  8:  { cube: 0x4a7ac0, ship: 0x6ab4e6, triangle: 0x8fa8d8 },
  9:  { cube: 0xf0b429, ship: 0xffd76a, triangle: 0xf07f3a },
  10: { cube: 0xe03a4a, ship: 0xff6a5a, triangle: 0xd04af0 },
  // the physics sandbox borrows level 1's look
  test: { cube: 0x4a86ff, ship: 0x9b6bff, triangle: 0x2fe0d0 },
};

export const MODE_KEYS = ['cube', 'ship', 'triangle'];

export function paletteFor(levelId) {
  const accents = ACCENTS[levelId] || ACCENTS[1];
  const modes = {};
  for (const mode of MODE_KEYS) {
    const accent = accents[mode];
    modes[mode] = {
      accent,
      // The block texture is dark-bodied with a white border, so the accent goes
      // on undimmed: the body lands dark, the border lands vivid.
      block: accent,
      spike: lighten(accent, 0.25),     // white-bodied texture → the brightest thing on screen
      backdrop: darken(accent, 0.66),   // section wash behind everything
    };
  }
  return {
    modes,
    ground: darken(accents.cube, 0.55),
    deco: lighten(accents.cube, 0.15),
    neon: accents.triangle,
  };
}
