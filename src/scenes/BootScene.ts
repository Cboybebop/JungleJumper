import Phaser from 'phaser';
import { GAME, CHARACTERS } from '../constants';
import { TextureGenerator } from '../graphics/TextureGenerator';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import {
  EFFECT_TEXTURES,
  ENEMY_TEXTURES,
  registerAnimations,
} from '../graphics/AnimationRegistry';
import {
  BACKGROUND_IMAGE_ASSETS,
  PLATFORM_FRAME_HEIGHT,
  PLATFORM_FRAME_WIDTH,
  PLATFORM_TEXTURES,
  WORLD_IMAGE_ASSETS,
} from '../graphics/WorldAssets';
import { UIFactory, UI_FONT } from '../ui/UIFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    UIFactory.preload(this);

    for (const character of CHARACTERS) {
      this.load.spritesheet(character.texture, `assets/characters/${character.key}/${character.key}-actions.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
      this.load.image(character.portrait, `assets/characters/${character.key}/${character.key}-portrait.png`);
    }

    for (const textureKey of PLATFORM_TEXTURES) {
      this.load.spritesheet(textureKey, `assets/world/${textureKey}.png`, {
        frameWidth: PLATFORM_FRAME_WIDTH,
        frameHeight: PLATFORM_FRAME_HEIGHT,
      });
    }

    for (const [textureKey, filename] of WORLD_IMAGE_ASSETS) {
      this.load.image(textureKey, `assets/world/${filename}`);
    }

    for (const [textureKey, filename] of BACKGROUND_IMAGE_ASSETS) {
      this.load.image(textureKey, `assets/backgrounds/${filename}`);
    }

    for (const [type, textureKey] of Object.entries(ENEMY_TEXTURES)) {
      const filename = type === 'thorns' ? 'thorn-vine-actions.png' : `${type}-actions.png`;
      this.load.spritesheet(textureKey, `assets/enemies/${filename}`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }

    const effectSheets = [
      [EFFECT_TEXTURES.shieldIdle, 'shield-idle.png', 16],
      [EFFECT_TEXTURES.shieldPickupBurst, 'shield-pickup-burst.png', 32],
      [EFFECT_TEXTURES.shieldShell, 'shield-shell.png', 64],
      [EFFECT_TEXTURES.warning, 'warning-indicator.png', 16],
      [EFFECT_TEXTURES.impact, 'impact-burst.png', 32],
      [EFFECT_TEXTURES.damageFlash, 'damage-flash.png', 32],
    ] as const;
    for (const [textureKey, filename, frameSize] of effectSheets) {
      this.load.spritesheet(textureKey, `assets/effects/${filename}`, {
        frameWidth: frameSize,
        frameHeight: frameSize,
      });
    }
  }

  create(): void {
    SettingsManager.init();
    AudioManager.armUnlock();

    // Loading text
    const text = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: UI_FONT,
    }).setOrigin(0.5);

    // Generate UI, obstacle, character, and development/loading fallbacks.
    TextureGenerator.generate(this);
    registerAnimations(this);

    const begin = () => {
      if (!this.sys.isActive()) return;
      text.destroy();
      this.scene.start('MainMenu');
    };

    if (typeof document !== 'undefined' && document.fonts) {
      void Promise.all([
        document.fonts.load(`16px ${UI_FONT}`),
        document.fonts.load(`bold 16px ${UI_FONT}`),
      ]).finally(() => this.time.delayedCall(100, begin));
    } else {
      this.time.delayedCall(300, begin);
    }
  }
}
