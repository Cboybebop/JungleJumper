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

export type EnemyAnimationState = 'idle' | 'patrol' | 'attack' | 'hit' | 'defeat';

export const ENEMY_TEXTURES = {
  snake: 'snake-actions',
  coconut: 'coconut-actions',
  thorns: 'thorn-vine-actions',
  bat: 'bat-actions',
} as const;

export const EFFECT_TEXTURES = {
  shieldIdle: 'shield-idle',
  shieldPickupBurst: 'shield-pickup-burst',
  shieldShell: 'shield-shell',
  warning: 'warning-indicator',
  impact: 'impact-burst',
  damageFlash: 'damage-flash',
} as const;

export const EFFECT_ANIMATIONS = {
  shieldIdle: 'effect-shield-idle',
  shieldPickupBurst: 'effect-shield-pickup-burst',
  shieldShell: 'effect-shield-shell',
  warning: 'effect-warning',
  impact: 'effect-impact',
  damageFlash: 'effect-damage-flash',
} as const;

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

const ENEMY_DEFINITIONS: Record<EnemyAnimationState, { start: number; end: number; frameRate: number; repeat?: number }> = {
  idle: { start: 0, end: 1, frameRate: 3, repeat: -1 },
  patrol: { start: 0, end: 2, frameRate: 7, repeat: -1 },
  attack: { start: 3, end: 4, frameRate: 10 },
  hit: { start: 5, end: 5, frameRate: 12 },
  defeat: { start: 6, end: 7, frameRate: 5 },
};

const EFFECT_DEFINITIONS = [
  { key: EFFECT_ANIMATIONS.shieldIdle, texture: EFFECT_TEXTURES.shieldIdle, start: 0, end: 3, frameRate: 6, repeat: -1 },
  { key: EFFECT_ANIMATIONS.shieldPickupBurst, texture: EFFECT_TEXTURES.shieldPickupBurst, start: 0, end: 5, frameRate: 18, repeat: 0 },
  { key: EFFECT_ANIMATIONS.shieldShell, texture: EFFECT_TEXTURES.shieldShell, start: 0, end: 3, frameRate: 8, repeat: -1 },
  { key: EFFECT_ANIMATIONS.warning, texture: EFFECT_TEXTURES.warning, start: 0, end: 3, frameRate: 8, repeat: -1 },
  { key: EFFECT_ANIMATIONS.impact, texture: EFFECT_TEXTURES.impact, start: 0, end: 5, frameRate: 20, repeat: 0 },
  { key: EFFECT_ANIMATIONS.damageFlash, texture: EFFECT_TEXTURES.damageFlash, start: 0, end: 3, frameRate: 18, repeat: 0 },
] as const;

export function getEnemyAnimationKey(type: keyof typeof ENEMY_TEXTURES, state: EnemyAnimationState): string {
  return `${type}-${state}`;
}

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

  for (const [type, texture] of Object.entries(ENEMY_TEXTURES) as [keyof typeof ENEMY_TEXTURES, string][]) {
    if (!scene.textures.exists(texture)) continue;
    for (const [state, definition] of Object.entries(ENEMY_DEFINITIONS) as [EnemyAnimationState, typeof ENEMY_DEFINITIONS[EnemyAnimationState]][]) {
      const key = getEnemyAnimationKey(type, state);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(texture, { start: definition.start, end: definition.end }),
        frameRate: definition.frameRate,
        repeat: definition.repeat ?? 0,
      });
    }
  }

  for (const definition of EFFECT_DEFINITIONS) {
    if (!scene.textures.exists(definition.texture) || scene.anims.exists(definition.key)) continue;
    scene.anims.create({
      key: definition.key,
      frames: scene.anims.generateFrameNumbers(definition.texture, { start: definition.start, end: definition.end }),
      frameRate: definition.frameRate,
      repeat: definition.repeat,
    });
  }
}
