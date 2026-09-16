import Phaser from 'phaser';
import { GAME } from '../constants';
import { UIFactory } from '../ui/UIFactory';
import { getSafeArea } from '../ui/SafeArea';

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
    const ui = new UIFactory(this);
    const safe = getSafeArea(this, 12);
    const scoreY = safe.top + 21;
    ui.scorePlaque(GAME.WIDTH / 2, scoreY).setDepth(100);
    this.scoreText = ui.text(GAME.WIDTH / 2, scoreY, '0M', {
      fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    ui.pauseButton(GAME.WIDTH - safe.right - 18, safe.top + 18, () => {
      const game = this.scene.get('Game') as any;
      if (game.togglePause) game.togglePause();
    }).setDepth(102);
  }

  update(): void {
    const game = this.gameScene as any;
    if (game.getScore) {
      this.scoreText.setText(`${game.getScore()}M`);
    }
  }
}
