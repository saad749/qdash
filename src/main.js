// Game bootstrap. Phaser is loaded globally by index.html (lib/phaser.min.js).

import { GAME_W, GAME_H } from './constants.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { PlayerScene } from './scenes/PlayerScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HudScene } from './scenes/HudScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';

const params = new URLSearchParams(location.search);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0a0a18',
  dom: { createContainer: true },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, fps: 60, fixedStep: true, debug: false },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [
    BootScene, MenuScene, PlayerScene, LevelSelectScene,
    GameScene, HudScene, PauseScene, LevelCompleteScene, LeaderboardScene,
  ],
});

// Dev conveniences: window.game for console/automation access (tools/autoplay.js),
// ?level=3 jumps into level 3, ?level=test opens the tuning sandbox, ?cp=4 spawns
// at checkpoint 4.
window.game = game;
const levelParam = params.get('level');
if (levelParam) {
  game.registry.set('devLevel', levelParam === 'test' ? 'test' : parseInt(levelParam, 10) || null);
}
const cpParam = parseInt(params.get('cp') || '', 10);
if (cpParam >= 1 && cpParam <= 5) game.registry.set('devCp', cpParam);
