import Phaser from 'phaser';
import { COLORS, GAME } from '../constants';

type Anchor = 'free' | 'edge-left' | 'edge-right' | 'trunk-left' | 'trunk-right';

interface BgElement {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  anchor: Anchor;
  drift?: number;
}

const TRUNK_KEYS = ['world-trunk-0', 'world-trunk-1', 'world-trunk-2', 'world-trunk-3'] as const;
const TREE_ACCENT_KEYS = [
  'world-vine-curled', 'world-vine-twisting', 'world-leaves-small', 'world-leaves-large',
  'world-flower-pink', 'world-flower-gold', 'world-fruit-berries', 'world-fruit-orange',
  'world-moss',
] as const;

const EDGE_VISIBLE_PADDING: Record<string, number> = {
  'world-canopy-left': 23,
  'world-canopy-right': 25,
  'world-canopy-distant-left': 55,
  'world-canopy-distant-right': 53,
};

export class BackgroundManager {
  private clouds: BgElement[] = [];
  private edgeFoliage: BgElement[] = [];
  private treeAccents: BgElement[] = [];
  private trunkSegments: Phaser.GameObjects.Image[] = [];
  private trunkVariant = 0;
  private lastCameraY = 0;

  constructor(private scene: Phaser.Scene) {
    scene.cameras.main.setBackgroundColor(COLORS.SKY);
    this.createContinuousTrunk();
    this.spawnInitialDecorations();
  }

  private createContinuousTrunk(): void {
    const segmentHeight = 96;
    for (let y = -GAME.HEIGHT * 2; y <= GAME.HEIGHT * 2; y += segmentHeight) {
      const key = this.nextTrunkKey();
      const segment = this.scene.add.image(GAME.WIDTH / 2, y, key);
      segment.setOrigin(0.5, 0).setDepth(1);
      this.trunkSegments.push(segment);
    }
  }

  private spawnInitialDecorations(): void {
    for (let i = 0; i < 6; i++) {
      this.addCloud(
        Phaser.Math.Between(42, GAME.WIDTH - 42),
        -i * 220 + Phaser.Math.Between(-80, 80)
      );
    }

    // Large canopy pieces are locked to the screen edges and deliberately cropped,
    // so they read as a continuous jungle border instead of floating stickers.
    for (let i = 0; i < 7; i++) {
      const y = -i * 190 + Phaser.Math.Between(-35, 35);
      this.addEdgeFoliage(true, y, i % 2 === 0);
      this.addEdgeFoliage(false, y - 80, i % 2 !== 0);
    }

    // Small vegetation belongs to the climbable tree. Anchoring it to the trunk
    // restores the sense that platforms and decoration share one living structure.
    for (let i = 0; i < 18; i++) {
      this.addTreeAccent(i % 2 === 0, -i * 92 + Phaser.Math.Between(-20, 20));
    }
  }

  private addCloud(x: number, y: number): void {
    const sprite = this.scene.add.image(x, y, 'world-cloud');
    sprite.setAlpha(0.35 + Math.random() * 0.2);
    sprite.setScale(1).setDepth(0);
    this.clouds.push({
      sprite,
      speed: 0.12 + Math.random() * 0.08,
      drift: 0.04 + Math.random() * 0.06,
      anchor: 'free',
    });
  }

  private addEdgeFoliage(left: boolean, y: number, distant: boolean): void {
    const key = distant
      ? (left ? 'world-canopy-distant-left' : 'world-canopy-distant-right')
      : (left ? 'world-canopy-left' : 'world-canopy-right');
    const padding = EDGE_VISIBLE_PADDING[key] ?? 0;
    const sprite = this.scene.add.image(left ? -padding : GAME.WIDTH + padding, y, key);
    sprite.setOrigin(left ? 0 : 1, 0.5);
    sprite.setAlpha(distant ? 0.55 : 0.88).setDepth(distant ? 0 : 2);
    this.edgeFoliage.push({
      sprite,
      speed: distant ? 0.18 : 0.34,
      anchor: left ? 'edge-left' : 'edge-right',
    });
  }

