// Level picker: 5 cards with the current player's records.

import { GAME_W, COLORS } from '../constants.js';
import { storage, fmtTime } from '../storage.js';
import { LEVELS } from '../levels/index.js';
import { SEASONS, seasonById } from '../seasons.js';
import { makeTitle, makeText, attachAudioUnlock, makeButton, FONT } from '../ui.js';
import { sfx } from '../audio/sfx.js';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  init(data) {
    this.seasonId = (data && data.seasonId) || SEASONS[0].id;
  }

  create() {
    attachAudioUnlock(this);
    const profile = storage.current();
    if (!profile) {
      this.scene.start('PlayerSelect');
      return;
    }
    const season = seasonById(this.seasonId) || SEASONS[0];
    const levelIds = season.levelIds;

    makeTitle(this, GAME_W / 2, 52, 'SELECT LEVEL', 44);
    makeText(this, GAME_W / 2, 94, `Season ${season.id} — ${season.name}`, 22, '#fed330');
    this.add.image(GAME_W / 2 - 200, 134, 'cube').setTint(COLORS[profile.color]).setScale(0.5);
    makeText(this, GAME_W / 2 + 10, 134, `Playing as  ${profile.name}`, 22, '#ffffff');

    const cardW = 224, cardH = 380, gap = 20;
    const total = levelIds.length * cardW + (levelIds.length - 1) * gap;
    const x0 = (GAME_W - total) / 2 + cardW / 2;

    levelIds.forEach((id, i) => {
      const level = LEVELS[id];
      const rec = storage.record(profile.id, id);
      const x = x0 + i * (cardW + gap), y = 400;

      const card = this.add.rectangle(x, y, cardW, cardH, 0x1b1b36, 1)
        .setStrokeStyle(3, rec.completed ? 0x2eff8a : 0x565a80)
        .setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setFillStyle(0x272750));
      card.on('pointerout', () => card.setFillStyle(0x1b1b36));
      card.on('pointerdown', () => {
        sfx.uiClick();
        this.scene.start('Game', { levelId: id });
      });

      this.add.rectangle(x, y - 140, cardW - 40, 60, level.bg.hue, 0.45);
      this.add.text(x, y - 140, String(id), {
        fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
      this.add.text(x, y - 80, level.name, {
        fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: '#ffffff',
        align: 'center', wordWrap: { width: cardW - 30 },
      }).setOrigin(0.5);

      // best % bar
      const barW = cardW - 50;
      this.add.rectangle(x, y - 20, barW + 4, 16, 0x000000, 0.6).setStrokeStyle(1, 0x8890c8);
      this.add.rectangle(x - barW / 2, y - 20, barW * (rec.bestPercent / 100), 12, 0x2eff8a)
        .setOrigin(0, 0.5);
      makeText(this, x, y + 8, `Best: ${rec.bestPercent}%`, 16);

      if (rec.completed) {
        makeText(this, x, y + 45, '✓ COMPLETED', 17, '#2eff8a');
        makeText(this, x, y + 75, `Best time ${fmtTime(rec.bestTimeMs)}`, 15);
      } else {
        makeText(this, x, y + 45, 'not completed', 15, '#565a80');
      }
      makeText(this, x, y + 110, `${rec.attemptsTotal} attempts`, 14, '#8890c8');
      makeText(this, x, y + 155, 'PLAY ▶', 20, '#fed330');
    });

    makeButton(this, GAME_W / 2, 660, 'Back to Seasons', () => this.scene.start('SeasonSelect'));
  }
}
