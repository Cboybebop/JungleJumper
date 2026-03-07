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

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private focusedCharacterIndex: number | null = null;
  private frames: Phaser.GameObjects.Image[] = [];
  private nameText!: Phaser.GameObjects.Text;
  private characterSprites: Phaser.GameObjects.Image[] = [];
  private menuNavigator: MenuNavigator | null = null;

  constructor() {
    super({ key: 'CharacterSelect' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.SKY);
    this.selectedIndex = SettingsManager.selectedCharacter;

    // Background decoration
    this.add.tileSprite(GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.TRUNK_WIDTH, GAME.HEIGHT, 'trunk');
    this.add.image(60, 100, 'cloud').setScale(0.5).setAlpha(0.6);
    this.add.image(400, 150, 'cloud').setScale(0.7).setAlpha(0.5);

    // Title
    this.add.text(GAME.WIDTH / 2, 60, 'CHOOSE YOUR\nCLIMBER', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#5B3A6B',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Character grid
    const startX = GAME.WIDTH / 2 - (CHARACTERS.length - 1) * 45;
    const charY = 220;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const x = startX + i * 90;

      // Frame
      const frame = this.add.image(x, charY, 'char-frame').setInteractive({ useHandCursor: true });
      this.frames.push(frame);

      // Character sprite
      const charSprite = this.add.image(x, charY, CHARACTERS[i].key).setScale(2);
      this.characterSprites.push(charSprite);

      frame.on('pointerdown', () => {
        this.selectCharacter(i, true);
        this.menuNavigator?.setIndex(i);
      });

      frame.on('pointerover', () => {
        this.menuNavigator?.setIndex(i);
      });
    }

    // Character name
    this.nameText = this.add.text(GAME.WIDTH / 2, 300, '', {
      fontSize: '28px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#5B3A6B',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Preview area - larger character
    this.add.image(GAME.WIDTH / 2, 420, 'platform-normal').setScale(2);

    const startButton = this.createButton(GAME.WIDTH / 2, GAME.HEIGHT - 160, 'button', 'START', '24px', () => {
      AudioManager.buttonClick();
      SettingsManager.selectedCharacter = this.selectedIndex;
      this.scene.start('Game');
    });

    const backButton = this.createButton(GAME.WIDTH / 2, GAME.HEIGHT - 100, 'button-small', 'BACK', '18px', () => {
      AudioManager.buttonClick();
      this.scene.start('MainMenu');
    });

    const navItems = this.frames.map((_, index) => ({
      onFocus: () => {
        this.focusedCharacterIndex = index;
        this.selectCharacter(index, false);
      },
      onBlur: () => {
        if (this.focusedCharacterIndex === index) {
          this.focusedCharacterIndex = null;
          this.updateSelection();
        }
      },
      activate: () => {
        this.selectCharacter(index, true);
      },
    }));

    navItems.push({
      onFocus: () => this.setButtonFocused(startButton, true),
      onBlur: () => this.setButtonFocused(startButton, false),
      activate: startButton.activate,
    });

    navItems.push({
      onFocus: () => this.setButtonFocused(backButton, true),
      onBlur: () => this.setButtonFocused(backButton, false),
      activate: backButton.activate,
    });

    this.menuNavigator = new MenuNavigator(this, navItems, {
      startIndex: this.selectedIndex,
      onBack: () => {
        AudioManager.buttonClick();
        this.scene.start('MainMenu');
      },
    });

    startButton.image.on('pointerover', () => {
      this.menuNavigator?.setIndex(this.frames.length);
    });

    backButton.image.on('pointerover', () => {
      this.menuNavigator?.setIndex(this.frames.length + 1);
    });

    this.updateSelection();
  }

  private createButton(
    x: number,
    y: number,
    texture: string,
    label: string,
    fontSize: string,
    callback: () => void
  ): MenuButton {
    const image = this.add.image(x, y, texture).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontSize,
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

  private selectCharacter(index: number, playSound: boolean): void {
    this.selectedIndex = index;
    if (playSound) {
      AudioManager.buttonClick();
    }
    this.updateSelection();
  }

  private updateSelection(): void {
    for (let i = 0; i < this.frames.length; i++) {
      const isSelected = i === this.selectedIndex;
      const isFocused = i === this.focusedCharacterIndex;

      this.frames[i].setTexture(isSelected ? 'char-frame-selected' : 'char-frame');
      if (isFocused) {
        this.frames[i].setTint(0xD8ECFF);
      } else {
        this.frames[i].clearTint();
      }

      const baseScale = isSelected ? 2.3 : 2;
      this.characterSprites[i].setScale(isFocused ? baseScale + 0.1 : baseScale);
    }

    this.nameText.setText(CHARACTERS[this.selectedIndex].name);
  }

  private setButtonFocused(button: MenuButton, focused: boolean): void {
    if (focused) {
      button.image.setTint(0xD8ECFF);
      button.text.setScale(1.05);
    } else {
      button.image.clearTint();
      button.text.setScale(1);
    }
  }
}