  private addTreeAccent(left: boolean, y: number): void {
    const key = this.chooseAvailable(TREE_ACCENT_KEYS, 'world-leaves-small');
    const trunkEdge = GAME.WIDTH / 2 + (left ? -GAME.TRUNK_WIDTH / 2 + 2 : GAME.TRUNK_WIDTH / 2 - 2);
    const sprite = this.scene.add.image(trunkEdge, y, key);
    sprite.setOrigin(left ? 1 : 0, 0.5);
    sprite.setFlipX(!left);
    sprite.setAlpha(0.82).setDepth(2);
    this.treeAccents.push({
      sprite,
      speed: 1,
      anchor: left ? 'trunk-left' : 'trunk-right',
    });
  }

  private nextTrunkKey(): string {
    const available = TRUNK_KEYS.filter((key) => this.scene.textures.exists(key));
    if (available.length === 0) return 'world-trunk-0';
    const key = available[this.trunkVariant % available.length];
    this.trunkVariant += 1;
    return key;
  }

  private chooseAvailable(keys: readonly string[], fallback: string): string {
    const available = keys.filter((key) => this.scene.textures.exists(key));
    return available.length > 0 ? Phaser.Utils.Array.GetRandom(available) : fallback;
  }

  update(cameraY: number): void {
    const deltaY = cameraY - this.lastCameraY;
    this.lastCameraY = cameraY;

    for (const cloud of this.clouds) {
      cloud.sprite.y += deltaY * (1 - cloud.speed);
      cloud.sprite.x += cloud.drift ?? 0;
      if (cloud.sprite.x > GAME.WIDTH + 50) cloud.sprite.x = -50;
    }

    for (const foliage of this.edgeFoliage) {
      foliage.sprite.y += deltaY * (1 - foliage.speed);
    }

    const cameraBottom = cameraY + GAME.HEIGHT / 2;
    const spawnY = cameraY - GAME.HEIGHT / 2 - 110;
    for (const segment of this.trunkSegments) {
      if (segment.y > cameraBottom + 96) {
        const highestY = Math.min(...this.trunkSegments.map((item) => item.y));
        segment.y = highestY - 96;
        segment.setTexture(this.nextTrunkKey());
      }
    }

    for (const cloud of this.clouds) {
      if (cloud.sprite.y > cameraBottom + 80) {
        cloud.sprite.y = spawnY - Phaser.Math.Between(0, 180);
        cloud.sprite.x = Phaser.Math.Between(42, GAME.WIDTH - 42);
      }
    }

    for (const foliage of this.edgeFoliage) {
      if (foliage.sprite.y > cameraBottom + 80) {
        foliage.sprite.y = spawnY - Phaser.Math.Between(0, 160);
        const padding = EDGE_VISIBLE_PADDING[foliage.sprite.texture.key] ?? 0;
        foliage.sprite.x = foliage.anchor === 'edge-left' ? -padding : GAME.WIDTH + padding;
      }
    }

    for (const accent of this.treeAccents) {
      if (accent.sprite.y > cameraBottom + 70) {
        const highestY = Math.min(...this.treeAccents.map((item) => item.sprite.y));
        accent.sprite.y = highestY - Phaser.Math.Between(72, 112);
        accent.sprite.setTexture(this.chooseAvailable(TREE_ACCENT_KEYS, 'world-leaves-small'));
      }
    }
  }

  destroy(): void {
    for (const cloud of this.clouds) cloud.sprite.destroy();
    for (const foliage of this.edgeFoliage) foliage.sprite.destroy();
    for (const accent of this.treeAccents) accent.sprite.destroy();
    for (const segment of this.trunkSegments) segment.destroy();
  }
}
