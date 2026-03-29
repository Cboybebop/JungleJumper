import Phaser from 'phaser';
import { COLORS, GAME, CHARACTERS } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import { MenuNavigator } from '../systems/MenuNavigator';

interface MenuButton {
  image: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  activate: () => void;
}

export class MainMenuScene extends Phaser.Scene {
  private menuNavigator: MenuNavigator | null = null;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.SKY);

    // Decorative clouds
    this.add.image(80, 120, 'cloud').setScale(0.6).setAlpha(0.7);
    this.add.image(380, 80, 'cloud').setScale(0.8).setAlpha(0.6);
    this.add.image(200, 200, 'cloud').setScale(0.5).setAlpha(0.8);

    // Jungle trees on sides
    this.add.image(-5, GAME.HEIGHT - 60, 'jungle-tree').setOrigin(0, 1).setScale(1.2);
    this.add.image(GAME.WIDTH + 5, GAME.HEIGHT - 60, 'jungle-tree').setOrigin(1, 1).setScale(1.2).setFlipX(true);

    // Trunk in center
    this.add.tileSprite(GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.TRUNK_WIDTH, GAME.HEIGHT, 'trunk');

    // Some decorative platforms
    this.add.image(120, 350, 'platform-normal').setScale(1.2);
    this.add.image(360, 280, 'platform-normal').setScale(1.2);
    this.add.image(200, 500, 'platform-normal').setScale(1);

    // Characters on platforms
    const charKeys = CHARACTERS.map(c => c.key);
    this.add.image(120, 330, charKeys[0]).setScale(1.5);
    this.add.image(360, 260, charKeys[1]).setScale(1.5);

    // Title
    const title = this.add.text(GAME.WIDTH / 2, 100, 'JUNGLE\nJUMPER', {
      fontSize: '56px',
      color: '#FFFFFF',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#5B3A6B',
      strokeThickness: 8,
      shadow: { offsetX: 3, offsetY: 3, color: '#3A1A4B', blur: 5, fill: true },
    }).setOrigin(0.5).setDepth(100);

    // Bounce the title
    this.tweens.add({
      targets: title,
      y: 108,
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut',
    });

    // Flowers
    this.add.image(60, 160, 'flower').setScale(1.2);
    this.add.image(420, 140, 'flower').setScale(1.0);
    this.add.image(240, 60, 'strawberry').setScale(1.5);

    // High score
    const highScore = SettingsManager.getHighScore();
    if (highScore > 0) {
      this.add.text(GAME.WIDTH / 2, 200, `Best: ${highScore}m`, {
        fontSize: '18px',
        color: '#F1C40F',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#5B3A6B',
        strokeThickness: 3,
      }).setOrigin(0.5);
    }

    const playButton = this.createButton(GAME.WIDTH / 2, GAME.HEIGHT - 250, 'PLAY', () => {
      AudioManager.buttonClick();
      this.scene.start('CharacterSelect');
    });

    const settingsButton = this.createButton(GAME.WIDTH / 2, GAME.HEIGHT - 180, 'SETTINGS', () => {
      AudioManager.buttonClick();
      this.scene.start('Settings');
    });

    const buttons = [playButton, settingsButton];
    this.menuNavigator = new MenuNavigator(this, buttons.map(button => ({
      onFocus: () => this.setButtonFocused(button, true),
      onBlur: () => this.setButtonFocused(button, false),
      activate: button.activate,
    })));

    buttons.forEach((button, index) => {
      button.image.on('pointerover', () => {
        this.menuNavigator?.setIndex(index);
      });
    });

    // Version text
    this.add.text(GAME.WIDTH / 2, GAME.HEIGHT - 20, 'v1.0', {
      fontSize: '12px',
      color: '#5B3A6B',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): MenuButton {
    const image = this.add.image(x, y, 'button').setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    image.on('pointerdown', callback);

    return {
      image,
      text,
      activate: callback,
    };
  }

  private setButtonFocused(button: MenuButton, focused: boolean): void {
    if (focused) {
      button.image.setTint(0xE6F7EE);
      button.text.setScale(1.05);
    } else {
      button.image.clearTint();
      button.text.setScale(1);
    }
  }
}
