import Phaser from 'phaser';
import { createGameConfig } from './config';
import { SettingsManager } from './systems/SettingsManager';

SettingsManager.applyAutoDisplaySettings();

new Phaser.Game(createGameConfig());
