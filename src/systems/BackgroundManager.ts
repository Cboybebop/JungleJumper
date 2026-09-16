import Phaser from 'phaser';
import { RUN_BIOMES } from '../ui/RunProgress';
import { SettingsManager } from './SettingsManager';
import { COLORS, GAME } from '../constants';
import { backgroundKey } from '../graphics/PixelBackgrounds';

export type BackgroundBiome = 'lower-jungle' | 'bright-canopy' | 'misty-heights' | 'sunset-canopy' | 'night-storm';
export type BackgroundRepeatBehavior =
  | { mode: 'fixed' }
  | { mode: 'vertical-tile' }
  | { mode: 'pooled-landmark'; spacing: number; poolSize: number };

export interface BackgroundLayerConfig {
  texture: string;
  depth: number;
  parallaxFactor: number;
  tint: number;
  alpha: number;
  repeatBehavior: BackgroundRepeatBehavior;
  biomeAvailability: readonly BackgroundBiome[];
}

type LayerName = 'sky' | 'distantCanopy' | 'mist' | 'midTrees' | 'trunkStructures' | 'foregroundLeaves' | 'lightShafts' | 'landmarks';
interface AltitudeBand {
  biome: BackgroundBiome;
  startsAt: number;
  skyColor: number;
  palette: Record<LayerName, number>;
  alpha: Partial<Record<LayerName, number>>;
}
interface ManagedLayer {
  name: LayerName;
  config: BackgroundLayerConfig;
  objects: (Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite)[];
}

const ALL_BIOMES: readonly BackgroundBiome[] = ['lower-jungle', 'bright-canopy', 'misty-heights', 'sunset-canopy', 'night-storm'];
export const BACKGROUND_LAYERS: Readonly<Record<LayerName, BackgroundLayerConfig>> = {
  sky: { texture: 'background-sky-gradient', depth: -30, parallaxFactor: 0, tint: 0xffffff, alpha: 1, repeatBehavior: { mode: 'fixed' }, biomeAvailability: ALL_BIOMES },
  distantCanopy: { texture: 'background-distant-canopy', depth: -24, parallaxFactor: 0.05, tint: 0x6f8f91, alpha: 0.18, repeatBehavior: { mode: 'vertical-tile' }, biomeAvailability: ALL_BIOMES },
  landmarks: { texture: 'background-landmarks', depth: -22, parallaxFactor: 0.08, tint: 0x617b83, alpha: 0.24, repeatBehavior: { mode: 'pooled-landmark', spacing: 1500, poolSize: 2 }, biomeAvailability: ['misty-heights', 'sunset-canopy', 'night-storm'] },
  mist: { texture: 'background-mist', depth: -20, parallaxFactor: 0.1, tint: 0xb8d5d5, alpha: 0.15, repeatBehavior: { mode: 'vertical-tile' }, biomeAvailability: ['bright-canopy', 'misty-heights', 'night-storm'] },
  midTrees: { texture: 'background-mid-trees', depth: -18, parallaxFactor: 0.14, tint: 0x557a73, alpha: 0.3, repeatBehavior: { mode: 'vertical-tile' }, biomeAvailability: ['bright-canopy', 'misty-heights'] },
  trunkStructures: { texture: 'background-trunk-structures', depth: -16, parallaxFactor: 0.2, tint: 0x52655f, alpha: 0.22, repeatBehavior: { mode: 'vertical-tile' }, biomeAvailability: ['lower-jungle', 'night-storm'] },
  lightShafts: { texture: 'background-light-shafts', depth: -14, parallaxFactor: 0.24, tint: 0xffefbd, alpha: 0.1, repeatBehavior: { mode: 'vertical-tile' }, biomeAvailability: ['bright-canopy', 'sunset-canopy'] },
  foregroundLeaves: { texture: 'background-foreground-leaves', depth: -8, parallaxFactor: 0.34, tint: 0x66866a, alpha: 0.28, repeatBehavior: { mode: 'vertical-tile' }, biomeAvailability: ['sunset-canopy'] },
};

