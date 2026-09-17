import Phaser from 'phaser';
import { SceneTransition } from '../ui/SceneTransition';
import { COLORS, GAME } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { MenuNavigator } from '../systems/MenuNavigator';
import { UIFactory } from '../ui/UIFactory';
import { MenuBackdrop } from '../ui/MenuBackdrop';

export class MainMenuScene extends Phaser.Scene {
  private menuNavigator: MenuNavigator | null = null;
  private backdrop: MenuBackdrop | null = null;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    SceneTransition.install(this);
    const ui = new UIFactory(this);
    const compact = GAME.HEIGHT < 620;
    this.cameras.main.setBackgroundColor(COLORS.SKY);

    this.backdrop = new MenuBackdrop(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.backdrop = null;
      this.menuNavigator = null;
    });

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
    if (!SettingsManager.getReducedMotion()) this.tweens.add({
      targets: title,
      y: titleRestY + (compact ? 4 : 8),
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut',
    });

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
      onActivate: () => SceneTransition.start(this, 'CharacterSelect'),
    });

    const settingsButton = ui.button(GAME.WIDTH / 2, firstButtonY + 70, 'SETTINGS', {
      onActivate: () => SceneTransition.start(this, 'Settings', {}, 'palette'),
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

  update(_time: number, delta: number): void {
    this.backdrop?.update(delta);
  }
}
