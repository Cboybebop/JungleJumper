import Phaser from 'phaser';
import { GAME } from '../constants';
import { PlatformType } from '../systems/LevelGenerator';
import { PLATFORM_FRAME_COUNT } from '../graphics/WorldAssets';

export class Platform extends Phaser.Physics.Arcade.Sprite {
  platformType: PlatformType;
  private moveSpeed = 0;
  private moveRange = 0;
  private motionOriginX = 0;
  private animationOffset = 0;
  private stateTimers: Phaser.Time.TimerEvent[] = [];
  private isCrumbling = false;
  private isSpringAnimating = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PlatformType, variant = 0) {
    const textureKey = `platform-${type}`;
    super(scene, x, y, textureKey);
    if (this.texture.has('0')) this.setFrame(0);

    this.platformType = type;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    this.setDepth(5);

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(GAME.PLATFORM_WIDTH - 4, GAME.PLATFORM_HEIGHT - 2);
    body.setOffset(2, 6);
    // Allow player to pass through from below
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;

    if (type === 'moving') {
      this.moveSpeed = 0.8 + Math.random();
      this.moveRange = 30 + Math.random() * 20;
      this.motionOriginX = x;
      this.animationOffset = variant % PLATFORM_FRAME_COUNT;
    } else if (type === 'normal') {
      this.setVisualFrame(variant % PLATFORM_FRAME_COUNT);
    }
  }

  startCrumble(): void {
    if (this.platformType !== 'crumbling' || this.isCrumbling) return;
    this.isCrumbling = true;
    this.setVisualFrame(1);

    // Shake effect
    this.scene.tweens.add({
      targets: this,
      x: this.x + 2,
      yoyo: true,
      repeat: 5,
      duration: 50,
    });

    this.stateTimers.push(this.scene.time.delayedCall(180, () => {
      this.setVisualFrame(2);
    }));

    this.stateTimers.push(this.scene.time.delayedCall(420, () => {
      this.setVisualFrame(3);
      const body = this.body as Phaser.Physics.Arcade.StaticBody;
      body.enable = false;

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
    }));
  }

  activateSpring(): void {
    if (this.platformType !== 'spring' || this.isSpringAnimating) return;
    this.isSpringAnimating = true;
    this.setVisualFrame(1);

    this.stateTimers.push(this.scene.time.delayedCall(70, () => this.setVisualFrame(2)));
    this.stateTimers.push(this.scene.time.delayedCall(145, () => this.setVisualFrame(3)));
    this.stateTimers.push(this.scene.time.delayedCall(240, () => {
      this.setVisualFrame(0);
      this.isSpringAnimating = false;
    }));
  }

  updatePlatform(): void {
    if (this.platformType === 'moving') {
      const body = this.body as Phaser.Physics.Arcade.StaticBody;
      this.x = this.motionOriginX + Math.sin(this.scene.time.now * 0.001 * this.moveSpeed) * this.moveRange;
      const indicatorFrame = (
        Math.floor(this.scene.time.now / 120) + this.animationOffset
      ) % PLATFORM_FRAME_COUNT;
      this.setVisualFrame(indicatorFrame);
      body.updateFromGameObject();
    }
  }

  private setVisualFrame(frame: number): void {
    if (this.texture.has(String(frame))) {
      this.setFrame(frame);
    }
  }

  destroy(fromScene?: boolean): void {
    for (const timer of this.stateTimers) {
      timer.destroy();
    }
    this.stateTimers = [];
    super.destroy(fromScene);
  }
}
