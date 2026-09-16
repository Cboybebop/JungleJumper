import Phaser from 'phaser';
import { GAME, CHARACTERS, type CharacterKey } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import {
  EFFECT_ANIMATIONS,
  EFFECT_TEXTURES,
  type CharacterAction,
  getAnimationKey,
  selectAnimationState,
} from '../graphics/AnimationRegistry';

export type PlayerFeedbackEvent =
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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const charIndex = SettingsManager.selectedCharacter;
    const character = CHARACTERS[charIndex] ?? CHARACTERS[0];
    const usesCharacterAnimations = scene.textures.exists(character.texture);
    super(scene, x, y, usesCharacterAnimations ? character.texture : character.key);

    this.character = character;
    this.abilities = this.resolveAbilities(character.key);
    this.animationPrefix = usesCharacterAnimations ? character.animationPrefix : null;
    this.airJumpsRemaining = this.abilities.airJumps;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false);
    this.setBounce(0);
    this.setDepth(10);

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
    this.shieldSprite.setDepth(11).play(EFFECT_ANIMATIONS.shieldShell);
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

  private emitFeedback(kind: PlayerFeedbackEvent): void {
    this.emit('feedback', kind, this.x, this.y);
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
    }
    this.wasOnGround = onGround;

    // Sprite art carries squash/stretch while preserving integer 1x rendering.
    this.setScale(1);

    if (this.action && this.scene.time.now >= this.actionUntil) this.action = null;
    this.playCharacterAnimation(onGround);

    // Update shield position
    if (this.shieldSprite) {
      this.shieldSprite.x = this.x;
      this.shieldSprite.y = this.y;
    }
  }
}
