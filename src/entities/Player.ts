import Phaser from 'phaser';
import { GAME, CHARACTERS } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';

interface CharacterAbilities {
  moveSpeedMultiplier: number;
  jumpHeightMultiplier: number;
  airJumps: number;
  airJumpCooldownMs: number;
  specialSpringHeightMultiplier: number | null;
  startWithShield: boolean;
}

type CharacterKey = typeof CHARACTERS[number]['key'];

const DEFAULT_CHARACTER_ABILITIES: CharacterAbilities = {
  moveSpeedMultiplier: 1,
  jumpHeightMultiplier: 1,
  airJumps: 0,
  airJumpCooldownMs: 0,
  specialSpringHeightMultiplier: null,
  startWithShield: false,
};

const CHARACTER_ABILITIES: Record<CharacterKey, Partial<CharacterAbilities>> = {
  monkey: {
    jumpHeightMultiplier: 1.2,
    startWithShield: true,
  },
  parrot: {
    airJumps: GAME.AIR_JUMP_COUNT,
    airJumpCooldownMs: GAME.DOUBLE_JUMP_COOLDOWN_MS,
  },
  frog: {
    specialSpringHeightMultiplier: 3,
  },
  toucan: {
    jumpHeightMultiplier: 1.5,
  },
  gecko: {
    moveSpeedMultiplier: 1.5,
  },
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private hasShield = false;
  private shieldSprite: Phaser.GameObjects.Image | null = null;
  private isAlive = true;
  private wasOnGround = true;
  private facingRight = true;
  private airJumpsRemaining = 0;
  private lastJumpAt = -Infinity;
  private abilities: CharacterAbilities;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const charIndex = SettingsManager.selectedCharacter;
    const charKey = CHARACTERS[charIndex]?.key ?? 'monkey';
    super(scene, x, y, charKey);

    this.abilities = this.resolveAbilities(charKey as CharacterKey);
    this.airJumpsRemaining = this.abilities.airJumps;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false);
    this.setBounce(0);
    this.setSize(GAME.PLAYER_SIZE * 0.6, GAME.PLAYER_SIZE * 0.8);
    this.setOffset(GAME.PLAYER_SIZE * 0.2, GAME.PLAYER_SIZE * 0.1);
    this.setDepth(10);

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

  jump(): void {
    if (!this.isAlive) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;
    const onGround = body.touching.down || body.blocked.down;

    if (!onGround) {
      if (this.airJumpsRemaining <= 0) return;
      if (now - this.lastJumpAt < this.abilities.airJumpCooldownMs) return;
      this.airJumpsRemaining -= 1;
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
    AudioManager.spring();
  }

  hitObstacle(): boolean {
    if (!this.isAlive) return false;

    if (this.hasShield) {
      this.removeShield();
      // Knockback
      (this.body as Phaser.Physics.Arcade.Body).setVelocityY(-200);
      AudioManager.shieldBreak();
      return false;
    }

    this.die();
    return true;
  }

  die(): void {
    if (!this.isAlive) return;
    this.isAlive = false;
    AudioManager.death();
    this.setTint(0xFF0000);
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
    if (playSound) {
      AudioManager.shieldPickup();
    }

    this.shieldSprite = this.scene.add.image(this.x, this.y, 'shield-effect');
    this.shieldSprite.setDepth(11);
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
      // Flash effect
      this.scene.tweens.add({
        targets: this.shieldSprite,
        alpha: 0,
        scale: 2,
        duration: 300,
        onComplete: () => {
          this.shieldSprite?.destroy();
          this.shieldSprite = null;
        },
      });
    }
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
    }
    this.wasOnGround = onGround;

    // Squash and stretch
    if (body.velocity.y < -100) {
      this.setScale(0.9, 1.1);
    } else if (body.velocity.y > 100) {
      this.setScale(1.1, 0.9);
    } else {
      this.setScale(1, 1);
    }

    // Update shield position
    if (this.shieldSprite) {
      this.shieldSprite.x = this.x;
      this.shieldSprite.y = this.y;
      // Pulse effect
      const pulse = 1 + Math.sin(this.scene.time.now * 0.005) * 0.1;
      this.shieldSprite.setScale(pulse);
    }
  }
}
