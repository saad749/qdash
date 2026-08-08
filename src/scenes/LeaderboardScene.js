// Local leaderboard: one tab per level, players ranked by storage.leaderboard().

import { GAME_W, COLORS } from '../constants.js';
import { storage, fmtTime } from '../storage.js';
import { LEVELS, LEVEL_IDS } from '../levels/index.js';
import { makeTitle, makeText, makeButton, attachAudioUnlock, FONT } from '../ui.js';

export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }

  init(data) {
    this.levelId = data.levelId || 1;
  }

  create() {
    attachAudioUnlock(this);
    makeTitle(this, GAME_W / 2, 60, 'LEADERBOARD', 48);

    // level tabs
    LEVEL_IDS.forEach((id, i) => {
      const x = GAME_W / 2 + (i - 2) * 130;
      const active = id === this.levelId;
      makeButton(this, x, 130, `${id}`, () => this.scene.restart({ levelId: id }), {
        w: 110, h: 44, size: 22, color: active ? 0x3d6b46 : 0x2b2b4a,
      });
    });
    makeText(this, GAME_W / 2, 180, LEVELS[this.levelId].name, 26, '#fed330');

    const rows = storage.leaderboard(this.levelId);
    const current = storage.current();
    const y0 = 240, rowH = 46;

    const header = (x, t, align = 0.5) => this.add.text(x, y0 - 34, t, {
      fontFamily: FONT, fontSize: '16px', color: '#8890c8',
    }).setOrigin(align, 0.5);
    header(250, 'RANK');
    header(340, 'PLAYER', 0);
    header(700, 'PROGRESS');
    header(850, 'BEST TIME');
    header(1000, 'ATTEMPTS');

    if (!rows.length) {
      makeText(this, GAME_W / 2, 350, 'No runs recorded for this level yet.', 22, '#565a80');
    }

    rows.slice(0, 8).forEach((r, i) => {
      const y = y0 + i * rowH;
      const isMe = current && current.id === r.id;
      this.add.rectangle(GAME_W / 2, y, 900, rowH - 6, isMe ? 0x244a36 : 0x1b1b36, 1)
        .setStrokeStyle(1, isMe ? 0x2eff8a : 0x33335c);
      const rankColor = i === 0 ? '#fed330' : i === 1 ? '#c9cdf0' : i === 2 ? '#fd9644' : '#8890c8';
      this.add.text(250, y, `#${i + 1}`, {
        fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: rankColor,
      }).setOrigin(0.5);
      this.add.image(315, y, 'cube').setTint(COLORS[r.color]).setScale(0.4);
      this.add.text(340, y, r.name, {
        fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0, 0.5);
      this.add.text(700, y, r.completed ? '100% ✓' : `${r.bestPercent}%`, {
        fontFamily: FONT, fontSize: '18px', color: r.completed ? '#2eff8a' : '#c9cdf0',
      }).setOrigin(0.5);
      this.add.text(850, y, r.completed ? fmtTime(r.bestTimeMs) : '—', {
        fontFamily: FONT, fontSize: '18px', color: '#c9cdf0',
      }).setOrigin(0.5);
      this.add.text(1000, y, String(r.attemptsTotal), {
        fontFamily: FONT, fontSize: '18px', color: '#c9cdf0',
      }).setOrigin(0.5);
    });

    makeButton(this, GAME_W / 2, 660, 'Back to Menu', () => this.scene.start('Menu'));
  }
}
