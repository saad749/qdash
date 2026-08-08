// Tiny shared UI factory used by every menu scene.

import { unlock } from './audio/engine.js';
import { sfx } from './audio/sfx.js';

export const FONT = 'Verdana, Arial, sans-serif';

export function attachAudioUnlock(scene) {
  scene.input.once('pointerdown', () => unlock());
  if (scene.input.keyboard) scene.input.keyboard.once('keydown', () => unlock());
}

export function makeTitle(scene, x, y, text, size = 56, color = '#ffffff') {
  return scene.add.text(x, y, text, {
    fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color,
    stroke: '#000000', strokeThickness: 6,
  }).setOrigin(0.5);
}

export function makeText(scene, x, y, text, size = 20, color = '#c9cdf0') {
  return scene.add.text(x, y, text, {
    fontFamily: FONT, fontSize: `${size}px`, color,
  }).setOrigin(0.5);
}

export function makeButton(scene, x, y, label, cb, opts = {}) {
  const w = opts.w || 260, h = opts.h || 56, size = opts.size || 24;
  const bg = scene.add.rectangle(x, y, w, h, opts.color ?? 0x2b2b4a, 1)
    .setStrokeStyle(2, 0x8890c8);
  const txt = scene.add.text(x, y, label, {
    fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => { bg.setFillStyle(0x3d3d6b); bg.setScale(1.04); txt.setScale(1.04); });
  bg.on('pointerout', () => { bg.setFillStyle(opts.color ?? 0x2b2b4a); bg.setScale(1); txt.setScale(1); });
  bg.on('pointerdown', () => { sfx.uiClick(); cb(); });
  return { bg, txt, destroy() { bg.destroy(); txt.destroy(); } };
}

export function makePanel(scene, x, y, w, h) {
  const dim = scene.add.rectangle(0, 0, scene.scale.width * 2, scene.scale.height * 2, 0x000000, 0.55)
    .setOrigin(0);
  const panel = scene.add.rectangle(x, y, w, h, 0x14142c, 0.97).setStrokeStyle(3, 0x8890c8);
  return { dim, panel };
}
