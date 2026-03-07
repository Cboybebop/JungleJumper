import Phaser from 'phaser';
import { COLORS, GAME } from '../constants';
import { TextureGenerator } from '../graphics/TextureGenerator';
import { SettingsManager } from '../systems/SettingsManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    SettingsManager.init();

    // Loading text
    const text = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Generate all textures programmatically
    TextureGenerator.generate(this);

    // Transition to menu
    this.time.delayedCall(300, () => {
      text.destroy();
      this.scene.start('MainMenu');
    });
  }
}
