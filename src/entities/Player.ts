import Phaser from 'phaser';
import { GAME, CHARACTERS, type CharacterKey } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { FeedbackManager } from '../systems/FeedbackManager';
import { AudioManager } from '../systems/AudioManager';
import {
  EFFECT_ANIMATIONS,
  EFFECT_TEXTURES,
  type CharacterAction,
  getAnimationKey,
  selectAnimationState,
} from '../graphics/AnimationRegistry';

export type PlayerFeedbackEvent =
  | 'landing'
  | 'jump'
  | 'double-jump'
  | 'shield-pickup'
  | 'shield-break'
  | 'obstacle-damage'
  | 'spring-launch'
  | 'death';

interface CharacterAbilities {
  moveSpeedMultiplier: number;
  jumpHeightMultiplier: number;
  airJumps: number;
  airJumpCooldownMs: number;
  specialSpringHeightMultiplier: number | null;
  startWithShield: boolean;
}

const DEFAULT_CHARACTER_ABILITIES: CharacterAbilities = {
  moveSpeedMultiplier: 1,
  jumpHeightMultiplier: 1,
  airJumps: 0,
  airJumpCooldownMs: 0,
  specialSpringHeightMultiplier: null,
  startWithShield: false,
};

const CHARACTER_ABILITIES: Record<CharacterKey, Partial<CharacterAbilities>> = {
  miko: {
    jumpHeightMultiplier: 1.2,
    startWithShield: true,
  },
  pico: {
    airJumps: GAME.AIR_JUMP_COUNT,
    airJumpCooldownMs: GAME.DOUBLE_JUMP_COOLDOWN_MS,
  },
  hoppy: {
    specialSpringHeightMultiplier: 3,
  },
  tuki: {
    jumpHeightMultiplier: 1.5,
  },
  zippy: {
    moveSpeedMultiplier: 1.5,
  },
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private visual!: Phaser.GameObjects.Sprite;
  private fallSpeed = 0;
  private feedback?: FeedbackManager;
  private hasShield = false;
  private shieldSprite: Phaser.GameObjects.Sprite | null = null;
  private isAlive = true;
  private wasOnGround = true;
  private facingRight = true;
  private airJumpsRemaining = 0;
  private lastJumpAt = -Infinity;
  private abilities: CharacterAbilities;
  private readonly animationPrefix: string | null;
  private readonly character: typeof CHARACTERS[number];
  private action: CharacterAction = null;
  private actionUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, feedback?: FeedbackManager) {
    const charIndex = SettingsManager.selectedCharacter;
    const character = CHARACTERS[charIndex] ?? CHARACTERS[0];
    const usesCharacterAnimations = scene.textures.exists(character.texture);
    super(scene, x, y, usesCharacterAnimations ? character.texture : character.key);

    this.feedback = feedback;
    this.character = character;
    this.abilities = this.resolveAbilities(character.key);
    this.animationPrefix = usesCharacterAnimations ? character.animationPrefix : null;
    this.airJumpsRemaining = this.abilities.airJumps;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false);
    this.setBounce(0);
    this.setDepth(10);
    this.setAlpha(0);
    this.visual = scene.add.sprite(x, y, this.texture.key, this.frame.name).setDepth(10);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);

    // This fixed body is intentionally independent of each frame's transparent
    // pixels, so pose changes can never resize or shift collision geometry.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 26, false);
    body.setOffset(7, 4);

    if (this.animationPrefix) this.play(getAnimationKey(this.character, 'idle'));

    if (this.abilities.startWithShield) {
      this.addShield(false);
    }
  }

  moveLeft(): void {
    if (!this.isAlive) return;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.getMoveSpeed());
    if (this.facingRight) {
      this.setFlipX(true);
      this.facingRight = false;
    }
  }

  moveRight(): void {
    if (!this.isAlive) return;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(this.getMoveSpeed());
    if (!this.facingRight) {
      this.setFlipX(false);
      this.facingRight = true;
    }
  }

  stopHorizontal(): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
  }

  carryWithPlatform(deltaX: number): void {
    if (!this.isAlive || deltaX === 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.x += deltaX;
    this.x += deltaX;
  }

  jump(): void {
    if (!this.isAlive) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;
    const onGround = body.touching.down || body.blocked.down;

    if (!onGround) {
      if (this.airJumpsRemaining <= 0) return;
      if (now - this.lastJumpAt < this.abilities.airJumpCooldownMs) return;
      this.airJumpsRemaining -= 1;
      this.setAction('doubleJump', 150);
    } else {
      this.setAction('anticipation', 80);
    }

    this.feedback?.squash(this.visual, 0.92, 1.1);
    this.emitFeedback(onGround ? 'jump' : 'double-jump');
    body.setVelocityY(this.getJumpVelocity());
    this.lastJumpAt = now;
    AudioManager.jump();
  }

  rechargeAirJump(): void {
    if (!this.isAlive) return;
    this.airJumpsRemaining = this.abilities.airJumps;
  }

  springJump(): void {
    if (!this.isAlive) return;

    let springVelocity = GAME.SPRING_VELOCITY;
    if (this.abilities.specialSpringHeightMultiplier) {
      springVelocity = -Math.abs(GAME.JUMP_VELOCITY) * Math.sqrt(this.abilities.specialSpringHeightMultiplier);
    }

    (this.body as Phaser.Physics.Arcade.Body).setVelocityY(springVelocity);
    this.feedback?.squash(this.visual, 0.88, 1.12);
    this.setAction('springLaunch', 140);
    AudioManager.spring();
    this.emitFeedback('spring-launch');
  }

  hitObstacle(): boolean {
    if (!this.isAlive) return false;

    if (this.hasShield) {
      this.removeShield();
      // Knockback
      (this.body as Phaser.Physics.Arcade.Body).setVelocityY(-200);
      this.setAction('hit', 180);
      AudioManager.shieldBreak();
      this.emitFeedback('shield-break');
      return false;
    }

    this.emitFeedback('obstacle-damage');
    this.die();
    return true;
  }

  die(): void {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.action = 'defeat';
    this.playCharacterAnimation();
    AudioManager.death();
    this.emitFeedback('death');
    (this.body as Phaser.Physics.Arcade.Body).setVelocityY(-300);
    (this.body as Phaser.Physics.Arcade.Body).setAccelerationY(800);
    if (this.shieldSprite) {
      this.shieldSprite.destroy();
      this.shieldSprite = null;
    }
  }

  get alive(): boolean {
    return this.isAlive;
  }

  pickupShield(): void {
    this.addShield(true);
  }

  private addShield(playSound: boolean): void {
    if (this.hasShield) return;

    this.hasShield = true;
    this.setAction('shielded', 320);
    if (playSound) {
      AudioManager.shieldPickup();
      this.emitFeedback('shield-pickup');
    }

    this.shieldSprite = this.scene.add.sprite(this.x, this.y, EFFECT_TEXTURES.shieldShell);
    this.shieldSprite.setDepth(11);
    if (!SettingsManager.getReducedMotion()) this.shieldSprite.play(EFFECT_ANIMATIONS.shieldShell);
  }

  private resolveAbilities(charKey: CharacterKey): CharacterAbilities {
    return {
      ...DEFAULT_CHARACTER_ABILITIES,
      ...CHARACTER_ABILITIES[charKey],
    };
  }

  private getMoveSpeed(): number {
    return GAME.PLAYER_SPEED * this.abilities.moveSpeedMultiplier;
  }

  private getJumpVelocity(): number {
    return -Math.abs(GAME.JUMP_VELOCITY) * Math.sqrt(this.abilities.jumpHeightMultiplier);
  }

  private removeShield(): void {
    this.hasShield = false;
    if (this.shieldSprite) {
      this.shieldSprite.destroy();
      this.shieldSprite = null;
    }
  }

  private emitFeedback(kind: PlayerFeedbackEvent, strength = 0): void {
    this.emit('feedback', kind, this.x, this.y, strength);
  }

  celebrate(): void {
    if (!this.isAlive) return;
    this.setAction('celebration', 1000);
  }

  private setAction(action: Exclude<CharacterAction, null>, durationMs: number): void {
    this.action = action;
    this.actionUntil = this.scene.time.now + durationMs;
    this.playCharacterAnimation();
  }

  private playCharacterAnimation(onGround?: boolean): void {
    if (!this.animationPrefix) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const state = selectAnimationState({
      alive: this.isAlive,
      onGround: onGround ?? (body.touching.down || body.blocked.down),
      velocityX: body.velocity.x,
      velocityY: body.velocity.y,
      action: this.action,
    });
    this.anims.play(getAnimationKey(this.character, state), true);
  }

  update(): void {
    if (!this.isAlive) return;

    // Wrap horizontally
    if (this.x < -GAME.PLAYER_SIZE / 2) {
      this.x = GAME.WIDTH + GAME.PLAYER_SIZE / 2;
    } else if (this.x > GAME.WIDTH + GAME.PLAYER_SIZE / 2) {
      this.x = -GAME.PLAYER_SIZE / 2;
    }

    // Landing detection
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down;
    if (onGround && !this.wasOnGround) {
      AudioManager.land();
      this.setAction('landing', 145);
      this.emitFeedback('landing', this.fallSpeed);
      const weight = Phaser.Math.Clamp(this.fallSpeed / 700, 0, 1);
      this.feedback?.squash(this.visual, 1 + weight * 0.12, 1 - weight * 0.12);
    }
    this.wasOnGround = onGround;

    this.fallSpeed = Math.max(0, body.velocity.y);

    if (this.action && this.scene.time.now >= this.actionUntil) this.action = null;
    this.playCharacterAnimation(onGround);

    // Update shield position
    if (this.shieldSprite) {
      this.shieldSprite.x = this.x;
      this.shieldSprite.y = this.y;
    }
  }
  private syncVisual(): void {
    // Only the render proxy is transformed. The Arcade sprite stays at scale 1.
    this.visual.setTexture(this.texture.key, this.frame.name).setFlipX(this.flipX);
    this.visual.setPosition(this.x, this.y + (1 - this.visual.scaleY) * 14);
    this.shieldSprite?.setPosition(this.x, this.y);
  }

  destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    if (this.visual?.scene) {
      this.scene.tweens.killTweensOf(this.visual);
      this.visual.destroy();
    }
    this.shieldSprite?.destroy();
    this.shieldSprite = null;
    super.destroy(fromScene);
  }

}
