import Phaser from 'phaser';
import { COLORS, GAME, CHARACTERS } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { MenuNavigator } from '../systems/MenuNavigator';
import { UIFactory } from '../ui/UIFactory';

export class MainMenuScene extends Phaser.Scene {
  private menuNavigator: MenuNavigator | null = null;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    const ui = new UIFactory(this);
    const compact = GAME.HEIGHT < 620;
    this.cameras.main.setBackgroundColor(COLORS.SKY);

    // Decorative clouds
    this.add.image(80, 120, 'world-cloud').setScale(0.6).setAlpha(0.7);
    this.add.image(380, 80, 'world-cloud').setScale(0.8).setAlpha(0.6);
    this.add.image(200, 200, 'world-cloud').setScale(0.5).setAlpha(0.8);

    // Jungle trees on sides
    this.add.image(-5, GAME.HEIGHT - 60, 'world-jungle-silhouette').setOrigin(0, 1).setScale(1.2);
    this.add.image(GAME.WIDTH + 5, GAME.HEIGHT - 60, 'world-jungle-silhouette').setOrigin(1, 1).setScale(1.2).setFlipX(true);

    // Trunk in center
    this.add.tileSprite(GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.TRUNK_WIDTH, GAME.HEIGHT, 'world-trunk-0');

    // Some decorative platforms
    this.add.image(120, 350, 'platform-normal', 0).setScale(1.2);
    this.add.image(360, 280, 'platform-normal', 2).setScale(1.2);
    this.add.image(200, 500, 'platform-normal', 3).setScale(1);

    // Characters on platforms
    const charKeys = CHARACTERS.map(c => c.key);
    this.add.image(120, 330, charKeys[0]).setScale(1.5);
    this.add.image(360, 260, charKeys[1]).setScale(1.5);

    // Title
    const title = ui.text(GAME.WIDTH / 2, compact ? 72 : 100, 'JUNGLE\nJUMPER', {
      fontSize: `${Math.min(56, Math.max(34, GAME.WIDTH / 8))}px`,
      color: '#FFFFFF',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#5B3A6B',
      strokeThickness: 8,
      shadow: { offsetX: 3, offsetY: 3, color: '#3A1A4B', blur: 5, fill: true },
    }).setOrigin(0.5).setDepth(100);

    // Bounce the title
    const titleRestY = title.y;
    this.tweens.add({
      targets: title,
      y: titleRestY + (compact ? 4 : 8),
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut',
    });

    // Flowers
    this.add.image(60, 160, 'world-flower-pink').setScale(1.2);
    this.add.image(420, 140, 'world-flower-gold').setScale(1.0);
    this.add.image(240, 60, 'world-fruit-berries').setScale(1.5);

    // High score
    const highScore = SettingsManager.getHighScore();
    if (highScore > 0) {
      ui.scorePlaque(GAME.WIDTH / 2, compact ? 154 : 200);
      ui.text(GAME.WIDTH / 2, compact ? 154 : 200, `BEST ${highScore}M`, {
        fontSize: '14px',
        color: '#F1C40F',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    const firstButtonY = compact ? GAME.HEIGHT - 185 : GAME.HEIGHT - 250;
    const playButton = ui.button(GAME.WIDTH / 2, firstButtonY, 'PLAY', {
      onActivate: () => this.scene.start('CharacterSelect'),
    });

    const settingsButton = ui.button(GAME.WIDTH / 2, firstButtonY + 70, 'SETTINGS', {
      onActivate: () => this.scene.start('Settings'),
    });

    const buttons = [playButton, settingsButton];
    this.menuNavigator = new MenuNavigator(this, buttons.map(button => ({
      onFocus: () => button.setFocused(true),
      onBlur: () => button.setFocused(false),
      activate: button.activate,
    })));

    buttons.forEach((button, index) => {
      button.image.on('pointerover', () => {
        this.menuNavigator?.setIndex(index);
      });
    });

    // Version text
    ui.text(GAME.WIDTH / 2, GAME.HEIGHT - 20, 'v1.0', {
      fontSize: '12px',
      color: '#5B3A6B',
    }).setOrigin(0.5);
  }
}
