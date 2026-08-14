// Every texture in the game is generated here from Graphics — no asset files.
// Player shapes are drawn in white/greys so runtime tint() gives the 7 colors.

import { CELL, CUBE, SHIP, TRI } from '../constants.js';

export function generateAll(scene) {
  const g = scene.add.graphics();

  // --- cube (white face, darker inset + eyes so tint keeps the "face") ---
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(0, 0, CUBE.SIZE, CUBE.SIZE, 8);
  g.fillStyle(0x555566, 1);
  g.fillRoundedRect(4, 4, CUBE.SIZE - 8, CUBE.SIZE - 8, 6);
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(8, 8, CUBE.SIZE - 16, CUBE.SIZE - 16, 4);
  g.fillStyle(0x222233, 1);
  g.fillRect(15, 16, 10, 14);           // eyes
  g.fillRect(35, 16, 10, 14);
  g.fillRect(15, 40, 30, 6);            // mouth
  g.generateTexture('cube', CUBE.SIZE, CUBE.SIZE);

  // --- ship ---
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(0, 30, 24, 8, 24, 30);                  // nose fin
  g.fillRoundedRect(14, 14, SHIP.W - 18, 20, 8);         // hull
  g.fillTriangle(SHIP.W - 20, 14, SHIP.W, 2, SHIP.W - 4, 22);  // tail fin
  g.fillStyle(0x333344, 1);
  g.fillCircle(40, 22, 8);                               // cockpit
  g.fillStyle(0xffffff, 1);
  g.fillCircle(40, 22, 4);
  g.fillStyle(0xbbbbcc, 1);
  g.fillRect(14, SHIP.H - 12, SHIP.W - 30, 6);           // underside rail
  g.generateTexture('ship', SHIP.W, SHIP.H);

  // --- triangle (points right) ---
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(0, 0, TRI.SIZE, TRI.SIZE / 2, 0, TRI.SIZE);
  g.fillStyle(0x555566, 1);
  g.fillTriangle(8, 12, TRI.SIZE - 12, TRI.SIZE / 2, 8, TRI.SIZE - 12);
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(14, 20, TRI.SIZE - 24, TRI.SIZE / 2, 14, TRI.SIZE - 20);
  g.generateTexture('tri', TRI.SIZE, TRI.SIZE);

  // --- block (greyscale so the level palette tints it; tiles cleanly) ---
  // Mid-grey body + white border: tint multiplies, so the border lands at the
  // full accent while the body stays a darker version of the same colour.
  // The body stays dark so a tinted block reads as solid terrain; the white
  // border takes the accent at full strength and does the shape-defining.
  g.clear();
  g.fillStyle(0x53536a, 1);
  g.fillRect(0, 0, CELL, CELL);
  g.fillStyle(0x3d3d50, 1);
  g.fillRect(0, CELL - 10, CELL, 10);          // shaded bottom edge, adds depth
  g.lineStyle(3, 0xffffff, 1);
  g.strokeRect(1.5, 1.5, CELL - 3, CELL - 3);
  g.lineStyle(1, 0xc0c0d8, 0.5);
  g.strokeRect(8, 8, CELL - 16, CELL - 16);
  g.generateTexture('block', CELL, CELL);

  // --- spike (up; down-spikes use setFlipY) ---
  // Near-white body keeps hazards the brightest thing on screen in any palette.
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(2, CELL, CELL / 2, 4, CELL - 2, CELL);
  g.fillStyle(0x5a5a70, 1);
  g.fillTriangle(14, CELL, CELL / 2, 22, CELL - 14, CELL);
  g.generateTexture('spike', CELL, CELL);

  // --- shard (death debris: a chunk of cube with a shaded corner) ---
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 14, 14);
  g.fillStyle(0x000000, 0.28);
  g.fillTriangle(0, 14, 14, 14, 14, 0);
  g.generateTexture('shard', 14, 14);

  // --- shockwave ring (expands out of a death) ---
  g.clear();
  g.lineStyle(6, 0xffffff, 1);
  g.strokeCircle(48, 48, 42);
  g.generateTexture('ring', 96, 96);

  // --- portal ring (white, tinted per mode) ---
  g.clear();
  g.fillStyle(0xffffff, 0.28);
  g.fillRoundedRect(0, 0, 44, 116, 22);
  g.lineStyle(5, 0xffffff, 1);
  g.strokeRoundedRect(2.5, 2.5, 39, 111, 19);
  g.lineStyle(2, 0xffffff, 0.7);
  g.strokeRoundedRect(10, 10, 24, 96, 12);
  g.generateTexture('portal', 44, 116);

  // --- checkpoint flag (white, tinted grey → green when hit) ---
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(4, 0, 5, CELL);
  g.fillTriangle(9, 2, 34, 10, 9, 20);
  g.generateTexture('flag', 36, CELL);

  // --- finish pole (checkered) ---
  g.clear();
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 3; x++) {
      g.fillStyle((x + y) % 2 === 0 ? 0xffffff : 0x111122, 1);
      g.fillRect(x * 8, y * 8, 8, 8);
    }
  }
  g.generateTexture('finish', 24, 128);

  // --- launch pad (gold plate on a dark base, sits on a surface) ---
  g.clear();
  g.fillStyle(0x6b5a1e, 1);
  g.fillRect(6, 10, 44, 6);                 // base
  g.fillStyle(0xfed330, 1);
  g.fillRoundedRect(0, 0, 56, 10, 5);       // gold plate
  g.fillStyle(0xfff3b0, 1);
  g.fillRoundedRect(6, 2, 44, 4, 2);        // highlight
  g.generateTexture('pad', 56, 16);

  // --- particle ---
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 8, 8);
  g.generateTexture('particle', 8, 8);

  // --- ground tile (greyscale; tinted per level) ---
  g.clear();
  g.fillStyle(0xa0a0b8, 1);
  g.fillRect(0, 0, CELL, CELL);
  g.fillStyle(0xe0e0f0, 1);
  g.fillRect(0, 0, CELL, 4);
  g.lineStyle(1, 0xc8c8dc, 1);
  g.strokeRect(0.5, 0.5, CELL - 1, CELL - 1);
  g.generateTexture('ground', CELL, CELL);

  // --- background deco (outlined square for the parallax layers) ---
  g.clear();
  g.lineStyle(2, 0xffffff, 0.13);
  g.strokeRect(16, 16, 96, 96);
  g.lineStyle(1, 0xffffff, 0.07);
  g.strokeRect(40, 40, 48, 48);
  g.generateTexture('deco', 128, 128);

  g.destroy();
}
