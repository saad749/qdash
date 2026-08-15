// Measures the timing window a player actually has for a hazard: from how many
// positions can you jump and live, in pixels, milliseconds and frames.
//
//   node tools/window.mjs 3 548     # one hazard
//   node tools/window.mjs --audit   # every hazard in every level, tightest first
//
// Simulates the way the game integrates — semi-implicit Euler at a fixed 60 fps,
// inner hitbox against the spike kill boxes — so the frame count is the real
// number of frames a player has to press, not a continuous-time approximation.
// Pure arithmetic over level data; no browser needed.
//
// Adjacent spikes are measured as one obstacle, which is what makes a triple
// hard: clearing three takes ~325 ms of travel against ~351 ms of safe airtime.

import { pathToFileURL } from 'node:url';
import { CELL, GROUND_Y, ROWS, SCROLL_VX, CUBE, SPIKE_HIT } from '../src/constants.js';
import { LEVELS, LEVEL_IDS } from '../src/levels/index.js';

const FPS = 60;
const DT = 1 / FPS;
const PX_PER_FRAME = SCROLL_VX * DT;
const HALF_BODY = CUBE.BODY / 2;
const HALF_INNER = CUBE.INNER / 2;

// The minimum window any hazard may leave. Below this the obstacle stops being
// a timing test and becomes a memorisation test — set with the user, 2026-08-14.
export const MIN_FRAMES = 4;

const modeAtOf = (level) => {
  const portals = level.objects.filter(o => o.t === 'portal').sort((a, b) => a.x - b.x);
  return (x) => {
    let m = 'cube';
    for (const p of portals) if (p.x <= x) m = p.mode;
    return m;
  };
};

// Every upward-spike cluster in a cube section that the player actually has to
// jump: [{ cell, row, size }]. Clusters with a platform overhanging them are
// crossed from above (the elevated-chain pattern), so no jump window applies and
// measuring one would report a meaningless zero.
export function hazardClusters(level) {
  const modeAt = modeAtOf(level);
  // Platforms only: a ceiling also sits above row 1, but you duck under it, you
  // do not walk along it, so it must not exempt the hazards below it.
  const platforms = level.objects.filter(o =>
    o.t === 'block' && o.y >= 1 && o.y + (o.h || 1) < ROWS);
  const traversedAbove = (startCell, size, row) => row === 0 && platforms.some(b =>
    b.x <= startCell + size - 1 && startCell <= b.x + (b.w || 1) - 1);
  const spikes = level.objects.filter(o => o.t === 'spike' && modeAt(o.x) === 'cube');
  const byRow = new Map();
  for (const s of spikes) {
    const row = s.y || 0;
    if (!byRow.has(row)) byRow.set(row, new Set());
    byRow.get(row).add(s.x);
  }
  const out = [];
  for (const [row, cells] of byRow) {
    for (const cell of [...cells].sort((a, b) => a - b)) {
      if (cells.has(cell - 1)) continue;               // not the start of a run
      let size = 1;
      while (cells.has(cell + size)) size++;
      if (!traversedAbove(cell, size, row)) out.push({ cell, row, size });
    }
  }
  return out.sort((a, b) => a.cell - b.cell);
}

