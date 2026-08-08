// Player management: create/select/delete profiles and pick the character color.
// The scene rebuilds itself (restart) after every mutation — state lives in storage.

import { GAME_W, COLORS, COLOR_NAMES } from '../constants.js';
import { storage } from '../storage.js';
import { makeTitle, makeText, makeButton, attachAudioUnlock, FONT } from '../ui.js';
import { sfx } from '../audio/sfx.js';

export class PlayerScene extends Phaser.Scene {
  constructor() { super('PlayerSelect'); }

  init(data) {
    this.confirmDeleteId = data.confirmDeleteId || null;
  }

  create() {
    attachAudioUnlock(this);
    makeTitle(this, GAME_W / 2, 60, 'PLAYERS', 48);

    this.buildPlayerList();
    this.buildCreateRow();
    this.buildColorPicker();

    makeButton(this, GAME_W / 2, 660, 'Back to Menu', () => this.scene.start('Menu'));
  }

  buildPlayerList() {
    const players = storage.playerList();
    const current = storage.current();
    const x0 = 120, y0 = 140, rowH = 58;

    if (!players.length) {
      makeText(this, 380, y0 + 40, 'No players yet — create one below!', 22, '#fc5c65');
    }

    players.slice(0, 7).forEach((p, i) => {
      const y = y0 + i * rowH;
      const isCurrent = current && current.id === p.id;
      this.add.rectangle(380, y, 540, rowH - 8, isCurrent ? 0x244a36 : 0x1b1b36, 1)
        .setStrokeStyle(2, isCurrent ? 0x2eff8a : 0x565a80);
      this.add.image(x0 + 10, y, 'cube').setTint(COLORS[p.color]).setScale(0.55);
      this.add.text(x0 + 50, y, p.name, {
        fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0, 0.5);

      if (this.confirmDeleteId === p.id) {
        makeText(this, 430, y, 'Delete?', 18, '#fc5c65');
        makeButton(this, 520, y, 'Yes', () => {
          storage.deletePlayer(p.id);
          this.scene.restart({});
        }, { w: 70, h: 40, size: 18, color: 0x5c2530 });
        makeButton(this, 600, y, 'No', () => this.scene.restart({}), { w: 70, h: 40, size: 18 });
      } else {
        if (!isCurrent) {
          makeButton(this, 520, y, 'Select', () => {
            storage.setCurrent(p.id);
            this.scene.restart({});
          }, { w: 100, h: 40, size: 18 });
        } else {
          makeText(this, 520, y, '● current', 18, '#2eff8a');
        }
        makeButton(this, 615, y, '✕', () => {
          this.scene.restart({ confirmDeleteId: p.id });
        }, { w: 44, h: 40, size: 18, color: 0x3a2030 });
      }
    });
  }

  buildCreateRow() {
    const y = 580;
    makeText(this, 260, y, 'New player:', 22, '#ffffff');

    const el = this.add.dom(430, y, 'input',
      'width: 200px; height: 30px; font-size: 18px; text-align: center; ' +
      'background: #1b1b36; color: #fff; border: 2px solid #8890c8; border-radius: 6px;');
    el.node.maxLength = 12;
    el.node.placeholder = 'name';
    this.nameInput = el;

    const createFn = () => {
      const name = (el.node.value || '').trim();
      if (!name) return;
      storage.createPlayer(name);            // also becomes the current player
      sfx.checkpoint();
      this.scene.restart({});
    };
    el.addListener('keydown');
    el.on('keydown', (e) => { if (e.key === 'Enter') createFn(); });
    makeButton(this, 600, y, 'Create', createFn, { w: 110, h: 44, size: 20 });
  }

  buildColorPicker() {
    const current = storage.current();
    const px = 950;
    makeText(this, px, 140, 'Character color', 26, '#ffffff');

    if (!current) {
      makeText(this, px, 200, '(select a player first)', 18, '#565a80');
      return;
    }

    // Live preview of all three forms in the chosen color.
    const tint = COLORS[current.color];
    this.previews = [
      this.add.image(px - 90, 230, 'cube').setTint(tint),
      this.add.image(px, 230, 'ship').setTint(tint),
      this.add.image(px + 90, 230, 'tri').setTint(tint).setScale(0.9),
    ];

    COLOR_NAMES.forEach((name, i) => {
      const sx = px - 132 + (i % 4) * 88;
      const sy = 330 + Math.floor(i / 4) * 90;
      const selected = current.color === name;
      const ring = this.add.rectangle(sx, sy, 72, 72, 0x000000, 0)
        .setStrokeStyle(selected ? 4 : 2, selected ? 0xffffff : 0x565a80);
      const swatch = this.add.image(sx, sy, 'cube').setTint(COLORS[name]).setScale(0.85)
        .setInteractive({ useHandCursor: true });
      swatch.on('pointerover', () => ring.setStrokeStyle(4, 0xc9cdf0));
      swatch.on('pointerout', () => ring.setStrokeStyle(selected ? 4 : 2, selected ? 0xffffff : 0x565a80));
      swatch.on('pointerdown', () => {
        sfx.uiClick();
        storage.setColor(current.id, name);
        this.scene.restart({});
      });
      makeText(this, sx, sy + 48, name, 14, selected ? '#ffffff' : '#8890c8');
    });
  }
}
