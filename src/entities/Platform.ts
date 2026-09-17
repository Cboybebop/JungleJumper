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
  private connector: Phaser.GameObjects.TileSprite | null = null;
  private animationOffset = 0;
  private stateTimers: Phaser.Time.TimerEvent[] = [];
  private isCrumbling = false;
  private isSpringAnimating = false;
  private cue?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PlatformType, variant = 0) {
    const textureKey = `platform-${type}`;
    super(scene, x, y, textureKey);
    // Collision tops follow the visible landing surface in each sprite.
    this.setOrigin(0.5);
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
    const surfaceY = { normal: 6, moving: 11, crumbling: 3, spring: 4 }[type];
    body.setOffset((GAME.PLATFORM_WIDTH - surfaceWidth) / 2, surfaceY);
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
      // updateFromGameObject would reset the custom body to the full sprite frame.
      body.x = this.x - this.displayOriginX + body.offset.x;
      body.y = this.y - this.displayOriginY + body.offset.y;
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
    // Start inside the visible bark, not at its transparent frame edge.
    const trunkX = GAME.WIDTH / 2;
    const y = this.y + 2;
    if (Math.abs(this.x - trunkX) < 12) return;
    this.connector = this.scene.add.tileSprite(
      (trunkX + this.x) / 2, y, Math.abs(this.x - trunkX), 12, 'world-branch-bark'
    ).setDepth(3);
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