export function measure(level, cellX) {
  const hazard = level.objects.find(o => o.t === 'spike' && o.x === cellX);
  if (!hazard) return null;
  const row = hazard.y || 0;

  const atRow = new Set(level.objects.filter(o => o.t === 'spike' && (o.y || 0) === row).map(o => o.x));
  let lastCell = cellX;
  while (atRow.has(lastCell + 1)) lastCell++;

  const boxes = [];
  for (let c = cellX; c <= lastCell; c++) {
    const px = c * CELL + CELL / 2;
    const py = GROUND_Y - row * CELL - CELL / 2;
    boxes.push({
      x0: px - SPIKE_HIT.W / 2, x1: px + SPIKE_HIT.W / 2,
      y0: py - SPIKE_HIT.H / 2, y1: py + SPIKE_HIT.H / 2,
    });
  }
  const clusterX0 = boxes[0].x0, clusterX1 = boxes[boxes.length - 1].x1;

  const surfaceY = GROUND_Y - row * CELL;
  let supportX0 = -Infinity, supportX1 = Infinity;
  if (row > 0) {
    const support = level.objects.filter(o =>
      o.t === 'block' && o.y + (o.h || 1) === row && o.x <= cellX && o.x + (o.w || 1) > cellX);
    if (!support.length) return null;                  // floating spike: nothing to run along
    supportX0 = Math.min(...support.map(b => b.x)) * CELL;
    supportX1 = Math.max(...support.map(b => b.x + (b.w || 1))) * CELL;
  }

  const firstGrounded = row > 0 ? supportX0 - HALF_BODY + 1 : cellX * CELL - 400;
  const lastGrounded = row > 0 ? supportX1 + HALF_BODY - 1 : cellX * CELL;

  const survives = (startX) => {
    let x = startX;
    let cy = surfaceY - HALF_BODY;
    let vy = CUBE.JUMP_VY;
    for (let f = 0; f < 120; f++) {
      vy += CUBE.GRAVITY * DT;
      cy += vy * DT;
      x += PX_PER_FRAME;
      const hit = boxes.some(b =>
        x + HALF_INNER > b.x0 && x - HALF_INNER < b.x1
        && cy + HALF_INNER > b.y0 && cy - HALF_INNER < b.y1);
      if (hit) return false;
      if (x - HALF_INNER > clusterX1) return true;
      if (vy > 0 && cy + HALF_BODY >= surfaceY && x < supportX1) return false;   // landed short
    }
    return false;
  };

  const latest = Math.min(Math.ceil(lastGrounded), Math.floor(clusterX0 - HALF_INNER));
  const good = [];
  for (let x = Math.floor(firstGrounded); x <= latest; x++) if (survives(x)) good.push(x);
  if (!good.length) return { cell: cellX, row, size: lastCell - cellX + 1, px: 0, ms: 0, frames: 0 };

  const px = good[good.length - 1] - good[0];
  return {
    cell: cellX, row, size: lastCell - cellX + 1,
    from: good[0], to: good[good.length - 1],
    px, ms: (px / SCROLL_VX) * 1000, frames: px / PX_PER_FRAME,
    supportX0, supportX1,
  };
}

// --- CLI ---
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args[0] === '--audit') {
    let worst = [];
    for (const id of LEVEL_IDS) {
      const level = LEVELS[id];
      const rows = hazardClusters(level)
        .map(c => ({ id, ...measure(level, c.cell) }))
        .filter(Boolean);
      const tight = rows.filter(r => r.frames < MIN_FRAMES);
      const min = rows.reduce((m, r) => Math.min(m, r.frames), Infinity);
      console.log(`level ${String(id).padStart(2)} — ${rows.length} cube hazards, ` +
        `tightest ${min.toFixed(1)} frames, ${tight.length} under ${MIN_FRAMES}`);
      worst = worst.concat(tight);
    }
    console.log(`\n${worst.length} hazards under the ${MIN_FRAMES}-frame floor:`);
    for (const w of worst.sort((a, b) => a.frames - b.frames)) {
      console.log(`  level ${String(w.id).padStart(2)} cell ${String(w.cell).padStart(4)} ` +
        `row ${w.row} — ${w.size} spikes — ${w.frames.toFixed(1)} frames (${w.ms.toFixed(0)} ms)`);
    }
    process.exit(worst.length ? 1 : 0);
  }

  const level = LEVELS[args[0]] || LEVELS[Number(args[0])];
  const cellX = Number(args[1]);
  if (!level || !Number.isFinite(cellX)) {
    console.error('usage: node tools/window.mjs <levelId> <cellX>   |   --audit');
    process.exit(2);
  }
  const r = measure(level, cellX);
  if (!r) { console.error(`no spike at cell ${cellX} (or it has no run-up surface)`); process.exit(2); }
  console.log(`level ${args[0]} — ${r.size} spike(s) at cell ${cellX}, row ${r.row}`);
  if (!r.px) console.log('  NO jump position clears it — unfair as placed.');
  else console.log(`  window: ${r.px} px  =  ${r.ms.toFixed(0)} ms  =  ${r.frames.toFixed(1)} frames @ ${FPS} fps`);
}
