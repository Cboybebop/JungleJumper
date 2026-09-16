import Phaser from 'phaser';
import { createGameConfig } from './config';
import { SettingsManager } from './systems/SettingsManager';
import { GAME } from './constants';

SettingsManager.applyAutoDisplaySettings();
if (import.meta.env.DEV && new URLSearchParams(location.search).has('gallery')) {
  GAME.WIDTH = 480;
  GAME.HEIGHT = 800;
}

const game = new Phaser.Game(createGameConfig());
// Explicit opt-in test handle, removed from production builds.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa')) {
  Object.assign(window, { __visualQA: game });
}
