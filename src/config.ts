import Phaser from 'phaser';
import { GAME } from './constants';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameScene } from './scenes/GameScene';
import { GameUIScene } from './scenes/GameUIScene';
import { GameOverScene } from './scenes/GameOverScene';

function getRendererType(): number {
  if (typeof window === 'undefined') {
    return Phaser.CANVAS;
  }

  const renderer = new URLSearchParams(window.location.search).get('renderer');

  if (renderer === 'webgl') {
    return Phaser.WEBGL;
  }

  if (renderer === 'auto') {
    return Phaser.AUTO;
  }

  return Phaser.CANVAS;
}

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: getRendererType(),
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    audio: {
      noAudio: true,
    },
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
        width: Math.max(720, GAME.WIDTH),
        height: Math.max(1280, GAME.HEIGHT),
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
}
