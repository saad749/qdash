// Season picker: one card per season, with its release tag and the current
// player's progress. Unreleased seasons render dimmed and aren't clickable.

import { GAME_W } from '../constants.js';
import { storage } from '../storage.js';
import { SEASONS, releaseLabel } from '../seasons.js';
import { LEVELS } from '../levels/index.js';
import { makeTitle, makeText, makeButton, attachAudioUnlock, FONT } from '../ui.js';
import { sfx } from '../audio/sfx.js';

export class SeasonSelectScene extends Phaser.Scene {
  constructor() { super('SeasonSelect'); }

  create() {
    attachAudioUnlock(this);
    const profile = storage.current();
    if (!profile) {
      this.scene.start('PlayerSelect');
      return;
    }

    makeTitle(this, GAME_W / 2, 60, 'SELECT SEASON', 48);
    makeText(this, GAME_W / 2, 112, `Playing as  ${profile.name}`, 20, '#8890c8');

    const cardW = 340, cardH = 400, gap = 30;
    const total = SEASONS.length * cardW + (SEASONS.length - 1) * gap;
    const x0 = (GAME_W - total) / 2 + cardW / 2;

    SEASONS.forEach((season, i) => {
      const x = x0 + i * (cardW + gap), y = 380;
      const open = season.status === 'released';

      const card = this.add.rectangle(x, y, cardW, cardH, open ? 0x1b1b36 : 0x141428, 1)
        .setStrokeStyle(3, open ? 0x8890c8 : 0x33335c);
      if (open) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setFillStyle(0x272750));
        card.on('pointerout', () => card.setFillStyle(0x1b1b36));
        card.on('pointerdown', () => {
          sfx.uiClick();
          this.scene.start('LevelSelect', { seasonId: season.id });
        });
      }

      makeText(this, x, y - 150, `SEASON ${season.id}`, 22, open ? '#8890c8' : '#565a80');
      this.add.text(x, y - 100, season.name, {
        fontFamily: FONT, fontSize: '26px', fontStyle: 'bold',
        color: open ? '#ffffff' : '#565a80',
        align: 'center', wordWrap: { width: cardW - 50 },
      }).setOrigin(0.5);

      this.add.rectangle(x, y - 20, cardW - 70, 34, 0x000000, 0.45)
        .setStrokeStyle(2, open ? 0x2eff8a : 0x565a80);
      makeText(this, x, y - 20, releaseLabel(season), 15, open ? '#2eff8a' : '#8890c8');

      if (open) {
        const done = season.levelIds.filter(id => storage.record(profile.id, id).completed).length;
        const all = season.levelIds.length;
        makeText(this, x, y + 40, `${all} levels`, 20, '#c9cdf0');
        makeText(this, x, y + 75, `${done} / ${all} completed`, 18, done === all ? '#2eff8a' : '#8890c8');
        const first = LEVELS[season.levelIds[0]];
        if (first) makeText(this, x, y + 128, `Starts with ${first.name}`, 15, '#565a80');
        makeText(this, x, y + 165, 'PLAY ▶', 22, '#fed330');
      } else {
        makeText(this, x, y + 60, 'Still being built.', 18, '#565a80');
        makeText(this, x, y + 90, 'Check back later.', 18, '#565a80');
      }
    });

    makeButton(this, GAME_W / 2, 660, 'Back to Menu', () => this.scene.start('Menu'));
  }
}
