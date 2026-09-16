import Phaser from 'phaser';
import { SceneTransition } from '../ui/SceneTransition';
import { COLORS, GAME, CHARACTERS } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import { MenuNavigator } from '../systems/MenuNavigator';
import { getAnimationKey } from '../graphics/AnimationRegistry';
import { UIFactory } from '../ui/UIFactory';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private focusedCharacterIndex: number | null = null;
  private frames: Phaser.GameObjects.Image[] = [];
  private nameText!: Phaser.GameObjects.Text;
  private characterSprites: Phaser.GameObjects.Sprite[] = [];
  private portrait!: Phaser.GameObjects.Image;
  private menuNavigator: MenuNavigator | null = null;

  constructor() {
    super({ key: 'CharacterSelect' });
  }

  create(): void {
    SceneTransition.install(this);
    const ui = new UIFactory(this);
    const compact = GAME.HEIGHT < 620 || GAME.WIDTH < 440;
    this.cameras.main.setBackgroundColor(COLORS.SKY);
    this.selectedIndex = SettingsManager.selectedCharacter;
    this.focusedCharacterIndex = null;
    this.frames = [];
    this.characterSprites = [];

    this.menuNavigator?.destroy();
    this.menuNavigator = null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    // Background decoration
    this.add.tileSprite(GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.TRUNK_WIDTH, GAME.HEIGHT, 'world-trunk-0');
    this.add.image(60, 100, 'world-cloud').setScale(1).setAlpha(0.6);
    this.add.image(400, 150, 'world-cloud').setScale(1).setAlpha(0.5);

    // Title
    ui.text(GAME.WIDTH / 2, compact ? 42 : 60, 'CHOOSE YOUR\nCLIMBER', {
      fontSize: compact ? '22px' : '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#5B3A6B',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Character grid
    const columns = compact ? 3 : CHARACTERS.length;
    const spacingX = compact ? 86 : 90;
    const startY = compact ? 112 : 220;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const row = Math.floor(i / columns);
      const column = i % columns;
      const rowCount = Math.min(columns, CHARACTERS.length - row * columns);
      const x = GAME.WIDTH / 2 + (column - (rowCount - 1) / 2) * spacingX;
      const y = startY + row * 86;

      // Frame
      const frame = ui.selectionFrame(x, y).setInteractive({ useHandCursor: true });
      this.frames.push(frame);

      // Character sprite
      const character = CHARACTERS[i];
      const characterTexture = this.textures.exists(character.texture) ? character.texture : character.key;
      const charSprite = this.add.sprite(x, y, characterTexture, 0).setScale(2);
      if (this.textures.exists(character.texture)) charSprite.play(getAnimationKey(character, 'idle'));
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
    const nameY = compact ? 282 : 300;
    this.nameText = ui.text(GAME.WIDTH / 2, nameY, '', {
      fontSize: compact ? '20px' : '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#5B3A6B',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Preview area - larger character
    const portraitY = compact ? 325 : 400;
    this.portrait = this.add.image(GAME.WIDTH / 2, portraitY, CHARACTERS[this.selectedIndex].portrait)
      .setScale(1);
    if (!compact) this.add.image(GAME.WIDTH / 2, 440, 'platform-normal', 1).setScale(2);

    const startButton = ui.button(GAME.WIDTH / 2, GAME.HEIGHT - (compact ? 110 : 160), 'START', {
      fontSize: compact ? 16 : 18,
      onActivate: () => {
        if (SceneTransition.isBusy(this)) return;
        SettingsManager.selectedCharacter = this.selectedIndex;
        SceneTransition.start(this, 'Game');
      },
    });

    const backButton = ui.button(GAME.WIDTH / 2, GAME.HEIGHT - 50, 'BACK', {
      size: 'small',
      onActivate: () => SceneTransition.start(this, 'MainMenu', {}, 'palette'),
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
      onFocus: () => startButton.setFocused(true),
      onBlur: () => startButton.setFocused(false),
      activate: startButton.activate,
    });

    navItems.push({
      onFocus: () => backButton.setFocused(true),
      onBlur: () => backButton.setFocused(false),
      activate: backButton.activate,
    });

    this.menuNavigator = new MenuNavigator(this, navItems, {
      startIndex: this.selectedIndex,
      onBack: () => {
        AudioManager.buttonClick();
        SceneTransition.start(this, 'MainMenu', {}, 'palette');
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

  private selectCharacter(index: number, playSound: boolean): void {
    if (SceneTransition.isBusy(this)) return;
    this.selectedIndex = index;
    if (playSound) {
      AudioManager.buttonClick();
    }
    this.updateSelection();
  }

  private updateSelection(): void {
    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i];
      const charSprite = this.characterSprites[i];
      if (!frame?.scene || !charSprite?.scene) {
        continue;
      }

      const isSelected = i === this.selectedIndex;
      const isFocused = i === this.focusedCharacterIndex;

      frame.setTexture(isFocused
        ? 'ui-selection-frame-focused'
        : isSelected ? 'ui-selection-frame-selected' : 'ui-selection-frame-normal');

      charSprite.setScale(2);
      const character = CHARACTERS[i];
      if (this.textures.exists(character.texture)) {
        const state = isSelected ? 'celebration' : 'idle';
        const targetAnimation = getAnimationKey(character, state);
        if (charSprite.anims.currentAnim?.key !== targetAnimation) charSprite.play(targetAnimation);
      }
    }

    if (this.nameText?.scene) this.nameText.setText(CHARACTERS[this.selectedIndex].name);
    if (this.portrait?.scene) this.portrait.setTexture(CHARACTERS[this.selectedIndex].portrait);
  }

  private cleanup(): void {
    this.menuNavigator?.destroy();
    this.menuNavigator = null;
    this.frames = [];
    this.characterSprites = [];
    this.focusedCharacterIndex = null;
  }
}
