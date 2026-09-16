import Phaser from 'phaser';
import { GAME, CHARACTERS } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { MenuNavigator } from '../systems/MenuNavigator';
import { UIFactory } from '../ui/UIFactory';

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  private menuNavigator: MenuNavigator | null = null;
  private transitioning = false;

  constructor() {
    super({ key: 'GameOver' });
  }

  init(data: { score: number }): void {
    this.finalScore = data?.score ?? 0;
  }

  create(): void {
    const ui = new UIFactory(this);
    const compact = GAME.HEIGHT < 620;
    this.transitioning = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    this.cameras.main.setBackgroundColor(0x1A1A2E);

    // Save high score
    SettingsManager.setHighScore(this.finalScore);
    const highScore = SettingsManager.getHighScore();
    const isNewBest = this.finalScore >= highScore;

    // Game over title
    ui.text(GAME.WIDTH / 2, compact ? 70 : 120, 'GAME\nOVER', {
      fontSize: compact ? '36px' : '52px',
      color: '#E74C3C',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Score
    const scoreY = compact ? 175 : 280;
    ui.scorePlaque(GAME.WIDTH / 2, scoreY);
    ui.text(GAME.WIDTH / 2, scoreY, `${this.finalScore}M`, {
      fontSize: compact ? '24px' : '32px',
      color: '#F1C40F',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    ui.text(GAME.WIDTH / 2, compact ? 210 : 320, 'HEIGHT REACHED', {
      fontSize: compact ? '10px' : '13px',
      color: '#95A5A6',
    }).setOrigin(0.5);

    const character = CHARACTERS[SettingsManager.selectedCharacter] ?? CHARACTERS[0];
    this.add.image(GAME.WIDTH / 2, compact ? 300 : 445, character.portrait).setScale(compact ? 0.75 : 1);

    // High score
    if (isNewBest) {
      const newBestText = ui.text(GAME.WIDTH / 2, compact ? 245 : 370, 'NEW BEST!', {
        fontSize: compact ? '16px' : '22px',
        color: '#2ECC71',
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
      ui.text(GAME.WIDTH / 2, compact ? 245 : 370, `BEST ${highScore}M`, {
        fontSize: compact ? '12px' : '16px',
        color: '#7F8C8D',
      }).setOrigin(0.5);
    }

    const playAgainButton = ui.button(GAME.WIDTH / 2, GAME.HEIGHT - (compact ? 120 : 200), 'PLAY AGAIN', {
      fontSize: compact ? 14 : 17,
      onActivate: () => this.transitionTo('CharacterSelect'),
    });

    const mainMenuButton = ui.button(GAME.WIDTH / 2, GAME.HEIGHT - (compact ? 55 : 130), 'MAIN MENU', {
      fontSize: compact ? 14 : 17,
      onActivate: () => this.transitionTo('MainMenu'),
    });

    const buttons = [playAgainButton, mainMenuButton];
    this.menuNavigator = new MenuNavigator(this, buttons.map((button) => ({
      onFocus: () => button.setFocused(true),
      onBlur: () => button.setFocused(false),
      activate: button.activate,
    })));

    buttons.forEach((button, index) => {
      button.image.on('pointerover', () => {
        this.menuNavigator?.setIndex(index);
      });
    });

    // Decorative elements
    this.add.image(80, GAME.HEIGHT - 50, 'world-jungle-silhouette').setScale(0.6).setAlpha(0.3);
    this.add.image(GAME.WIDTH - 80, GAME.HEIGHT - 50, 'world-jungle-silhouette').setScale(0.6).setAlpha(0.3).setFlipX(true);
  }

  private transitionTo(sceneKey: string): void {
    if (this.transitioning || !this.sys.isActive()) {
      return;
    }

    this.transitioning = true;
    this.menuNavigator?.destroy();
    this.menuNavigator = null;

    const scenePlugin = (this as unknown as { scene?: Phaser.Scenes.ScenePlugin }).scene;
    if (!scenePlugin) {
      return;
    }

    scenePlugin.start(sceneKey);
  }

  private cleanup(): void {
    this.menuNavigator?.destroy();
    this.menuNavigator = null;
    this.transitioning = false;
  }
}
