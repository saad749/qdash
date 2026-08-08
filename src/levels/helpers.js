// Authoring helpers for level modules. All coordinates in grid cells:
// x from level start, y = rows above the ground (y=0 rests on it).

import { ROWS } from '../constants.js';

export const block = (x, y, w = 1, h = 1) => ({ t: 'block', x, y, w, h });
export const spike = (x, y = 0) => ({ t: 'spike', x, y });
export const spikes = (x, y = 0, n = 1) =>
  Array.from({ length: n }, (_, i) => spike(x + i, y));
export const spikeDown = (x, y) => ({ t: 'spikeDown', x, y });

// Mode-switch portal. y = row of its base; h = zone height in cells
// (use 4 for tunnel exits so the whole corridor is covered).
export const portal = (x, mode, y = 0, g = 1, h = 2) => ({ t: 'portal', x, y, mode, g, h });

export const checkpoint = (x) => ({ t: 'checkpoint', x });

// Triangle corridor segment: playable space between edge rows `floor` and `ceil`.
export const tunnel = (x, len, floor, ceil) => ({ t: 'tunnel', x, len, floor, ceil });
export const tspike = (x, side = 'floor') => ({ t: 'tspike', x, side });

export const finish = (x) => ({ t: 'finish', x });

// Gold launch pad sitting ON the surface at row y; driving over it springs the
// player to ~3 cells height (enough to reach a +2-cell platform).
export const pad = (x, y = 0) => ({ t: 'pad', x, y });

// Solid ship-corridor ceiling: blocks from row h up to the top of the playfield.
export const ceiling = (x, len, h) => block(x, h, len, ROWS - h);

// Ascending solid steps, each `stepW` wide and one cell taller than the last.
export const stairs = (x, stepW, steps) =>
  Array.from({ length: steps }, (_, i) => block(x + i * stepW, 0, stepW, i + 1));
