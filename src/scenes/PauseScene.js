// Pause overlay on top of a paused GameScene.

import { GAME_W, GAME_H } from '../constants.js';
import { makePanel, makeTitle, makeButton } from '../ui.js';
import { resume as audioResume } from '../audio/engine.js';
import { music } from '../audio/music.js';
import { seasonOf } from '../seasons.js';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  init(data) {
    this.levelId = data.levelId;
  }

  create() {
    const cx = GAME_W / 2, cy = GAME_H / 2;
    makePanel(this, cx, cy, 420, 360);
    makeTitle(this, cx, cy - 110, 'PAUSED', 44);

    makeButton(this, cx, cy - 30, 'Resume', () => this.resumeGame());
    makeButton(this, cx, cy + 40, 'Restart Level', () => {
      const game = this.scene.get('Game');
      this.scene.stop();
      audioResume();
      game.scene.restart({ levelId: this.levelId });
    });
    makeButton(this, cx, cy + 110, 'Quit to Menu', () => {
      const game = this.scene.get('Game');
      if (game && game.saveProgress) game.saveProgress();
      music.stop();
      audioResume();
      this.scene.stop('Hud');
      this.scene.stop('Game');
      // back to the season you were playing, not season 1
      const season = seasonOf(this.levelId);
      this.scene.start('LevelSelect', { seasonId: season ? season.id : undefined });
    });

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard.on('keydown-P', () => this.resumeGame());
  }

  resumeGame() {
    audioResume();
    this.scene.stop();
    this.scene.resume('Game');
  }
}