const BASE: Record<LayerName, number> = { sky: 0xffffff, distantCanopy: 0x60817f, mist: 0xb7d4d1, midTrees: 0x55766d, trunkStructures: 0x4a5e58, foregroundLeaves: 0x668064, lightShafts: 0xffefc2, landmarks: 0x5c7480 };
export const ALTITUDE_BANDS: readonly AltitudeBand[] = [
  { biome: 'lower-jungle', startsAt: RUN_BIOMES[0].startsAt, skyColor: 0x2f7e86, palette: { ...BASE, sky: 0x80c7ca, mist: 0x86aaa6, lightShafts: 0xb7cba7 }, alpha: { distantCanopy: 0.55, trunkStructures: 0.7 } },
  { biome: 'bright-canopy', startsAt: RUN_BIOMES[1].startsAt, skyColor: 0x82d7dc, palette: { ...BASE, sky: 0xffffff, distantCanopy: 0x739b86, lightShafts: 0xfff0b5 }, alpha: { distantCanopy: 0.45, midTrees: 0.65, mist: 0.35, lightShafts: 0.8 } },
  { biome: 'misty-heights', startsAt: RUN_BIOMES[2].startsAt, skyColor: 0x91b8c2, palette: { ...BASE, sky: 0xc8dadd, distantCanopy: 0x708990, mist: 0xc8dcdf, midTrees: 0x637b7c }, alpha: { distantCanopy: 0.35, mist: 0.75, midTrees: 0.55, landmarks: 0.5 } },
  { biome: 'sunset-canopy', startsAt: RUN_BIOMES[3].startsAt, skyColor: 0xd88979, palette: { ...BASE, sky: 0xf0a58c, distantCanopy: 0x745f72, mist: 0xb58b91, midTrees: 0x564e65, lightShafts: 0xffc17c, landmarks: 0x514c68 }, alpha: { distantCanopy: 0.4, foregroundLeaves: 0.65, lightShafts: 0.75, landmarks: 0.5 } },
  { biome: 'night-storm', startsAt: RUN_BIOMES[4].startsAt, skyColor: 0x182945, palette: { ...BASE, sky: 0x33486b, distantCanopy: 0x37495d, mist: 0x7085a0, midTrees: 0x334657, trunkStructures: 0x293946, foregroundLeaves: 0x354b4c, lightShafts: 0x6d87a1, landmarks: 0x29374d }, alpha: { distantCanopy: 0.35, mist: 0.45, trunkStructures: 0.6, landmarks: 0.6 } },
];

const TRUNK_KEYS = ['world-trunk-0', 'world-trunk-1', 'world-trunk-2', 'world-trunk-3'] as const;
const ACCENT_KEYS = ['world-vine-curled', 'world-vine-twisting', 'world-leaves-small', 'world-leaves-large', 'world-flower-pink', 'world-flower-gold', 'world-fruit-berries', 'world-fruit-orange', 'world-moss'] as const;

export class BackgroundManager {
  private managedLayers: ManagedLayer[] = [];
  private fallback: Phaser.GameObjects.TileSprite | null = null;
  private trunkSegments: Phaser.GameObjects.Image[] = [];
  private treeAccents: Phaser.GameObjects.Image[] = [];
  private trunkVariant = 0;
  private appliedTextures = new WeakMap<Phaser.GameObjects.GameObject, string>();

  constructor(private scene: Phaser.Scene) {
    scene.cameras.main.setBackgroundColor(COLORS.SKY);
    if (this.rasterSetIsValid()) this.createRasterLayers(); else this.createProceduralFallback();
    this.createContinuousTrunk();
    this.createTreeAccentPool();
  }

  private rasterSetIsValid(): boolean {
    return Object.values(BACKGROUND_LAYERS).every(({ texture }) => {
      if (!this.scene.textures.exists(texture)) return false;
      const loaded = this.scene.textures.get(texture);
      return loaded.key !== '__MISSING' && Boolean(loaded.getSourceImage());
    });
  }

  private createRasterLayers(): void {
    for (const [name, config] of Object.entries(BACKGROUND_LAYERS) as [LayerName, BackgroundLayerConfig][]) {
      const objects: (Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite)[] = [];
      // Two fixed banks crossfade baked biome palettes without renderer-specific tinting.
      for (let bank = 0; bank < 2; bank++) {
        if (config.repeatBehavior.mode === 'vertical-tile') {
          objects.push(this.scene.add.tileSprite(0, 0, GAME.WIDTH, GAME.HEIGHT, config.texture).setOrigin(0));
        } else {
          const count = config.repeatBehavior.mode === 'fixed' ? 1 : config.repeatBehavior.poolSize;
          for (let i = 0; i < count; i++) objects.push(this.scene.add.image(0, 0, config.texture).setOrigin(0));
        }
      }
      for (const object of objects) {
        object.setScrollFactor(0).setDepth(config.depth).setAlpha(config.alpha);
        this.appliedTextures.set(object, config.texture);
      }
      this.managedLayers.push({ name, config, objects });
    }
  }

  private createProceduralFallback(): void {
    if (!this.scene.textures.exists('canopy-far')) return;
    this.fallback = this.scene.add.tileSprite(0, 0, GAME.WIDTH, GAME.HEIGHT, 'canopy-far');
    this.fallback.setOrigin(0).setScrollFactor(0).setDepth(-20).setTint(0x456f70).setAlpha(0.55);
  }

  private createContinuousTrunk(): void {
    for (let y = -GAME.HEIGHT * 2; y <= GAME.HEIGHT * 2; y += 96) {
      const segment = this.scene.add.image(GAME.WIDTH / 2, y, this.nextTrunkKey());
      segment.setOrigin(0.5, 0).setDepth(1);
      this.trunkSegments.push(segment);
    }
  }

  private createTreeAccentPool(): void {
    for (let i = 0; i < 18; i++) {
      const left = i % 2 === 0;
      const x = GAME.WIDTH / 2 + (left ? -7 : 7);
      const sprite = this.scene.add.image(x, -i * 92 + Phaser.Math.Between(-20, 20), this.chooseAccent());
      sprite.setOrigin(0.5, 0.15).setFlipX(!left).setDepth(2);
      sprite.setData('swayPhase', i * 1.7);
      this.treeAccents.push(sprite);
    }
  }

