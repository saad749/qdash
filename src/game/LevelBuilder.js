// Turns a declarative level module (grid-coordinate object list) into physics
// groups, sensor zones and Tunnel instances for GameScene.

import { CELL, GROUND_Y, GAME_H, SPIKE_HIT, DEPTH, PORTAL_TINT, gx, gy } from '../constants.js';
import { Tunnel } from './Tunnel.js';
import { paletteFor } from '../palette.js';

export function buildLevel(scene, level, palette = paletteFor(level.id)) {
  // Obstacles take the colour of the mode section they stand in, so the world
  // changes palette at every portal.
  const portalsByX = level.objects.filter(o => o.t === 'portal').sort((a, b) => a.x - b.x);
  const modeAt = (x) => {
    let mode = 'cube';
    for (const p of portalsByX) if (p.x <= x) mode = p.mode;
    return mode;
  };

  const blocks = scene.physics.add.staticGroup();
  const hazards = scene.physics.add.staticGroup();
  const portals = [];
  const pads = [];
  const checkpoints = [];
  const tunnelSegs = [];
  const tspikes = [];
  let finishCellX = level.lengthCells;
  const worldW = level.lengthCells * CELL;

  // Ground: one static body spanning the level (always solid, no pits).
  const ground = scene.add.zone(worldW / 2, GROUND_Y + CELL / 2, worldW + CELL * 8, CELL);
  blocks.add(ground);

  for (const o of level.objects) {
    switch (o.t) {
      case 'block': {
        const w = (o.w || 1) * CELL, h = (o.h || 1) * CELL;
        const ts = scene.add.tileSprite(
          o.x * CELL + w / 2, GROUND_Y - o.y * CELL - h / 2, w, h, 'block'
        ).setDepth(DEPTH.BLOCK).setTint(palette.modes[modeAt(o.x)].block);
        blocks.add(ts);
        break;
      }
      case 'spike':
      case 'spikeDown': {
        const img = scene.add.image(gx(o.x), gy(o.y), 'spike')
          .setDepth(DEPTH.HAZARD).setTint(palette.modes[modeAt(o.x)].spike);
        if (o.t === 'spikeDown') img.setFlipY(true);
        hazards.add(img);
        img.body.setSize(SPIKE_HIT.W, SPIKE_HIT.H, true);
        break;
      }
      case 'portal': {
        const h = (o.h || 2) * CELL;
        const cy = GROUND_Y - (o.y || 0) * CELL - h / 2;
        const img = scene.add.image(gx(o.x), cy, 'portal')
          .setTint(PORTAL_TINT[o.mode]).setDepth(DEPTH.SENSOR);
        img.displayHeight = Math.max(116, h);
        scene.tweens.add({ targets: img, alpha: 0.6, duration: 500, yoyo: true, repeat: -1 });
        const zone = scene.add.zone(gx(o.x), cy, CELL * 0.9, h);
        scene.physics.add.existing(zone, true);
        portals.push({ zone, mode: o.mode, g: o.g || 1 });
        break;
      }
      case 'pad': {
        const surfaceY = GROUND_Y - (o.y || 0) * CELL;
        const img = scene.add.image(gx(o.x), surfaceY - 8, 'pad').setDepth(DEPTH.SENSOR);
        const zone = scene.add.zone(gx(o.x), surfaceY - 10, 56, 20);
        scene.physics.add.existing(zone, true);
        pads.push({ zone, img, lastFire: -Infinity });
        break;
      }
      case 'checkpoint': {
        const zone = scene.add.zone(gx(o.x), GAME_H / 2, CELL / 2, GAME_H * 2);
        scene.physics.add.existing(zone, true);
        const flag = scene.add.image(gx(o.x), GROUND_Y - CELL / 2, 'flag')
          .setTint(0x777788).setDepth(DEPTH.SENSOR);
        checkpoints.push({ x: o.x, zone, flag, index: 0 });
        break;
      }
      case 'tunnel':
        tunnelSegs.push(o);
        break;
      case 'tspike':
        tspikes.push(o);
        break;
      case 'finish':
        finishCellX = o.x;
        break;
      default:
        console.warn('Unknown level object', o);
    }
  }

  // Finish pole + sensor.
  const pole = scene.add.tileSprite(finishCellX * CELL, GROUND_Y / 2, 24, GROUND_Y, 'finish')
    .setDepth(DEPTH.SENSOR);
  const finishZone = scene.add.zone(finishCellX * CELL, GAME_H / 2, CELL, GAME_H * 2);
  scene.physics.add.existing(finishZone, true);

  // Group contiguous tunnel segments into corridors and hand each its spikes.
  tunnelSegs.sort((a, b) => a.x - b.x);
  const tunnels = [];
  let run = [];
  for (const seg of tunnelSegs) {
    if (run.length && seg.x !== run[run.length - 1].x + run[run.length - 1].len) {
      tunnels.push(run);
      run = [];
    }
    run.push(seg);
  }
  if (run.length) tunnels.push(run);
  const tunnelObjs = tunnels.map(segs => {
    const x0 = segs[0].x, x1 = segs[segs.length - 1].x + segs[segs.length - 1].len;
    const own = tspikes.filter(t => t.x >= x0 && t.x < x1);
    return new Tunnel(scene, segs, own, palette.neon);
  });

  // Checkpoints get indices in level order; count is validated (5 predefined).
  checkpoints.sort((a, b) => a.x - b.x);
  checkpoints.forEach((c, i) => { c.index = i; });
  if (checkpoints.length !== 5) {
    console.warn(`Level ${level.id}: expected 5 checkpoints, found ${checkpoints.length}`);
  }

  return {
    blocks, hazards, portals, pads, checkpoints,
    tunnels: tunnelObjs,
    finishX: finishCellX * CELL,
    finishZone, pole, worldW, palette,
  };
}
