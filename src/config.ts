import Phaser from 'phaser';
import { GAME } from './constants';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameScene } from './scenes/GameScene';
import { GameUIScene } from './scenes/GameUIScene';
import { GameOverScene } from './scenes/GameOverScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  parent: 'game-container',
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GAME.GRAVITY },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 320,
      height: 480,
    },
    max: {
      width: 720,
      height: 1280,
    },
  },
  input: {
    gamepad: true,
  },
  scene: [
    BootScene,
    MainMenuScene,
    CharacterSelectScene,
    SettingsScene,
    GameScene,
    GameUIScene,
    GameOverScene,
  ],
};
