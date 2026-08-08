// Title screen.

import { GAME_W, GAME_H, COLORS, DEFAULT_COLOR } from '../constants.js';
import { storage } from '../storage.js';
import { makeTitle, makeText, makeButton, attachAudioUnlock } from '../ui.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    attachAudioUnlock(this);
    const cx = GAME_W / 2;

    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'deco').setOrigin(0).setAlpha(0.8);
    makeTitle(this, cx, 130, 'QGEOMETRY DASH', 72);
    makeText(this, cx, 190, 'jump • fly • flip', 22, '#8890c8');

    const profile = storage.current();
    const tint = COLORS[(profile && profile.color) || DEFAULT_COLOR];
    const cube = this.add.image(cx, 300, 'cube').setTint(tint).setScale(1.6);
    this.tweens.add({
      targets: cube, y: 285, angle: 8, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    makeText(this, cx, 375, profile ? `Player: ${profile.name}` : 'No player selected', 22,
      profile ? '#ffffff' : '#fc5c65');

    makeButton(this, cx, 450, 'Play', () => {
      this.scene.start(storage.current() ? 'LevelSelect' : 'PlayerSelect');
    }, { w: 320, h: 64, size: 28 });
    makeButton(this, cx, 530, 'Players & Colors', () => this.scene.start('PlayerSelect'), { w: 320 });
    makeButton(this, cx, 600, 'Leaderboard', () => this.scene.start('Leaderboard', { levelId: 1 }), { w: 320 });

    makeText(this, cx, 680, 'Space / Up / Click = action    Esc = pause    M = mute', 16, '#565a80');
  }
}
