import Phaser from 'phaser';
import { SceneTransition } from '../ui/SceneTransition';
import { GAME, CHARACTERS } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { MenuNavigator } from '../systems/MenuNavigator';
import { getAnimationKey } from '../graphics/AnimationRegistry';
import { getRunProgress } from '../ui/RunProgress';
import { UIFactory } from '../ui/UIFactory';

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
    SceneTransition.install(this);
    const ui = new UIFactory(this);
    const compact = GAME.HEIGHT < 620;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    this.cameras.main.setBackgroundColor(0x1A1A2E);

    // Save high score
    const previousBest = SettingsManager.getHighScore();
    SettingsManager.setHighScore(this.finalScore);
    const highScore = SettingsManager.getHighScore();
    const isNewBest = this.finalScore > previousBest;

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
    const scoreText = ui.text(GAME.WIDTH / 2, scoreY, `${SettingsManager.getReducedMotion() ? this.finalScore : 0}M`, {
      fontSize: compact ? '24px' : '32px',
      color: '#F1C40F',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    if (!SettingsManager.getReducedMotion()) {
      const counter = { height: 0 };
      this.tweens.add({ targets: counter, height: this.finalScore, duration: 420, ease: 'Cubic.easeOut',
        onUpdate: () => scoreText.setText(`${Math.floor(counter.height)}M`),
        onComplete: () => scoreText.setText(`${this.finalScore}M`),
      });
    }
    const progress = getRunProgress(this.finalScore);
    ui.text(GAME.WIDTH / 2, compact ? 210 : 320, `${progress.biome.label.toUpperCase()} / ${progress.milestones} MILESTONE${progress.milestones === 1 ? '' : 'S'}`, {
      fontSize: compact ? '8px' : '10px',
      color: '#95A5A6',
    }).setOrigin(0.5);

    const character = CHARACTERS[SettingsManager.selectedCharacter] ?? CHARACTERS[0];
    const resultY = compact ? 284 : 435;
    const result = this.add.sprite(GAME.WIDTH / 2, resultY,
      this.textures.exists(character.texture) ? character.texture : character.key).setScale(compact ? 1.75 : 3);
    const animation = getAnimationKey(character, isNewBest ? 'celebration' : 'defeat');
    if (this.anims.exists(animation)) {
      result.play(animation);
      if (SettingsManager.getReducedMotion()) result.anims.pause();
    }
    ui.text(GAME.WIDTH / 2, resultY + (compact ? 38 : 54), character.name.toUpperCase(), {
      fontSize: '10px', color: '#FFE6A3',
    }).setOrigin(0.5);

    // High score
    if (isNewBest) {
      const newBestText = ui.text(GAME.WIDTH / 2, compact ? 245 : 370, `NEW BEST! +${this.finalScore - previousBest}M`, {
        fontSize: compact ? '12px' : '16px',
        color: '#2ECC71',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      if (!SettingsManager.getReducedMotion()) this.tweens.add({
        targets: newBestText,
        scale: 1.06,
        yoyo: true,
        repeat: 0,
        duration: 180,
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
    SceneTransition.start(this, sceneKey);
  }

  private cleanup(): void {
    this.menuNavigator?.destroy();
    this.menuNavigator = null;
  }
}
