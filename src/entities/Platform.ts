import Phaser from 'phaser';
import { GAME } from '../constants';
import type { PlatformType } from '../systems/LevelGenerator';
import { PLATFORM_FRAME_COUNT } from '../graphics/WorldAssets';
import { stateCue } from '../graphics/StateCue';

export class Platform extends Phaser.Physics.Arcade.Sprite {
  platformType: PlatformType;
  private moveSpeed = 0;
  private moveRange = 0;
  private motionOriginX = 0;
  private movementDeltaX = 0;
  private previousX = 0;
  private connector: Phaser.GameObjects.Graphics | null = null;
  private animationOffset = 0;
  private stateTimers: Phaser.Time.TimerEvent[] = [];
  private isCrumbling = false;
  private isSpringAnimating = false;
  private cue?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PlatformType, variant = 0) {
    const textureKey = `platform-${type}`;
    super(scene, x, y, textureKey);
    if (this.texture.has('0')) this.setFrame(0);

    this.platformType = type;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    this.setDepth(5);
    if (type !== 'normal') {
      this.cue = stateCue(scene, type).setDepth(6);
      this.syncCue();
      scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncCue, this);
    }

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    const surfaceWidth = this.getSurfaceWidth();
    body.setSize(surfaceWidth, 8);
    body.setOffset((GAME.PLATFORM_WIDTH - surfaceWidth) / 2, 2);
    // Allow player to pass through from below
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;

    if (type === 'moving') {
      this.moveSpeed = 0.8 + Math.random();
      this.moveRange = 30 + Math.random() * 20;
      this.motionOriginX = x;
      this.previousX = x;
      this.animationOffset = variant % PLATFORM_FRAME_COUNT;
    } else if (type === 'normal') {
      this.setVisualFrame(variant % PLATFORM_FRAME_COUNT);
    }
    if (type !== 'moving') this.createTreeConnector();
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
      this.connector?.destroy();
      this.connector = null;
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
      this.movementDeltaX = this.x - this.previousX;
      this.previousX = this.x;
      const indicatorFrame = (
        Math.floor(this.scene.time.now / 120) + this.animationOffset
      ) % PLATFORM_FRAME_COUNT;
      this.setVisualFrame(indicatorFrame);
      body.updateFromGameObject();
    } else {
      this.movementDeltaX = 0;
    }
  }

  getMovementDeltaX(): number {
    return this.movementDeltaX;
  }

  getSurfaceWidth(): number {
    switch (this.platformType) {
      case 'moving': return 42;
      case 'spring': return 60;
      case 'crumbling': return 64;
      default: return 68;
    }
  }

  private createTreeConnector(): void {
    const direction = this.x < GAME.WIDTH / 2 ? -1 : 1;
    const trunkX = GAME.WIDTH / 2 + direction * GAME.TRUNK_WIDTH / 2;
    const platformEdge = this.x - direction * this.getSurfaceWidth() / 2;
    if (Math.abs(platformEdge - trunkX) < 6) return;

    const y = this.y + 5;
    this.connector = this.scene.add.graphics().setDepth(3);
    this.connector.lineStyle(7, 0x211936, 1);
    this.connector.lineBetween(trunkX, y + 2, platformEdge, y);
    this.connector.lineBetween(platformEdge - direction * 10, y, platformEdge - direction * 3, y - 5);
    this.connector.lineStyle(4, 0x5B3A6B, 1);
    this.connector.lineBetween(trunkX, y + 1, platformEdge, y - 1);
    this.connector.lineBetween(platformEdge - direction * 10, y, platformEdge - direction * 3, y - 5);
    this.connector.lineStyle(1, 0xFFE6A3, 0.45);
    this.connector.lineBetween(trunkX, y - 1, platformEdge, y - 2);
  }

  private setVisualFrame(frame: number): void {
    if (this.texture.has(String(frame))) {
      this.setFrame(frame);
    }
  }

  destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncCue, this);
    this.cue?.destroy();
    for (const timer of this.stateTimers) {
      timer.destroy();
    }
    this.stateTimers = [];
    this.connector?.destroy();
    this.connector = null;
    super.destroy(fromScene);
  }

  private syncCue(): void {
    this.cue?.setPosition(this.x, this.y + 6).setAlpha(this.alpha).setVisible(this.visible);
  }
}
