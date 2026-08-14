// Title screen.

import { GAME_W, GAME_H, COLORS, DEFAULT_COLOR } from '../constants.js';
import { storage } from '../storage.js';
import { LEVEL_IDS } from '../levels/index.js';
import { makeTitle, makeText, makeButton, attachAudioUnlock } from '../ui.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    attachAudioUnlock(this);
    const cx = GAME_W / 2;

    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'deco').setOrigin(0).setAlpha(0.8);
    makeTitle(this, cx, 130, 'Q DASH', 88);
    makeText(this, cx, 190, 'jump • fly • flip', 22, '#8890c8');

    const profile = storage.current();
    const tint = COLORS[(profile && profile.color) || DEFAULT_COLOR];
    const cube = this.add.image(cx, 300, 'cube').setTint(tint).setScale(1.6);
    this.tweens.add({
      targets: cube, y: 285, angle: 8, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    let status = 'Press Play to start', statusColor = '#fed330';
    if (profile) {
      status = `Player: ${profile.name}`;
      statusColor = '#ffffff';
    } else if (storage.playerList().length) {
      status = 'No player selected';
      statusColor = '#fc5c65';
    }
    makeText(this, cx, 375, status, 22, statusColor);

    makeButton(this, cx, 450, 'Play', () => this.startPlay(), { w: 320, h: 64, size: 28 });
    makeButton(this, cx, 530, 'Players & Colors', () => this.scene.start('PlayerSelect'), { w: 320 });
    makeButton(this, cx, 600, 'Leaderboard', () => this.scene.start('Leaderboard', { levelId: 1 }), { w: 320 });

    makeText(this, cx, 680, 'Space / Up / Click = action    Esc = pause    M = mute', 16, '#565a80');
  }

  // Nobody has ever played: make a profile and drop straight into level 1 rather
  // than showing a first-timer the player form. Profiles that exist but aren't
  // selected still go through the picker, so Play can't pile up junk profiles.
  startPlay() {
    if (storage.current()) {
      this.scene.start('SeasonSelect');
    } else if (storage.playerList().length === 0) {
      storage.createRandomPlayer();
      this.scene.start('Game', { levelId: LEVEL_IDS[0] });
    } else {
      this.scene.start('PlayerSelect');
    }
  }
}
