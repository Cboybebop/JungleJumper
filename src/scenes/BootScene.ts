import Phaser from 'phaser';
import { GAME } from '../constants';
import { TextureGenerator } from '../graphics/TextureGenerator';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import { MIKO_TEXTURE, registerAnimations } from '../graphics/AnimationRegistry';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    // The separately named key lets Player fall back to the generated `monkey`
    // texture when this production sheet cannot be decoded or fetched.
    this.load.spritesheet(MIKO_TEXTURE, 'assets/characters/miko/miko-actions.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create(): void {
    SettingsManager.init();
    AudioManager.armUnlock();

    // Loading text
    const text = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Generate all textures programmatically
    TextureGenerator.generate(this);
    registerAnimations(this);

    // Transition to menu
    this.time.delayedCall(300, () => {
      text.destroy();
      this.scene.start('MainMenu');
    });
  }
}
