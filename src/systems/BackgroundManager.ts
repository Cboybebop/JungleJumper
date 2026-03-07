import Phaser from 'phaser';
import { COLORS, GAME } from '../constants';

interface BgElement {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  baseY: number;
}

export class BackgroundManager {
  private scene: Phaser.Scene;
  private clouds: BgElement[] = [];
  private trees: BgElement[] = [];
  private flowers: BgElement[] = [];
  private trunkTiles: Phaser.GameObjects.TileSprite;
  private lastCameraY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Sky background
    scene.cameras.main.setBackgroundColor(COLORS.SKY);

    // Trunk running down the center
    this.trunkTiles = scene.add.tileSprite(
      GAME.WIDTH / 2, 0, GAME.TRUNK_WIDTH, GAME.HEIGHT * 3, 'trunk'
    );
    this.trunkTiles.setOrigin(0.5, 0.5);
    this.trunkTiles.setDepth(1);

    // Initial decorations
    this.spawnInitialDecorations();
  }

  private spawnInitialDecorations(): void {
    // Spawn clouds across the visible area and above
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(10, GAME.WIDTH - 10);
      const y = -i * 200 + Phaser.Math.Between(-100, 100);
      this.addCloud(x, y);
    }

    // Spawn jungle trees on sides
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -10 : GAME.WIDTH - 50;
      const y = -i * 300 + Phaser.Math.Between(-100, 50);
      this.addTree(side, y);
    }

    // Spawn flowers
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(5, GAME.WIDTH - 5);
      const y = -i * 150 + Phaser.Math.Between(-80, 80);
      this.addFlower(x, y);
    }
  }

  private addCloud(x: number, y: number): void {
    const cloud = this.scene.add.image(x, y, 'cloud');
    cloud.setAlpha(0.7 + Math.random() * 0.3);
    cloud.setScale(0.5 + Math.random() * 0.8);
    cloud.setDepth(0);
    this.clouds.push({ sprite: cloud, speed: 0.15 + Math.random() * 0.1, baseY: y });
  }

  private addTree(x: number, y: number): void {
    const tree = this.scene.add.image(x, y, 'jungle-tree');
    tree.setOrigin(0, 0.5);
    tree.setScale(0.8 + Math.random() * 0.4);
    tree.setDepth(0);
    this.trees.push({ sprite: tree, speed: 0.4, baseY: y });
  }

  private addFlower(x: number, y: number): void {
    const flower = this.scene.add.image(x, y, 'flower');
    flower.setScale(0.6 + Math.random() * 0.4);
    flower.setDepth(0);
    this.flowers.push({ sprite: flower, speed: 0.3, baseY: y });
  }

  update(cameraY: number): void {
    const deltaY = cameraY - this.lastCameraY;
    this.lastCameraY = cameraY;

    // Update trunk position
    this.trunkTiles.y = cameraY;
    this.trunkTiles.tilePositionY -= deltaY;

    // Parallax for clouds (slow)
    for (const cloud of this.clouds) {
      cloud.sprite.y += deltaY * (1 - cloud.speed);
      // Also drift horizontally
      cloud.sprite.x += (cloud.speed - 0.1) * 0.3;
      if (cloud.sprite.x > GAME.WIDTH + 60) cloud.sprite.x = -60;
    }

    // Parallax for trees (medium)
    for (const tree of this.trees) {
      tree.sprite.y += deltaY * (1 - tree.speed);
    }

    // Parallax for flowers
    for (const flower of this.flowers) {
      flower.sprite.y += deltaY * (1 - flower.speed);
    }

    // Recycle elements that are too far below camera
    const recycleThreshold = cameraY + GAME.HEIGHT;
    const spawnThreshold = cameraY - GAME.HEIGHT * 1.5;

    for (const cloud of this.clouds) {
      if (cloud.sprite.y > recycleThreshold) {
        cloud.sprite.y = spawnThreshold - Phaser.Math.Between(0, 200);
        cloud.sprite.x = Phaser.Math.Between(10, GAME.WIDTH - 10);
      }
    }

    for (const tree of this.trees) {
      if (tree.sprite.y > recycleThreshold) {
        tree.sprite.y = spawnThreshold - Phaser.Math.Between(0, 300);
        const side = Math.random() > 0.5 ? -10 : GAME.WIDTH - 50;
        tree.sprite.x = side;
      }
    }

    for (const flower of this.flowers) {
      if (flower.sprite.y > recycleThreshold) {
        flower.sprite.y = spawnThreshold - Phaser.Math.Between(0, 150);
        flower.sprite.x = Phaser.Math.Between(5, GAME.WIDTH - 5);
      }
    }
  }

  destroy(): void {
    for (const c of this.clouds) c.sprite.destroy();
    for (const t of this.trees) t.sprite.destroy();
    for (const f of this.flowers) f.sprite.destroy();
    this.trunkTiles.destroy();
  }
}
