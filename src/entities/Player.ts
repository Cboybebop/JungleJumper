import Phaser from 'phaser';
import { GAME, CHARACTERS } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private hasShield = false;
  private shieldSprite: Phaser.GameObjects.Image | null = null;
  private isAlive = true;
  private wasOnGround = true;
  private facingRight = true;
  private airJumpsRemaining = GAME.AIR_JUMP_COUNT;
  private lastJumpAt = -Infinity;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const charIndex = SettingsManager.selectedCharacter;
    const charKey = CHARACTERS[charIndex]?.key ?? 'monkey';
    super(scene, x, y, charKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false);
    this.setBounce(0);
    this.setSize(GAME.PLAYER_SIZE * 0.6, GAME.PLAYER_SIZE * 0.8);
    this.setOffset(GAME.PLAYER_SIZE * 0.2, GAME.PLAYER_SIZE * 0.1);
    this.setDepth(10);
  }

  moveLeft(): void {
    if (!this.isAlive) return;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(-GAME.PLAYER_SPEED);
    if (this.facingRight) {
      this.setFlipX(true);
      this.facingRight = false;
    }
  }

  moveRight(): void {
    if (!this.isAlive) return;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(GAME.PLAYER_SPEED);
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

    if (now - this.lastJumpAt < GAME.DOUBLE_JUMP_COOLDOWN_MS) return;

    if (!onGround) {
      if (this.airJumpsRemaining <= 0) return;
      this.airJumpsRemaining -= 1;
    }

    body.setVelocityY(GAME.JUMP_VELOCITY);
    this.lastJumpAt = now;
    AudioManager.jump();
  }

  rechargeAirJump(): void {
    if (!this.isAlive) return;
    this.airJumpsRemaining = GAME.AIR_JUMP_COUNT;
  }

  springJump(): void {
    if (!this.isAlive) return;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityY(GAME.SPRING_VELOCITY);
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
    if (this.hasShield) return;
    this.hasShield = true;
    AudioManager.shieldPickup();
    this.shieldSprite = this.scene.add.image(this.x, this.y, 'shield-effect');
    this.shieldSprite.setDepth(11);
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