  update(cameraY: number, score = 0, previewAltitude?: number): void {
    const altitude = previewAltitude ?? Math.max(score, Math.max(0, -cameraY / 10));
    const { from, to, mix } = this.getBandBlend(altitude);
    this.scene.cameras.main.setBackgroundColor(this.mixColor(from.skyColor, to.skyColor, mix));
    const decorativeY = SettingsManager.getReducedMotion() ? 0 : cameraY;
    for (const layer of this.managedLayers) {
      const bankSize = layer.objects.length / 2;
      layer.objects.forEach((object, index) => {
        const bank = index < bankSize ? 0 : 1;
        const band = bank === 0 ? from : to;
        const key = backgroundKey(layer.config.texture, ALTITUDE_BANDS.indexOf(band));
        if (this.appliedTextures.get(object) !== key) {
          object.setTexture(key);
          this.appliedTextures.set(object, key);
        }
        const weight = bank === 0 ? (layer.name === 'sky' ? 1 : 1 - mix) : mix;
        object.setAlpha(this.bandAlpha(layer, band) * weight);
        if (object instanceof Phaser.GameObjects.TileSprite) object.tilePositionY = Math.round(decorativeY * layer.config.parallaxFactor);
        else if (layer.config.repeatBehavior.mode === 'pooled-landmark') {
          const { spacing, poolSize } = layer.config.repeatBehavior;
          object.y = Math.round(Phaser.Math.Wrap(-decorativeY * layer.config.parallaxFactor + (index % bankSize) * spacing, -GAME.HEIGHT, spacing * poolSize - GAME.HEIGHT));
        }
      });
    }
    if (this.fallback) {
      this.fallback.tilePositionY = decorativeY * 0.06;
      this.fallback.setTint(this.mixColor(from.palette.distantCanopy, to.palette.distantCanopy, mix));
    }
    for (const accent of this.treeAccents) {
      accent.rotation = SettingsManager.getReducedMotion() ? 0 : Math.sin(this.scene.time.now * 0.0014 + accent.getData('swayPhase')) * 0.06;
    }
    this.recycleLivingTree(cameraY);
  }

  private bandAlpha(layer: ManagedLayer, band: AltitudeBand): number {
    return layer.config.biomeAvailability.includes(band.biome)
      ? layer.config.alpha * (band.alpha[layer.name] ?? 1)
      : 0;
  }

  private getBandBlend(altitude: number): { from: AltitudeBand; to: AltitudeBand; mix: number } {
    let index = ALTITUDE_BANDS.length - 1;
    for (let i = 0; i < ALTITUDE_BANDS.length - 1; i++) {
      if (altitude < ALTITUDE_BANDS[i + 1].startsAt) { index = i; break; }
    }
    const from = ALTITUDE_BANDS[index];
    const to = ALTITUDE_BANDS[Math.min(index + 1, ALTITUDE_BANDS.length - 1)];
    const span = Math.max(1, to.startsAt - from.startsAt);
    const linear = Phaser.Math.Clamp((altitude - from.startsAt) / span, 0, 1);
    return { from, to, mix: linear * linear * (3 - 2 * linear) };
  }

  private mixColor(from: number, to: number, amount: number): number {
    const a = Phaser.Display.Color.IntegerToRGB(from);
    const b = Phaser.Display.Color.IntegerToRGB(to);
    return Phaser.Display.Color.GetColor(Math.round(Phaser.Math.Linear(a.r, b.r, amount)), Math.round(Phaser.Math.Linear(a.g, b.g, amount)), Math.round(Phaser.Math.Linear(a.b, b.b, amount)));
  }

  private recycleLivingTree(cameraY: number): void {
    const cameraBottom = cameraY + GAME.HEIGHT / 2;
    for (const segment of this.trunkSegments) {
      if (segment.y > cameraBottom + 96) {
        segment.y = Math.min(...this.trunkSegments.map((item) => item.y)) - 96;
        segment.setTexture(this.nextTrunkKey());
      }
    }
    for (const accent of this.treeAccents) {
      if (accent.y > cameraBottom + 70) {
        accent.y = Math.min(...this.treeAccents.map((item) => item.y)) - Phaser.Math.Between(72, 112);
        accent.setTexture(this.chooseAccent());
      }
    }
  }

  private nextTrunkKey(): string {
    const available = TRUNK_KEYS.filter((key) => this.scene.textures.exists(key));
    if (available.length === 0) return 'world-trunk-0';
    const key = available[this.trunkVariant % available.length];
    this.trunkVariant += 1;
    return key;
  }

  private chooseAccent(): string {
    const available = ACCENT_KEYS.filter((key) => this.scene.textures.exists(key));
    return available.length > 0 ? Phaser.Utils.Array.GetRandom(available) : 'world-leaves-small';
  }

  destroy(): void {
    for (const layer of this.managedLayers) layer.objects.forEach((object) => object.destroy());
    this.fallback?.destroy();
    this.trunkSegments.forEach((segment) => segment.destroy());
    this.treeAccents.forEach((accent) => accent.destroy());
  }
}
