import Phaser from 'phaser';
import { COLORS, GAME } from '../constants';

interface BgElement {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  drift?: number;
}

const SIDE_DECOR_KEYS = [
  'world-vine-curled', 'world-vine-twisting', 'world-leaves-small', 'world-leaves-large',
  'world-flower-pink', 'world-flower-gold', 'world-fruit-berries', 'world-fruit-orange',
  'world-moss', 'world-stones',
] as const;

const CANOPY_KEYS = [
  'world-canopy-left', 'world-canopy-right',
  'world-canopy-distant-left', 'world-canopy-distant-right',
] as const;

export class BackgroundManager {
  private clouds: BgElement[] = [];
  private decorations: BgElement[] = [];
  private trunkTiles: Phaser.GameObjects.TileSprite;
  private lastCameraY = 0;

  constructor(private scene: Phaser.Scene) {
    scene.cameras.main.setBackgroundColor(COLORS.SKY);

    const trunkKey = this.chooseAvailable(
      ['world-trunk-0', 'world-trunk-1', 'world-trunk-2', 'world-trunk-3'],
      'world-trunk-0'
    );

    this.trunkTiles = scene.add.tileSprite(
      GAME.WIDTH / 2,
      0,
      GAME.TRUNK_WIDTH,
      GAME.HEIGHT * 3,
      trunkKey
    );
    this.trunkTiles.setOrigin(0.5, 0.5).setDepth(1);
    this.spawnInitialDecorations();
  }

  private spawnInitialDecorations(): void {
    for (let i = 0; i < 7; i++) {
      this.addCloud(
        Phaser.Math.Between(10, GAME.WIDTH - 10),
        -i * 210 + Phaser.Math.Between(-100, 100)
      );
    }

    for (let i = 0; i < 8; i++) {
      this.addDecoration(
        this.chooseAvailable(CANOPY_KEYS, 'world-jungle-silhouette'),
        this.edgeX(i % 2 === 0),
        -i * 210 + Phaser.Math.Between(-80, 60),
        0.36
      );
    }

    for (let i = 0; i < 16; i++) {
      this.addDecoration(
        this.chooseAvailable(SIDE_DECOR_KEYS, 'world-flower-pink'),
        this.edgeX(Math.random() > 0.5),
        -i * 105 + Phaser.Math.Between(-50, 50),
        0.48
      );
    }

    for (let i = 0; i < 5; i++) {
      this.addDecoration(
        'world-jungle-silhouette',
        this.edgeX(i % 2 === 0, 55),
        -i * 340 + Phaser.Math.Between(-80, 80),
        0.2
      );
    }
  }

  private addCloud(x: number, y: number): void {
    const sprite = this.scene.add.image(x, y, 'world-cloud');
    sprite.setAlpha(0.45 + Math.random() * 0.25);
    sprite.setScale(0.7 + Math.random() * 0.6).setDepth(0);
    this.clouds.push({
      sprite,
      speed: 0.12 + Math.random() * 0.1,
      drift: 0.05 + Math.random() * 0.08,
    });
  }

  private addDecoration(key: string, x: number, y: number, speed: number): void {
    const sprite = this.scene.add.image(x, y, key);
    sprite.setScale(0.75 + Math.random() * 0.45);
    sprite.setAlpha(key === 'world-jungle-silhouette' ? 0.45 : 0.8);
    sprite.setFlipX(Math.random() > 0.5);
    // Platforms are depth 5 and actors/hazards are 6+, so landing targets stay clear.
    sprite.setDepth(key.startsWith('world-canopy') ? 2 : 0);
    this.decorations.push({ sprite, speed });
  }

  private edgeX(left: boolean, inset = 24): number {
    return left
      ? Phaser.Math.Between(-inset, 68)
      : Phaser.Math.Between(GAME.WIDTH - 68, GAME.WIDTH + inset);
  }

  private chooseAvailable(keys: readonly string[], fallback: string): string {
    const available = keys.filter((key) => this.scene.textures.exists(key));
    return available.length > 0 ? Phaser.Utils.Array.GetRandom(available) : fallback;
  }

  update(cameraY: number): void {
    const deltaY = cameraY - this.lastCameraY;
    this.lastCameraY = cameraY;

    this.trunkTiles.y = cameraY;
    this.trunkTiles.tilePositionY -= deltaY;

    for (const cloud of this.clouds) {
      cloud.sprite.y += deltaY * (1 - cloud.speed);
      cloud.sprite.x += cloud.drift ?? 0;
      if (cloud.sprite.x > GAME.WIDTH + 60) cloud.sprite.x = -60;
    }

    for (const decoration of this.decorations) {
      decoration.sprite.y += deltaY * (1 - decoration.speed);
    }

    const recycleThreshold = cameraY + GAME.HEIGHT;
    const spawnThreshold = cameraY - GAME.HEIGHT * 1.5;

    for (const cloud of this.clouds) {
      if (cloud.sprite.y > recycleThreshold) {
        cloud.sprite.y = spawnThreshold - Phaser.Math.Between(0, 220);
        cloud.sprite.x = Phaser.Math.Between(10, GAME.WIDTH - 10);
      }
    }

    for (const decoration of this.decorations) {
      if (decoration.sprite.y > recycleThreshold) {
        decoration.sprite.y = spawnThreshold - Phaser.Math.Between(0, 240);
        decoration.sprite.x = this.edgeX(Math.random() > 0.5);
        const key = decoration.sprite.texture.key;
        if (!key.includes('canopy') && key !== 'world-jungle-silhouette') {
          decoration.sprite.setTexture(this.chooseAvailable(SIDE_DECOR_KEYS, 'world-flower-pink'));
        }
        decoration.sprite.setFlipX(Math.random() > 0.5);
      }
    }
  }

  destroy(): void {
    for (const cloud of this.clouds) cloud.sprite.destroy();
    for (const decoration of this.decorations) decoration.sprite.destroy();
    this.trunkTiles.destroy();
  }
}
