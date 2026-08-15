// Core gameplay scene. Owns the run state machine (alive → dead → respawn,
// finish), wires physics callbacks, and drives HUD + camera.

import {
  GAME_W, GAME_H, CELL, GROUND_Y, MODES, DEPTH, COLORS, DEFAULT_COLOR,
  DEATH_RESPAWN_MS, PAD, SHIP, TOP_Y, gx,
} from '../constants.js';
import { buildLevel } from '../game/LevelBuilder.js';
import { paletteFor, lighten, darken, mix } from '../palette.js';
import { PlayerController } from '../game/Player.js';
import { LEVELS } from '../levels/index.js';
import { storage } from '../storage.js';
import { music } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';
import { SONGS } from '../audio/songs.js';
import { unlock, toggleMute, suspend } from '../audio/engine.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelId = data.levelId || 1;
    this.startCp = data.startCp || null;      // dev: 1-based checkpoint to spawn at
  }

  create() {
    const level = LEVELS[this.levelId];
    this.levelData = level;
    const profile = storage.current();
    this.playerId = profile ? profile.id : null;
    this.playerTint = COLORS[(profile && profile.color) || DEFAULT_COLOR];

    this.dead = false;
    this.finished = false;
    this.attempt = 1;
    this.cpIndex = -1;
    this.bestPct = 0;
    this.lastPct = -1;
    this.currentTunnel = null;
    this.shipGraceUntil = 0;      // set on respawn; see SHIP.RESPAWN_GRACE_MS
    this.palette = paletteFor(this.levelId);

    this.buildBackdrop(level);
    this.built = buildLevel(this, level, this.palette);

    const spawnY = GROUND_Y - 30;
    this.player = new PlayerController(this, gx(2), spawnY, this.playerTint);
    this.snapshot = this.player.snapshot();
    this.applyModeVisuals(this.player.mode);

    this.cameras.main.setBounds(0, 0, this.built.worldW, GAME_H);

    // --- physics wiring ---
    this.physics.add.collider(this.player.sprite, this.built.blocks);
    this.physics.add.overlap(
      this.player.sprite, this.built.hazards,
      () => this.die(),
      (pl, hz) => {
        if (this.dead || this.finished) return false;
        const r = new Phaser.Geom.Rectangle(hz.body.x, hz.body.y, hz.body.width, hz.body.height);
        return Phaser.Geom.Rectangle.Overlaps(r, this.player.innerRect());
      }
    );
    for (const p of this.built.portals) {
      this.physics.add.overlap(this.player.sprite, p.zone, () => this.onPortal(p));
    }
    for (const p of this.built.pads) {
      this.physics.add.overlap(this.player.sprite, p.zone, () => this.onPad(p));
    }
    for (const c of this.built.checkpoints) {
      this.physics.add.overlap(this.player.sprite, c.zone, () => this.onCheckpoint(c));
    }
    this.physics.add.overlap(this.player.sprite, this.built.finishZone, () => this.complete());

    // --- input ---
    this.keys = [
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    ];
    this.ptrDown = false;
    this.ptrJust = false;
    this.input.on('pointerdown', () => {
      unlock();
      music.ensure(this.songSpec);
      this.ptrDown = true;
      this.ptrJust = true;
    });
    this.input.on('pointerup', () => { this.ptrDown = false; });
    this.input.keyboard.on('keydown', () => { unlock(); music.ensure(this.songSpec); });

    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard.on('keydown-P', () => this.pauseGame());
    this.input.keyboard.on('keydown-M', () => toggleMute());
    this.input.keyboard.on('keydown-R', () => this.restartLevel());
    this.input.keyboard.on('keydown-H', () => {
      const w = this.physics.world;
      if (!w.debugGraphic) w.createDebugGraphic();
      w.drawDebug = !w.drawDebug;
      w.debugGraphic.clear();
      w.debugGraphic.setVisible(w.drawDebug);
    });

    this.onBlur = () => { if (!this.finished) this.pauseGame(); };
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur);
    this.events.once('shutdown', () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur);
      music.stop();
    });

    // --- HUD + music ---
    if (this.scene.isActive('Hud') || this.scene.isPaused('Hud')) this.scene.stop('Hud');
    this.scene.launch('Hud', { levelName: level.name });
    this.runStart = this.time.now;
    this.songSpec = SONGS[level.song];
    music.play(this.songSpec);

    if (this.startCp) this.devJumpToCheckpoint(this.startCp);
  }

  buildBackdrop(level) {
    const pal = this.palette;
    // Washed per section (see applyModeVisuals); level.bg.hue still identifies
    // the level on the select cards.
    this.bgColor = pal.modes.cube.backdrop;
    this.bgRect = this.add.rectangle(0, 0, GAME_W, GAME_H, this.bgColor, 0.55)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.BG);
    this.decoFar = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'deco')
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.DECO).setTileScale(2)
      .setAlpha(0.7).setTint(pal.deco);
    this.decoNear = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'deco')
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.DECO).setTint(pal.deco);
    this.groundTile = this.add.tileSprite(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y, 'ground')
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.GROUND).setTint(pal.ground);
    this.add.rectangle(0, GROUND_Y - 2, GAME_W, 3, lighten(pal.modes.cube.accent, 0.5), 0.85)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.GROUND);
  }

  // Everything that changes when the form changes: the wake behind the player
  // and the colour of the world. Both double as feedback for the mode switch.
  applyModeVisuals(mode) {
    this.setTrail(mode);
    const to = this.palette.modes[mode].backdrop;
    const from = this.bgColor;
    if (from === to) return;
    this.tweens.addCounter({
      from: 0, to: 1, duration: 450,
      onUpdate: (tw) => {
        this.bgColor = mix(from, to, tw.getValue());
        this.bgRect.setFillStyle(this.bgColor, 0.55);
      },
    });
  }

  // One emitter that follows the player, rebuilt when the mode changes — each
  // form leaves a different wake.
  setTrail(mode) {
    if (this.trail) this.trail.destroy();
    this.trailMode = mode;
    const tint = this.playerTint;
    const shared = {
      follow: this.player.sprite,
      tint: [tint, lighten(tint, 0.45), this.palette.modes[mode].accent],
      blendMode: 'ADD',
      emitting: !this.dead && !this.finished,
    };
    const perMode = {
      [MODES.CUBE]: {
        followOffset: { x: -20, y: 16 },
        speed: { min: 20, max: 120 }, angle: { min: 150, max: 215 },
        lifespan: 420, frequency: 24, quantity: 2,
        scale: { start: 0.9, end: 0 }, alpha: { start: 0.85, end: 0 },
      },
      [MODES.SHIP]: {
        followOffset: { x: -34, y: 4 },
        speed: { min: 60, max: 200 }, angle: { min: 165, max: 195 },
        lifespan: 340, frequency: 16, quantity: 2,
        scale: { start: 1.1, end: 0 }, alpha: { start: 0.95, end: 0 },
      },
      [MODES.TRI]: {
        followOffset: { x: -18, y: 0 },
        speed: { min: 10, max: 70 }, angle: { min: 160, max: 200 },
        lifespan: 500, frequency: 18, quantity: 2,
        scale: { start: 0.75, end: 0 }, alpha: { start: 0.9, end: 0 },
      },
    };
    this.trail = this.add.particles(0, 0, 'particle', { ...shared, ...perMode[mode] })
      .setDepth(DEPTH.PLAYER - 1);
  }

  // Death: the cube comes apart. Shards inherit the player's colour, tumble
  // outward under gravity, and an expanding flash sells the impact.
  shatter(x, y) {
    const tint = this.playerTint;
    const ring = this.add.image(x, y, 'ring')
      .setTint(lighten(tint, 0.55)).setDepth(DEPTH.FX).setScale(0.25).setAlpha(0.95)
      .setBlendMode('ADD');
    this.tweens.add({
      targets: ring, scale: 2.8, alpha: 0, duration: 420,
      ease: 'Cubic.easeOut', onComplete: () => ring.destroy(),
    });
    const flash = this.add.image(x, y, 'particle')
      .setTint(0xffffff).setDepth(DEPTH.FX).setScale(4).setAlpha(0.95)
      .setBlendMode('ADD');
    this.tweens.add({
      targets: flash, scale: 10, alpha: 0, duration: 200,
      ease: 'Cubic.easeOut', onComplete: () => flash.destroy(),
    });

    const shards = this.add.particles(x, y, 'shard', {
      speed: { min: 180, max: 560 },
      angle: { min: 190, max: 350 },            // thrown up and outward
      gravityY: 1900,
      lifespan: 950,
      rotate: { min: 0, max: 360 },
      scale: { min: 0.8, max: 1.9 },
      alpha: { start: 1, end: 0.2 },
      tint: [tint, lighten(tint, 0.4), darken(tint, 0.4)],
      emitting: false,
    }).setDepth(DEPTH.FX);
    shards.explode(20);

    const dust = this.add.particles(x, y, 'particle', {
      speed: { min: 40, max: 190 }, angle: { min: 0, max: 360 },
      lifespan: 520, scale: { start: 1.1, end: 0 }, alpha: { start: 0.7, end: 0 },
      tint: lighten(tint, 0.6), blendMode: 'ADD', emitting: false,
    }).setDepth(DEPTH.FX);
    dust.explode(12);

    this.time.delayedCall(1000, () => { shards.destroy(); dust.destroy(); });
  }

  update(time, delta) {
    const cam = this.cameras.main;
    cam.scrollX = Phaser.Math.Clamp(
      this.player.sprite.x - GAME_W * 0.3, 0, Math.max(0, this.built.worldW - GAME_W)
    );
    this.groundTile.tilePositionX = cam.scrollX;
    this.decoNear.tilePositionX = cam.scrollX * 0.25;
    this.decoFar.tilePositionX = cam.scrollX * 0.1;

    if (this.dead || this.finished) { this.ptrJust = false; return; }

    const held = this.ptrDown || this.keys.some(k => k.isDown);
    let just = this.ptrJust;
    for (const k of this.keys) just = Phaser.Input.Keyboard.JustDown(k) || just;
    this.ptrJust = false;

    this.player.update(held, just, delta / 1000);
    if (this.player.mode !== this.trailMode) this.applyModeVisuals(this.player.mode);

    const b = this.player.sprite.body;

    // Wall face = death (cube & ship). Corner grazes get popped on top instead.
    if (this.player.mode !== MODES.TRI && b.blocked.right && !this.cornerForgive()) {
      this.die();
      return;
    }

    // Failsafe: sinking below the ground plane (e.g. a body-resize embed the
    // separation cap can't resolve) must be a death, never an invisible run.
    if (b.bottom > GROUND_Y + 24) {
      this.die();
      return;
    }

    // The ship flies or it dies: roof or any surface is lethal. Moving upward is
    // exempt so the portal's lift-off — which fires while still touching the
    // floor — isn't read as a crash.
    if (this.player.mode === MODES.SHIP && this.time.now >= this.shipGraceUntil) {
      const grounded = (b.blocked.down || b.touching.down) && b.velocity.y >= 0;
      if (grounded || b.blocked.up || b.top <= TOP_Y) {
        this.die();
        return;
      }
    }

    // Triangle corridor: manual collision + gap detection.
    if (this.player.mode === MODES.TRI) {
      const t = this.built.tunnels.find(tn => tn.contains(b.center.x));
      if (t) {
        this.currentTunnel = t;
        if (t.collide(this.player) === 'die') { this.die(); return; }
      } else if (this.currentTunnel) {
        this.die();                              // overran the corridor exit
        return;
      }
    }

    // Progress.
    const pct = Phaser.Math.Clamp(Math.floor((this.player.sprite.x / this.built.finishX) * 100), 0, 100);
    this.bestPct = Math.max(this.bestPct, pct);
    if (pct !== this.lastPct) {
      this.lastPct = pct;
      this.game.events.emit('qdash:progress', pct);
    }
    if (this.player.sprite.x >= this.built.finishX) this.complete();
  }

  // A landing that clipped a block's leading corner: lift onto the top if shallow.
  cornerForgive() {
    const b = this.player.sprite.body;
    const found = this.physics.overlapRect(b.x, b.bottom - 2, b.width + 10, 16, false, true);
    for (const sb of found) {
      const go = sb.gameObject;
      if (!go || !this.built.blocks.contains(go)) continue;
      const lift = b.bottom - sb.y;
      if (lift > 0 && lift <= 13 && b.velocity.y >= 0) {
        this.player.sprite.y -= lift;
        return true;
      }
    }
    return false;
  }

  onPortal(p) {
    if (this.dead || this.finished) return;
    if (this.player.mode === p.mode) return;
    if (p.mode !== MODES.TRI) this.currentTunnel = null;
    this.player.setMode(p.mode, p.g);
    sfx.portal();
    this.cameras.main.flash(120, 255, 255, 255, false);
  }

  // Gold launch pad: auto-fires on touch, springs the player high (~3 cells).
  onPad(p) {
    if (this.dead || this.finished || this.player.mode === MODES.TRI) return;
    if (this.time.now - p.lastFire < PAD.COOLDOWN_MS) return;
    p.lastFire = this.time.now;
    this.player.sprite.body.setVelocityY(PAD.VY);
    sfx.pad();
    p.img.setScale(1, 0.4);                      // spring squash
    this.tweens.add({ targets: p.img, scaleY: 1, duration: 180, ease: 'Back.easeOut' });
    const s = this.player.sprite;
    s.setScale(0.85, 1.2);                       // player stretch
    this.tweens.add({ targets: s, scaleX: 1, scaleY: 1, duration: 150 });
    const em = this.add.particles(s.x, s.y + 24, 'particle', {
      speed: { min: 60, max: 220 }, angle: { min: 200, max: 340 },
      lifespan: 400, scale: { start: 0.8, end: 0 }, tint: 0xfed330, emitting: false,
    }).setDepth(DEPTH.FX);
    em.explode(10);
    this.time.delayedCall(500, () => em.destroy());
  }

  onCheckpoint(c) {
    if (this.dead || this.finished || c.index <= this.cpIndex) return;
    this.cpIndex = c.index;
    this.snapshot = this.player.snapshot();
    c.flag.setTint(0x2eff8a);
    this.tweens.add({ targets: c.flag, scale: 1.35, duration: 130, yoyo: true });
    sfx.checkpoint();
    this.game.events.emit('qdash:checkpoint', c.index + 1);
  }

  die() {
    if (this.dead || this.finished) return;
    this.dead = true;
    sfx.death();
    if (this.playerId) {
      storage.recordDeath(this.playerId, this.levelId);
      storage.recordProgress(this.playerId, this.levelId, this.bestPct);
    }
    const s = this.player.sprite;
    if (this.trail) this.trail.stop();
    this.shatter(s.x, s.y);
    s.setVisible(false);
    s.body.stop();
    s.body.enable = false;
    this.cameras.main.shake(180, 0.011);
    this.time.delayedCall(DEATH_RESPAWN_MS, () => this.respawn());
  }

  respawn() {
    if (this.finished) return;
    this.attempt += 1;
    this.game.events.emit('qdash:attempt', this.attempt);
    this.player.applySnapshot(this.snapshot);
    this.currentTunnel = null;
    this.dead = false;
    this.shipGraceUntil = this.time.now + SHIP.RESPAWN_GRACE_MS;
    this.applyModeVisuals(this.player.mode);   // the checkpoint may be in another section
  }

  complete() {
    if (this.dead || this.finished) return;
    this.finished = true;
    music.stop();
    sfx.complete();
    const timeMs = this.time.now - this.runStart;
    let newBest = false;
    if (this.playerId) {
      newBest = storage.recordComplete(this.playerId, this.levelId, timeMs, this.attempt);
    }
    const s = this.player.sprite;
    if (this.trail) this.trail.stop();
    s.body.stop();
    s.body.enable = false;
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 220, () => this.burst(s.x + i * 40, s.y - 40 - i * 30, 18));
    }
    this.time.delayedCall(900, () => {
      this.scene.launch('LevelComplete', {
        levelId: this.levelId, timeMs, attempts: this.attempt, newBest,
      });
      this.scene.pause();
    });
  }

  burst(x, y, count) {
    const em = this.add.particles(x, y, 'particle', {
      speed: { min: 120, max: 460 }, angle: { min: 0, max: 360 },
      lifespan: 650, scale: { start: 1.2, end: 0 },
      tint: this.playerTint, emitting: false,
    }).setDepth(DEPTH.FX);
    em.explode(count);
    this.time.delayedCall(800, () => em.destroy());
  }

  pauseGame() {
    if (this.finished || this.scene.isPaused()) return;
    suspend();
    this.scene.launch('Pause', { levelId: this.levelId });
    this.scene.pause();
  }

  restartLevel() {
    this.saveProgress();
    music.stop();
    this.scene.restart({ levelId: this.levelId });
  }

  saveProgress() {
    if (this.playerId && !this.finished) {
      storage.recordProgress(this.playerId, this.levelId, this.bestPct);
    }
  }

  // Dev-only (?cp=K): approximate a checkpoint spawn without playing to it.
  devJumpToCheckpoint(k) {
    const cp = this.built.checkpoints[Phaser.Math.Clamp(k - 1, 0, 4)];
    if (!cp) return;
    let mode = MODES.CUBE, g = 1;
    for (const o of this.levelData.objects) {
      if (o.t === 'portal' && o.x < cp.x) { mode = o.mode; g = o.g || 1; }
    }
    let y = GROUND_Y - 30;
    if (mode === MODES.TRI) {
      const t = this.built.tunnels.find(tn => tn.contains(gx(cp.x)));
      if (t) {
        const seg = t.segmentAt(gx(cp.x));
        y = (seg.floorY + seg.ceilY) / 2;
      }
    } else if (mode === MODES.SHIP) {
      y = GROUND_Y - 3 * CELL;
    }
    this.cpIndex = cp.index;
    this.snapshot = { x: gx(cp.x), y, mode, gravityDir: g };
    this.player.applySnapshot(this.snapshot);
  }
}
