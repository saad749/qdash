// Overlay shown when a level is finished.

import { GAME_W, GAME_H } from '../constants.js';
import { makePanel, makeTitle, makeText, makeButton } from '../ui.js';
import { fmtTime } from '../storage.js';
import { LEVELS } from '../levels/index.js';
import { nextLevelId } from '../seasons.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super('LevelComplete'); }

  init(data) {
    this.data_ = data;
  }

  create() {
    const { levelId, timeMs, attempts, newBest } = this.data_;
    const cx = GAME_W / 2, cy = GAME_H / 2;
    makePanel(this, cx, cy, 520, 440);
    makeTitle(this, cx, cy - 150, 'LEVEL COMPLETE!', 40, '#2eff8a');
    makeText(this, cx, cy - 95, LEVELS[levelId].name, 26, '#ffffff');
    makeText(this, cx, cy - 55, `Time: ${fmtTime(timeMs)}    Attempts: ${attempts}`, 22);
    if (newBest) {
      const badge = makeTitle(this, cx, cy - 15, '★ NEW BEST! ★', 26, '#fed330');
      this.tweens.add({ targets: badge, scale: 1.12, duration: 400, yoyo: true, repeat: -1 });
    }

    const stopGame = () => {
      this.scene.stop('Hud');
      this.scene.stop('Game');
    };

    const next = nextLevelId(levelId);      // null on a season finale
    if (next) {
      makeButton(this, cx, cy + 45, 'Next Level', () => {
        stopGame();
        this.scene.start('Game', { levelId: next });
      });
    }
    makeButton(this, cx, cy + 110, 'Replay', () => {
      stopGame();
      this.scene.start('Game', { levelId });
    });
    makeButton(this, cx - 140, cy + 175, 'Leaderboard', () => {
      stopGame();
      this.scene.start('Leaderboard', { levelId });
    }, { w: 240 });
    makeButton(this, cx + 140, cy + 175, 'Menu', () => {
      stopGame();
      this.scene.start('Menu');
    }, { w: 240 });
  }
}
