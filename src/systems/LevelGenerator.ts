import Phaser from 'phaser';
import { GAME, DIFFICULTY } from '../constants';

export type PlatformType = 'normal' | 'moving' | 'crumbling' | 'spring';
export type ObstacleType = 'snake' | 'coconut' | 'thorns' | 'bat';

export interface PlatformData {
  x: number;
  y: number;
  type: PlatformType;
}

export interface ObstacleData {
  x: number;
  y: number;
  type: ObstacleType;
}

export interface ShieldData {
  x: number;
  y: number;
}

export class LevelGenerator {
  private generatedUpTo: number;
  private lastPlatformX: number;
  private previousGap: number;
  private rng: () => number;

  constructor(startY: number, startX: number = GAME.WIDTH / 2) {
    this.generatedUpTo = startY;
    this.lastPlatformX = startX;
    this.previousGap = GAME.MIN_PLATFORM_GAP;
    // Simple seeded-ish RNG using Math.random
    this.rng = Math.random;
  }

  generateChunk(cameraTop: number): {
    platforms: PlatformData[];
    obstacles: ObstacleData[];
    shields: ShieldData[];
  } {
    const platforms: PlatformData[] = [];
    const obstacles: ObstacleData[] = [];
    const shields: ShieldData[] = [];

    const targetY = cameraTop - GAME.GENERATION_AHEAD;

    while (this.generatedUpTo > targetY) {
      const height = Math.abs(this.generatedUpTo);
      const gap = this.getGap(height);
      this.generatedUpTo -= gap;

      const platform = this.generatePlatform(this.generatedUpTo, height, gap);
      platforms.push(platform);
      this.lastPlatformX = platform.x;

      // Maybe add obstacle
      if (height > DIFFICULTY.EASY_END) {
        const obstacleChance = this.getObstacleChance(height);
        if (this.rng() < obstacleChance) {
          const obstacle = this.generateObstacle(platform, height);
          if (obstacle) obstacles.push(obstacle);
        }
      }

      // Maybe add shield
      if (height > DIFFICULTY.EASY_END && this.rng() < 0.03) {
        shields.push({
          x: Phaser.Math.Between(40, GAME.WIDTH - 40),
          y: this.generatedUpTo - 30,
        });
      }
    }

    return { platforms, obstacles, shields };
  }

  private getGap(height: number): number {
    let min = GAME.MIN_PLATFORM_GAP;
    let max = GAME.MAX_PLATFORM_GAP;

    if (height > DIFFICULTY.HARD_END) {
      min = 80;
      max = 130;
    } else if (height > DIFFICULTY.MEDIUM_END) {
      min = 70;
      max = 120;
    } else if (height > DIFFICULTY.EASY_END) {
      min = 60;
      max = 110;
    }

    // Keep generation inside jump physics limits so every platform is reachable.
    const safeMaxGap = Math.floor(this.getMaxReachableVerticalGap() - 22);
    max = Math.min(max, safeMaxGap, GAME.MAX_SAFE_PLATFORM_GAP);
    if (min > max) {
      min = max;
    }

    const rawGap = min + this.rng() * (max - min);
    const smoothedGap = Phaser.Math.Clamp(
      rawGap,
      Math.max(min, this.previousGap - GAME.MAX_PLATFORM_GAP_STEP),
      Math.min(max, this.previousGap + GAME.MAX_PLATFORM_GAP_STEP)
    );

    this.previousGap = smoothedGap;
    return smoothedGap;
  }

  private generatePlatform(y: number, height: number, gap: number): PlatformData {
    const x = this.getReachableX(gap);

    let type: PlatformType = 'normal';

    if (height > DIFFICULTY.EASY_END) {
      const roll = this.rng();
      if (height > DIFFICULTY.HARD_END) {
        if (roll < 0.25) type = 'moving';
        else if (roll < 0.45) type = 'crumbling';
        else if (roll < 0.55) type = 'spring';
      } else if (height > DIFFICULTY.MEDIUM_END) {
        if (roll < 0.2) type = 'moving';
        else if (roll < 0.35) type = 'crumbling';
        else if (roll < 0.42) type = 'spring';
      } else {
        if (roll < 0.15) type = 'moving';
        else if (roll < 0.2) type = 'spring';
      }
    }

    return { x, y, type };
  }

  private getReachableX(verticalGap: number): number {
    const margin = GAME.PLATFORM_WIDTH / 2 + 10;
    const maxDelta = this.getMaxHorizontalCenterDelta(verticalGap);

    const minX = Math.max(margin, this.lastPlatformX - maxDelta);
    const maxX = Math.min(GAME.WIDTH - margin, this.lastPlatformX + maxDelta);

    if (maxX <= minX) {
      return Phaser.Math.Clamp(this.lastPlatformX, margin, GAME.WIDTH - margin);
    }

    return minX + this.rng() * (maxX - minX);
  }

  private getMaxHorizontalCenterDelta(verticalGap: number): number {
    const descentTime = this.getDescentTimeForGap(verticalGap);
    const horizontalTravel = GAME.PLAYER_SPEED * descentTime;
    const landingTolerance = GAME.PLATFORM_WIDTH * 0.5 + GAME.PLAYER_SIZE * 0.3;
    const safetyBuffer = 20;
    const maxDelta = horizontalTravel + landingTolerance - safetyBuffer;

    return Phaser.Math.Clamp(maxDelta, 55, GAME.WIDTH * 0.45);
  }

  private getDescentTimeForGap(verticalGap: number): number {
    const jumpSpeed = Math.abs(GAME.JUMP_VELOCITY);
    const discriminant = Math.max(0, jumpSpeed * jumpSpeed - 2 * GAME.GRAVITY * verticalGap);
    const sqrtTerm = Math.sqrt(discriminant);
    return (jumpSpeed + sqrtTerm) / GAME.GRAVITY;
  }

  private getMaxReachableVerticalGap(): number {
    const jumpSpeed = Math.abs(GAME.JUMP_VELOCITY);
    return (jumpSpeed * jumpSpeed) / (2 * GAME.GRAVITY);
  }

  private generateObstacle(platform: PlatformData, height: number): ObstacleData | null {
    const roll = this.rng();

    if (height > DIFFICULTY.HARD_END) {
      if (roll < 0.3) return { x: platform.x, y: platform.y - 16, type: 'snake' };
      if (roll < 0.5) return { x: Phaser.Math.Between(40, GAME.WIDTH - 40), y: platform.y - 60, type: 'coconut' };
      if (roll < 0.7) return { x: platform.x, y: platform.y - 14, type: 'thorns' };
      return { x: Phaser.Math.Between(20, GAME.WIDTH - 20), y: platform.y - 40, type: 'bat' };
    } else if (height > DIFFICULTY.MEDIUM_END) {
      if (roll < 0.4) return { x: platform.x, y: platform.y - 16, type: 'snake' };
      if (roll < 0.6) return { x: Phaser.Math.Between(40, GAME.WIDTH - 40), y: platform.y - 60, type: 'coconut' };
      if (roll < 0.8) return { x: platform.x, y: platform.y - 14, type: 'thorns' };
      return null;
    } else {
      if (roll < 0.5) return { x: platform.x, y: platform.y - 16, type: 'snake' };
      return { x: Phaser.Math.Between(40, GAME.WIDTH - 40), y: platform.y - 60, type: 'coconut' };
    }
  }

  private getObstacleChance(height: number): number {
    if (height > DIFFICULTY.HARD_END) return 0.35;
    if (height > DIFFICULTY.MEDIUM_END) return 0.25;
    return 0.15;
  }
}
