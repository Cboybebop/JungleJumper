import Phaser from 'phaser';
import { GAME, CHARACTERS } from '../constants';
import { TextureGenerator } from '../graphics/TextureGenerator';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import { registerAnimations } from '../graphics/AnimationRegistry';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    for (const character of CHARACTERS) {
      this.load.spritesheet(character.texture, `assets/characters/${character.key}/${character.key}-actions.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
      this.load.image(character.portrait, `assets/characters/${character.key}/${character.key}-portrait.png`);
    }
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
