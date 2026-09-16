import Phaser from 'phaser';
import { CHARACTERS, type Character } from '../constants';
import { ANIMATION_SUFFIXES, type AnimationState } from './MikoAnimationState';

export { MIKO_ANIMATIONS, selectAnimationState, selectMikoAnimation } from './MikoAnimationState';
export type { AnimationState, CharacterAction, MikoAction } from './MikoAnimationState';

export const MIKO_TEXTURE = CHARACTERS[0].texture;

export function getAnimationKey(character: Character, state: AnimationState): string {
  return `${character.animationPrefix}-${ANIMATION_SUFFIXES[state]}`;
}

interface AnimationDefinition {
  state: AnimationState;
  start: number;
  end: number;
  frameRate: number;
  repeat?: number;
}

const DEFINITIONS: AnimationDefinition[] = [
  { state: 'idle', start: 0, end: 1, frameRate: 3, repeat: -1 },
  { state: 'anticipation', start: 2, end: 2, frameRate: 12 },
  { state: 'jumpAscent', start: 3, end: 4, frameRate: 10, repeat: -1 },
  { state: 'apex', start: 5, end: 5, frameRate: 10 },
  { state: 'fall', start: 6, end: 7, frameRate: 8, repeat: -1 },
  { state: 'landing', start: 8, end: 9, frameRate: 14 },
  { state: 'run', start: 10, end: 13, frameRate: 12, repeat: -1 },
  { state: 'doubleJump', start: 14, end: 15, frameRate: 14 },
  { state: 'springLaunch', start: 16, end: 16, frameRate: 12 },
  { state: 'shielded', start: 17, end: 18, frameRate: 8, repeat: -1 },
  { state: 'hit', start: 19, end: 19, frameRate: 12 },
  { state: 'defeat', start: 20, end: 21, frameRate: 5, repeat: -1 },
  { state: 'celebration', start: 22, end: 23, frameRate: 6, repeat: -1 },
];

export function registerAnimations(scene: Phaser.Scene): void {
  for (const character of CHARACTERS) {
    if (!scene.textures.exists(character.texture)) continue;
    for (const definition of DEFINITIONS) {
      const key = getAnimationKey(character, definition.state);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(character.texture, {
          start: definition.start,
          end: definition.end,
        }),
        frameRate: definition.frameRate,
        repeat: definition.repeat ?? 0,
      });
    }
  }
}
