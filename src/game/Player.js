// The player controller: one physics sprite, three movement modes.
// GameScene calls update() every frame after the physics step and owns death/respawn;
// this class owns input response, per-mode physics and the snapshot format.

import { SCROLL_VX, CUBE, SHIP, TRI, MODES, DEPTH } from '../constants.js';
import { sfx } from '../audio/sfx.js';

export class PlayerController {
  constructor(scene, x, y, tint) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'cube');
    this.sprite.setTint(tint);
    this.sprite.setDepth(DEPTH.PLAYER);
    this.sprite.body.allowRotation = false;    // rotation is purely visual
    this.mode = null;
    this.gravityDir = 1;
    this.setMode(MODES.CUBE);
  }

  setMode(mode, gravityDir = 1) {
    if (this.mode === mode && (mode !== MODES.TRI || gravityDir === this.gravityDir)) return;
    // Preserve the body's bottom edge across the resize. Switching to a taller
    // body while resting on a surface (ship hugging the floor into a cube
    // portal) would otherwise embed the new body in the ground — deeper than
    // Arcade's per-frame separation cap, so it clips straight through.
    const oldBottom = this.mode ? this.sprite.body.bottom : null;
    this.mode = mode;
    this.gravityDir = gravityDir;
    const s = this.sprite;
    const b = s.body;
    s.setAngle(0);
    s.setFlipY(false);
    if (mode === MODES.CUBE) {
      s.setTexture('cube');
      b.setSize(CUBE.BODY, CUBE.BODY);
      b.setGravityY(CUBE.GRAVITY);
      b.setMaxVelocity(2000, CUBE.MAX_VY);
    } else if (mode === MODES.SHIP) {
      s.setTexture('ship');
      b.setSize(SHIP.BODY_W, SHIP.BODY_H);
      b.setGravityY(SHIP.GRAVITY);
      b.setMaxVelocity(2000, SHIP.MAX_VY);
      b.setVelocityY(SHIP.LIFTOFF_VY);      // off the floor before surfaces turn lethal
    } else {
      s.setTexture('tri');
      b.setSize(TRI.BODY, TRI.BODY);
      b.setGravityY(TRI.GRAVITY * gravityDir);
      b.setMaxVelocity(2000, TRI.MAX_VY);
      s.setFlipY(gravityDir < 0);
    }
    b.setAccelerationY(0);
    if (oldBottom !== null) {
      const newH = mode === MODES.CUBE ? CUBE.BODY
        : mode === MODES.SHIP ? SHIP.BODY_H : TRI.BODY;
      s.y = oldBottom - newH / 2;      // body re-centers on the sprite next step
    }
  }

  update(held, justPressed, dtSec) {
    const s = this.sprite;
    const b = s.body;
    b.setVelocityX(SCROLL_VX);

    if (this.mode === MODES.CUBE) {
      const grounded = b.blocked.down || b.touching.down;
      if (grounded && held) {
        b.setVelocityY(CUBE.JUMP_VY);
        sfx.jump();
      }
      if (grounded && b.velocity.y >= 0) {
        s.angle = Phaser.Math.Snap.To(s.angle, 90);   // settle after a spin
      } else {
        s.angle += CUBE.SPIN_DEG * dtSec;
      }
    } else if (this.mode === MODES.SHIP) {
      // No ceiling clamp: GameScene kills on roof or surface contact, so the
      // ship has to be flown rather than parked against an edge.
      b.setAccelerationY(held ? SHIP.THRUST : 0);
      s.rotation = Phaser.Math.Clamp(b.velocity.y / SHIP.MAX_VY, -1, 1) * 0.45;
    } else if (this.mode === MODES.TRI) {
      if (justPressed) this.flip();
      s.setFlipY(this.gravityDir < 0);
    }
  }

  flip() {
    this.gravityDir *= -1;
    this.sprite.body.setGravityY(TRI.GRAVITY * this.gravityDir);
    this.sprite.body.setVelocityY(0);
    sfx.flip();
    this.scene.tweens.add({
      targets: this.sprite, scaleX: 0.85, scaleY: 1.15,
      duration: 60, yoyo: true,
    });
  }

  // Rect used against hazards — smaller than the block hitbox, like GD.
  innerRect() {
    const inner = this.mode === MODES.CUBE ? CUBE.INNER
      : this.mode === MODES.SHIP ? SHIP.INNER : TRI.INNER;
    const c = this.sprite.body.center;
    return new Phaser.Geom.Rectangle(c.x - inner / 2, c.y - inner / 2, inner, inner);
  }

  snapshot() {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
      mode: this.mode,
      gravityDir: this.gravityDir,
    };
  }

  applySnapshot(snap) {
    this.setMode(snap.mode, snap.gravityDir);
    this.sprite.setPosition(snap.x, snap.y);
    this.sprite.body.reset(snap.x, snap.y);          // clears velocity + syncs body
    this.sprite.body.setGravityY(
      this.mode === MODES.CUBE ? CUBE.GRAVITY :
      this.mode === MODES.SHIP ? SHIP.GRAVITY : TRI.GRAVITY * this.gravityDir
    );
    // Ship respawns come back at rest: GameScene grants SHIP.RESPAWN_GRACE_MS of
    // harmless surfaces instead. A launch would be right for a floor-adjacent
    // checkpoint and fatal for a roof-adjacent one.
    this.sprite.setAngle(0);
    this.sprite.setVisible(true);
    this.sprite.body.enable = true;
  }
}
