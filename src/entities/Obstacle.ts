import Phaser from 'phaser';
import { GAME } from '../constants';
import { ObstacleType } from '../systems/LevelGenerator';

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  obstacleType: ObstacleType;
  private moveSpeed = 0;
  private moveRange = 0;
  private motionOriginX = 0;
  private warningSprite: Phaser.GameObjects.Image | null = null;
  private dropping = false;
  private dropTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: ObstacleType) {
    super(scene, x, y, type === 'thorns' ? 'thorns' : type);

    this.obstacleType = type;
    scene.add.existing(this);
    scene.physics.add.existing(this, type !== 'coconut'); // Coconuts are dynamic

    this.setDepth(6);

    switch (type) {
      case 'snake':
        this.setSize(40, 16);
        this.moveSpeed = 0.8 + Math.random() * 0.8;
        this.moveRange = 25 + Math.random() * 20;
        this.motionOriginX = x;
        break;

      case 'coconut':
        this.setSize(20, 20);
        this.setupCoconutDrop(scene);
        break;

      case 'thorns':
        this.setSize(36, 16);
        break;

      case 'bat':
        this.setSize(28, 16);
        this.moveSpeed = 1.5 + Math.random();
        this.motionOriginX = x;
        this.moveRange = GAME.WIDTH * 0.4;
        break;
    }
  }

  private setupCoconutDrop(scene: Phaser.Scene): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    // Show warning first
    this.warningSprite = scene.add.image(this.x, this.y - 20, 'warning');
    this.warningSprite.setDepth(7);

    // Blink warning
    scene.tweens.add({
      targets: this.warningSprite,
      alpha: 0.3,
      yoyo: true,
      repeat: 3,
      duration: 200,
      onComplete: () => {
        this.warningSprite?.destroy();
        this.warningSprite = null;
        this.dropping = true;
        body.setAllowGravity(true);
        body.setVelocityY(150);
      },
    });
  }

  updateObstacle(): void {
    switch (this.obstacleType) {
      case 'snake': {
        const body = this.body as Phaser.Physics.Arcade.StaticBody;
        this.x = this.motionOriginX + Math.sin(this.scene.time.now * 0.002 * this.moveSpeed) * this.moveRange;
        body.updateFromGameObject();
        break;
      }

      case 'bat': {
        const body = this.body as Phaser.Physics.Arcade.StaticBody;
        this.x = this.motionOriginX + Math.sin(this.scene.time.now * 0.001 * this.moveSpeed) * this.moveRange;
        this.y += Math.sin(this.scene.time.now * 0.003) * 0.3;
        body.updateFromGameObject();
        // Wing flap
        this.setScale(1, 0.8 + Math.sin(this.scene.time.now * 0.01) * 0.2);
        break;
      }
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.warningSprite) {
      this.warningSprite.destroy();
    }
    if (this.dropTimer) {
      this.dropTimer.destroy();
    }
    super.destroy(fromScene);
  }
}
