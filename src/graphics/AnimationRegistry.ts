import Phaser from 'phaser';
import { MIKO_ANIMATIONS, type MikoAnimation } from './MikoAnimationState';

export { MIKO_ANIMATIONS, selectMikoAnimation } from './MikoAnimationState';
export type { MikoAction } from './MikoAnimationState';

export const MIKO_TEXTURE = 'miko-actions';

interface AnimationDefinition {
  key: MikoAnimation;
  start: number;
  end: number;
  frameRate: number;
  repeat?: number;
}

const DEFINITIONS: AnimationDefinition[] = [
  { key: MIKO_ANIMATIONS.idle, start: 0, end: 1, frameRate: 3, repeat: -1 },
  { key: MIKO_ANIMATIONS.anticipation, start: 2, end: 2, frameRate: 12 },
  { key: MIKO_ANIMATIONS.jumpAscent, start: 3, end: 4, frameRate: 10, repeat: -1 },
  { key: MIKO_ANIMATIONS.apex, start: 5, end: 5, frameRate: 10 },
  { key: MIKO_ANIMATIONS.fall, start: 6, end: 7, frameRate: 8, repeat: -1 },
  { key: MIKO_ANIMATIONS.landing, start: 8, end: 9, frameRate: 14 },
  { key: MIKO_ANIMATIONS.run, start: 10, end: 13, frameRate: 12, repeat: -1 },
  { key: MIKO_ANIMATIONS.doubleJump, start: 14, end: 15, frameRate: 14 },
  { key: MIKO_ANIMATIONS.springLaunch, start: 16, end: 16, frameRate: 12 },
  { key: MIKO_ANIMATIONS.shielded, start: 17, end: 18, frameRate: 8, repeat: -1 },
  { key: MIKO_ANIMATIONS.hit, start: 19, end: 19, frameRate: 12 },
  { key: MIKO_ANIMATIONS.defeat, start: 20, end: 21, frameRate: 5, repeat: -1 },
  { key: MIKO_ANIMATIONS.celebration, start: 22, end: 23, frameRate: 6, repeat: -1 },
];

export function registerAnimations(scene: Phaser.Scene): void {
  if (!scene.textures.exists(MIKO_TEXTURE)) return;

  for (const definition of DEFINITIONS) {
    if (scene.anims.exists(definition.key)) continue;
    scene.anims.create({
      key: definition.key,
      frames: scene.anims.generateFrameNumbers(MIKO_TEXTURE, {
        start: definition.start,
        end: definition.end,
      }),
      frameRate: definition.frameRate,
      repeat: definition.repeat ?? 0,
    });
  }
}
