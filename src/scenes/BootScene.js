// Generates all textures (no asset loading) and routes to the menu — or, with
// dev URL params (?level=N&cp=K), straight into gameplay.

import { generateAll } from '../game/textures.js';
import { LEVELS } from '../levels/index.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    generateAll(this);

    const devLevel = this.registry.get('devLevel');
    const devCp = this.registry.get('devCp');
    if (devLevel && LEVELS[devLevel]) {
      this.scene.start('Game', { levelId: devLevel, startCp: devCp || null });
    } else {
      this.scene.start('Menu');
    }
  }
}
