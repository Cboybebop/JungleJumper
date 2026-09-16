import Phaser from 'phaser';
import { BACKGROUND_IMAGE_ASSETS } from './WorldAssets';

export const backgroundKey = (texture: string, biome: number): string => `${texture}-biome-${biome}`;

/** Bake color multiplication into the original layered art for Canvas/WebGL parity. */
export function generatePixelBackgrounds(scene: Phaser.Scene, palettes: readonly Record<string, number>[]): void {
  const names = ['sky', 'distantCanopy', 'mist', 'midTrees', 'trunkStructures', 'foregroundLeaves', 'lightShafts', 'landmarks'];
  BACKGROUND_IMAGE_ASSETS.forEach(([texture], layer) => {
    const source = scene.textures.get(texture).getSourceImage() as HTMLImageElement;
    palettes.forEach((palette, biome) => {
      const key = backgroundKey(texture, biome);
      if (scene.textures.exists(key)) return;
      const target = scene.textures.createCanvas(key, source.width, source.height)!;
      const context = target.context;
      context.drawImage(source, 0, 0);
      const pixels = context.getImageData(0, 0, source.width, source.height);
      const tint = palette[names[layer]];
      const factors = [(tint >> 16) & 255, (tint >> 8) & 255, tint & 255];
      for (let i = 0; i < pixels.data.length; i += 4) {
        for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.round(pixels.data[i + c] * factors[c] / 255);
      }
      context.putImageData(pixels, 0, 0);
      target.refresh();
    });
  });
}
