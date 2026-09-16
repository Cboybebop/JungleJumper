import Phaser from 'phaser';
import { GAME } from '../constants';
import { stateCue } from '../graphics/StateCue';
import type { ObstacleType } from '../systems/LevelGenerator';
import {
  EFFECT_ANIMATIONS,
  EFFECT_TEXTURES,
  ENEMY_TEXTURES,
  getEnemyAnimationKey,
  type EnemyAnimationState,
} from '../graphics/AnimationRegistry';

interface BodyShape {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

const BODY_SHAPES: Record<ObstacleType, BodyShape> = {
  snake: { width: 26, height: 10, offsetX: 3, offsetY: 19 },
  coconut: { width: 18, height: 18, offsetX: 7, offsetY: 7 },
  thorns: { width: 30, height: 12, offsetX: 1, offsetY: 16 },
  bat: { width: 24, height: 13, offsetX: 4, offsetY: 10 },
};

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  readonly obstacleType: ObstacleType;
  private moveSpeed = 0;
  private moveRange = 0;
  private motionOriginX = 0;
  private motionOriginY = 0;
  private warningSprite: Phaser.GameObjects.Sprite | null = null;
  private dropping = false;
  private resolved = false;
  private attackUntil = 0;
  private currentState: EnemyAnimationState | null = null;
  private cue?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, type: ObstacleType) {
    super(scene, x, y, ENEMY_TEXTURES[type]);

    this.obstacleType = type;
    this.motionOriginX = x;
    this.motionOriginY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this, type !== 'coconut');
    this.setDepth(6);
    this.cue = stateCue(scene, 'hazard').setDepth(7);
    this.syncCue();
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncCue, this);
    this.applyStableBody();

    switch (type) {
      case 'snake':
        this.moveSpeed = 0.8 + Math.random() * 0.8;
        this.moveRange = 25 + Math.random() * 20;
        this.setEnemyAnimation('patrol');
        break;
      case 'coconut':
        this.setEnemyAnimation('idle');
        this.setupCoconutDrop(scene);
        break;
      case 'thorns':
        this.setEnemyAnimation('idle');
        break;
      case 'bat':
        this.moveSpeed = 1.5 + Math.random();
        this.moveRange = GAME.WIDTH * 0.4;
        this.setEnemyAnimation('patrol');
        break;
    }
  }

  private applyStableBody(): void {
    const shape = BODY_SHAPES[this.obstacleType];
    const body = this.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
    body.setSize(shape.width, shape.height, false);
    body.setOffset(shape.offsetX, shape.offsetY);
  }

  private setupCoconutDrop(scene: Phaser.Scene): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.warningSprite = scene.add.sprite(this.x, this.y - 24, EFFECT_TEXTURES.warning);
    this.warningSprite.setDepth(7).play(EFFECT_ANIMATIONS.warning);

    scene.time.delayedCall(750, () => {
      if (!this.active || this.resolved) return;
      this.warningSprite?.destroy();
      this.warningSprite = null;
      this.dropping = true;
      this.setEnemyAnimation('attack');
      body.setAllowGravity(true);
      body.setVelocityY(150);
    });
  }

  private setEnemyAnimation(state: EnemyAnimationState): void {
    if (state === this.currentState) return;
    this.currentState = state;
    this.play(getEnemyAnimationKey(this.obstacleType, state), true);
  }

  updateObstacle(playerX: number, playerY: number): void {
    if (this.resolved) return;

    const now = this.scene.time.now;
    const closeToPlayer = Math.abs(playerX - this.x) < 64 && Math.abs(playerY - this.y) < 54;
    if (closeToPlayer && !this.dropping && now >= this.attackUntil) {
      this.attackUntil = now + 360;
      this.setEnemyAnimation('attack');
    } else if (now >= this.attackUntil && !this.dropping) {
      this.setEnemyAnimation(this.obstacleType === 'snake' || this.obstacleType === 'bat' ? 'patrol' : 'idle');
    }

    switch (this.obstacleType) {
      case 'snake': {
        const body = this.body as Phaser.Physics.Arcade.StaticBody;
        this.x = this.motionOriginX + Math.sin(now * 0.002 * this.moveSpeed) * this.moveRange;
        body.updateFromGameObject();
        break;
      }
      case 'bat': {
        const body = this.body as Phaser.Physics.Arcade.StaticBody;
        this.x = this.motionOriginX + Math.sin(now * 0.001 * this.moveSpeed) * this.moveRange;
        this.y = this.motionOriginY + Math.sin(now * 0.003) * 4;
        body.updateFromGameObject();
        break;
      }
    }
  }

  reactToHit(defeated: boolean): void {
    if (this.resolved) return;
    this.setEnemyAnimation('hit');
    if (!defeated) return;

    this.resolved = true;
    const body = this.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
    body.enable = false;
    this.scene.time.delayedCall(90, () => {
      if (!this.active) return;
      this.setEnemyAnimation('defeat');
      this.scene.time.delayedCall(430, () => this.destroy());
    });
  }

  destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncCue, this);
    this.cue?.destroy();
    this.warningSprite?.destroy();
    this.warningSprite = null;
    super.destroy(fromScene);
  }

  private syncCue(): void {
    this.cue?.setPosition(this.x, this.y - 19).setVisible(this.visible && !this.resolved);
  }
}
