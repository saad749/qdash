// Overlay scene running in parallel with GameScene: progress bar, attempt
// counter, level name, pause button. Listens on game-wide events so it never
// touches gameplay internals.

import { GAME_W } from '../constants.js';
import { FONT } from '../ui.js';

const BAR_W = 400, BAR_H = 14;

export class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  init(data) {
    this.levelName = data.levelName || '';
  }

  create() {
    const cx = GAME_W / 2;
    this.add.rectangle(cx, 26, BAR_W + 4, BAR_H + 4, 0x000000, 0.5).setStrokeStyle(2, 0x8890c8);
    this.bar = this.add.rectangle(cx - BAR_W / 2, 26, 0, BAR_H, 0x2eff8a).setOrigin(0, 0.5);
    this.pctText = this.add.text(cx + BAR_W / 2 + 16, 26, '0%', {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0, 0.5);

    this.attemptText = this.add.text(24, 16, 'Attempt 1', {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    });
    this.cpText = this.add.text(24, 46, '', {
      fontFamily: FONT, fontSize: '16px', color: '#9fe8b6',
    });

    this.add.text(GAME_W - 120, 16, this.levelName, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#c9cdf0',
    }).setOrigin(1, 0);

    const pauseBtn = this.add.text(GAME_W - 40, 16, '❚❚', {
      fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => {
      const game = this.scene.get('Game');
      if (game && game.pauseGame) game.pauseGame();
    });

    this.onProgress = (pct) => {
      this.bar.width = (Phaser.Math.Clamp(pct, 0, 100) / 100) * BAR_W;
      this.pctText.setText(`${pct}%`);
    };
    this.onAttempt = (n) => {
      this.attemptText.setText(`Attempt ${n}`);
      this.attemptText.setScale(1.3);
      this.tweens.add({ targets: this.attemptText, scale: 1, duration: 200 });
    };
    this.onCheckpoint = (n) => {
      this.cpText.setText(`Checkpoint ${n}/5`);
    };

    this.game.events.on('qdash:progress', this.onProgress);
    this.game.events.on('qdash:attempt', this.onAttempt);
    this.game.events.on('qdash:checkpoint', this.onCheckpoint);
    this.events.once('shutdown', () => {
      this.game.events.off('qdash:progress', this.onProgress);
      this.game.events.off('qdash:attempt', this.onAttempt);
      this.game.events.off('qdash:checkpoint', this.onCheckpoint);
    });
  }
}
