import Phaser from 'phaser';
import { GAME } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import { MenuNavigator } from '../systems/MenuNavigator';

interface MenuButton {
  image: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  activate: () => void;
}

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  private menuNavigator: MenuNavigator | null = null;

  constructor() {
    super({ key: 'GameOver' });
  }

  init(data: { score: number }): void {
    this.finalScore = data?.score ?? 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x1A1A2E);

    // Save high score
    SettingsManager.setHighScore(this.finalScore);
    const highScore = SettingsManager.getHighScore();
    const isNewBest = this.finalScore >= highScore;

    // Game over title
    this.add.text(GAME.WIDTH / 2, 120, 'GAME\nOVER', {
      fontSize: '56px',
      color: '#E74C3C',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Score
    this.add.text(GAME.WIDTH / 2, 280, `${this.finalScore}m`, {
      fontSize: '48px',
      color: '#F1C40F',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME.WIDTH / 2, 320, 'HEIGHT REACHED', {
      fontSize: '16px',
      color: '#95A5A6',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // High score
    if (isNewBest) {
      const newBestText = this.add.text(GAME.WIDTH / 2, 370, 'NEW BEST!', {
        fontSize: '28px',
        color: '#2ECC71',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      this.tweens.add({
        targets: newBestText,
        scale: 1.2,
        yoyo: true,
        repeat: -1,
        duration: 500,
      });
    } else {
      this.add.text(GAME.WIDTH / 2, 370, `Best: ${highScore}m`, {
        fontSize: '20px',
        color: '#7F8C8D',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    const playAgainButton = this.createButton(GAME.WIDTH / 2, GAME.HEIGHT - 200, 'PLAY AGAIN', () => {
      AudioManager.buttonClick();
      this.scene.start('CharacterSelect');
    });

    const mainMenuButton = this.createButton(GAME.WIDTH / 2, GAME.HEIGHT - 130, 'MAIN MENU', () => {
      AudioManager.buttonClick();
      this.scene.start('MainMenu');
    });

    const buttons = [playAgainButton, mainMenuButton];
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

    // Decorative elements
    this.add.image(80, GAME.HEIGHT - 50, 'jungle-tree').setScale(0.6).setAlpha(0.3);
    this.add.image(GAME.WIDTH - 80, GAME.HEIGHT - 50, 'jungle-tree').setScale(0.6).setAlpha(0.3).setFlipX(true);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): MenuButton {
    const image = this.add.image(x, y, 'button').setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontSize: '20px',
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
      button.image.setTint(0xF6E8D0);
      button.text.setScale(1.05);
    } else {
      button.image.clearTint();
      button.text.setScale(1);
    }
  }
}
