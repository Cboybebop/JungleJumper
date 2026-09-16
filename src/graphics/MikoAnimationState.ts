export const ANIMATION_SUFFIXES = {
  idle: 'idle',
  anticipation: 'anticipation',
  jumpAscent: 'jump',
  apex: 'apex',
  fall: 'fall',
  landing: 'land',
  run: 'run',
  doubleJump: 'double-jump',
  springLaunch: 'spring-launch',
  shielded: 'shielded',
  hit: 'hit',
  defeat: 'defeat',
  celebration: 'celebration',
} as const;

export type AnimationState = keyof typeof ANIMATION_SUFFIXES;

export const MIKO_ANIMATIONS = {
  idle: 'miko-idle',
  anticipation: 'miko-anticipation',
  jumpAscent: 'miko-jump',
  apex: 'miko-apex',
  fall: 'miko-fall',
  landing: 'miko-land',
  run: 'miko-run',
  doubleJump: 'miko-double-jump',
  springLaunch: 'miko-spring-launch',
  shielded: 'miko-shielded',
  hit: 'miko-hit',
  defeat: 'miko-defeat',
  celebration: 'miko-celebration',
} as const;

export type MikoAnimation = typeof MIKO_ANIMATIONS[keyof typeof MIKO_ANIMATIONS];
export type CharacterAction = 'anticipation' | 'landing' | 'doubleJump' | 'springLaunch' |
  'shielded' | 'hit' | 'defeat' | 'celebration' | null;
export type MikoAction = CharacterAction;

export interface CharacterAnimationState {
  alive: boolean;
  onGround: boolean;
  velocityX: number;
  velocityY: number;
  action: CharacterAction;
}
export type MikoAnimationState = CharacterAnimationState;

/** Pure shared selector kept separate from Phaser so every character uses identical transitions. */
export function selectAnimationState(state: CharacterAnimationState): AnimationState {
  if (!state.alive || state.action === 'defeat') return 'defeat';
  if (state.action) return state.action;
  if (state.onGround) return Math.abs(state.velocityX) > 1 ? 'run' : 'idle';
  if (Math.abs(state.velocityY) <= 55) return 'apex';
  return state.velocityY < 0 ? 'jumpAscent' : 'fall';
}

/** Backwards-compatible Miko-specific view used by the existing transition test. */
export function selectMikoAnimation(state: MikoAnimationState): MikoAnimation {
  return MIKO_ANIMATIONS[selectAnimationState(state)];
}
