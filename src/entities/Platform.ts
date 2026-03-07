import Phaser from 'phaser';
import { GAME } from '../constants';
import { PlatformType } from '../systems/LevelGenerator';

export class Platform extends Phaser.Physics.Arcade.Sprite {
  platformType: PlatformType;
  private moveSpeed = 0;
  private moveRange = 0;
  private motionOriginX = 0;
  private crumbleTimer: Phaser.Time.TimerEvent | null = null;
  private isCrumbling = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PlatformType) {
    const textureKey = `platform-${type}`;
    super(scene, x, y, textureKey);

    this.platformType = type;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    this.setDepth(5);

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(GAME.PLATFORM_WIDTH - 4, GAME.PLATFORM_HEIGHT - 2);
    body.setOffset(2, 2);
    // Allow player to pass through from below
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;

    if (type === 'moving') {
      this.moveSpeed = 0.8 + Math.random();
      this.moveRange = 30 + Math.random() * 20;
      this.motionOriginX = x;
    }
  }

  startCrumble(): void {
    if (this.platformType !== 'crumbling' || this.isCrumbling) return;
    this.isCrumbling = true;

    // Shake effect
    this.scene.tweens.add({
      targets: this,
      x: this.x + 2,
      yoyo: true,
      repeat: 5,
      duration: 50,
    });

    this.crumbleTimer = this.scene.time.delayedCall(500, () => {
      // Fall away
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        y: this.y + 50,
        duration: 300,
        onComplete: () => {
          this.destroy();
        },
      });
    });
  }

  updatePlatform(): void {
    if (this.platformType === 'moving') {
      const body = this.body as Phaser.Physics.Arcade.StaticBody;
      this.x = this.motionOriginX + Math.sin(this.scene.time.now * 0.001 * this.moveSpeed) * this.moveRange;
      body.updateFromGameObject();
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.crumbleTimer) {
      this.crumbleTimer.destroy();
    }
    super.destroy(fromScene);
  }
}
