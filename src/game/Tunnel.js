// Triangle-mode corridor. Edges are arbitrary horizontal lines that don't map to
// AABB static bodies, so collision here is manual: each frame the corridor decides
// slide / snap-up / death. The Arcade body still integrates gravity and velocity.

import { CELL, GROUND_Y, GAME_H, TRI, SPIKE_HIT, DEPTH } from '../constants.js';

const NEON = 0x34e7e4;

export class Tunnel {
  // segs: contiguous [{x, len, floor, ceil}] in grid cells; tspikes: [{x, side}]
  constructor(scene, segs, tspikes) {
    this.segs = segs.map(s => ({
      x0: s.x * CELL,
      x1: (s.x + s.len) * CELL,
      floorY: GROUND_Y - s.floor * CELL,
      ceilY: GROUND_Y - s.ceil * CELL,
    }));
    this.x0 = this.segs[0].x0;
    this.x1 = this.segs[this.segs.length - 1].x1;

    this.spikeRects = tspikes.map(t => {
      const cx = t.x * CELL + CELL / 2;
      const seg = this.segmentAt(cx);
      const y = t.side === 'ceil' ? seg.ceilY : seg.floorY - SPIKE_HIT.H;
      return {
        rect: new Phaser.Geom.Rectangle(cx - SPIKE_HIT.W / 2, y, SPIKE_HIT.W, SPIKE_HIT.H),
        side: t.side, cx, seg,
      };
    });

    this.draw(scene);
  }

  contains(worldX) {
    return worldX >= this.x0 && worldX < this.x1;
  }

  segmentAt(worldX) {
    for (const s of this.segs) {
      if (worldX >= s.x0 && worldX < s.x1) return s;
    }
    return null;
  }

  // Returns 'ok' or 'die'; snaps the player onto edges as a side effect.
  collide(player) {
    const b = player.sprite.body;
    const seg = this.segmentAt(b.center.x);
    if (!seg) return 'die';                       // corridor gap

    if (b.bottom > seg.floorY) {
      const pen = b.bottom - seg.floorY;
      if (pen > TRI.STEP_RIDE_PX) return 'die';   // slammed into a 2-cell step face
      player.sprite.y -= pen;
      if (b.velocity.y > 0) b.setVelocityY(0);
    }
    if (b.top < seg.ceilY) {
      const pen = seg.ceilY - b.top;
      if (pen > TRI.STEP_RIDE_PX) return 'die';
      player.sprite.y += pen;
      if (b.velocity.y < 0) b.setVelocityY(0);
    }

    const inner = player.innerRect();
    for (const s of this.spikeRects) {
      if (Phaser.Geom.Rectangle.Overlaps(s.rect, inner)) return 'die';
    }
    return 'ok';
  }

  draw(scene) {
    const g = scene.add.graphics();
    g.setDepth(DEPTH.TUNNEL);

    // Solid dark fill everywhere outside the corridor.
    g.fillStyle(0x101026, 0.96);
    for (const s of this.segs) {
      g.fillRect(s.x0, 0, s.x1 - s.x0, s.ceilY);
      g.fillRect(s.x0, s.floorY, s.x1 - s.x0, GAME_H - s.floorY);
    }

    // Neon corridor edges, with vertical connectors at every zig.
    g.lineStyle(4, NEON, 1);
    let prev = null;
    for (const s of this.segs) {
      g.lineBetween(s.x0, s.floorY, s.x1, s.floorY);
      g.lineBetween(s.x0, s.ceilY, s.x1, s.ceilY);
      if (prev) {
        if (prev.floorY !== s.floorY) g.lineBetween(s.x0, prev.floorY, s.x0, s.floorY);
        if (prev.ceilY !== s.ceilY) g.lineBetween(s.x0, prev.ceilY, s.x0, s.ceilY);
      }
      prev = s;
    }

    // Spikes pointing into the corridor.
    g.fillStyle(NEON, 1);
    for (const s of this.spikeRects) {
      const half = CELL * 0.35;
      if (s.side === 'ceil') {
        g.fillTriangle(s.cx - half, s.seg.ceilY, s.cx + half, s.seg.ceilY, s.cx, s.seg.ceilY + SPIKE_HIT.H + 4);
      } else {
        g.fillTriangle(s.cx - half, s.seg.floorY, s.cx + half, s.seg.floorY, s.cx, s.seg.floorY - SPIKE_HIT.H - 4);
      }
    }
  }
}
