import Phaser from 'phaser';
import { GAME } from '../constants';

export class GameUIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private gameScene!: Phaser.Scene;

  constructor() {
    super({ key: 'GameUI' });
  }

  init(data: { gameScene: Phaser.Scene }): void {
    this.gameScene = data.gameScene;
  }

  create(): void {
    // Score display
    this.scoreText = this.add.text(GAME.WIDTH / 2, 20, '0m', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);

    // Pause button (top right)
    const pauseBtn = this.add.text(GAME.WIDTH - 15, 15, '||', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    pauseBtn.on('pointerdown', () => {
      const game = this.scene.get('Game') as any;
      if (game.togglePause) game.togglePause();
    });
  }

  update(): void {
    const game = this.gameScene as any;
    if (game.getScore) {
      this.scoreText.setText(`${game.getScore()}m`);
    }
  }
}
