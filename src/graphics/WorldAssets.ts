export const PLATFORM_FRAME_WIDTH = 80;
export const PLATFORM_FRAME_HEIGHT = 24;
export const PLATFORM_FRAME_COUNT = 4;

export const PLATFORM_TEXTURES = [
  'platform-normal',
  'platform-moving',
  'platform-crumbling',
  'platform-spring',
] as const;

export const WORLD_IMAGE_ASSETS = [
  ['world-trunk-0', 'trunk-0.png'],
  ['world-trunk-1', 'trunk-1.png'],
  ['world-trunk-2', 'trunk-2.png'],
  ['world-trunk-3', 'trunk-3.png'],
  ['world-vine-curled', 'vine-curled.png'],
  ['world-vine-twisting', 'vine-twisting.png'],
  ['world-leaves-small', 'leaves-small.png'],
  ['world-leaves-large', 'leaves-large.png'],
  ['world-flower-pink', 'flower-pink.png'],
  ['world-flower-gold', 'flower-gold.png'],
  ['world-fruit-berries', 'fruit-berries.png'],
  ['world-fruit-orange', 'fruit-orange.png'],
  ['world-moss', 'moss.png'],
  ['world-stones', 'stones.png'],
  ['world-canopy-left', 'canopy-left.png'],
  ['world-canopy-right', 'canopy-right.png'],
  ['world-canopy-distant-left', 'canopy-distant-left.png'],
  ['world-canopy-distant-right', 'canopy-distant-right.png'],
  ['world-cloud', 'cloud.png'],
  ['world-jungle-silhouette', 'jungle-silhouette.png'],
] as const;

export type WorldImageKey = typeof WORLD_IMAGE_ASSETS[number][0];

