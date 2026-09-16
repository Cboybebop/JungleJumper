export const MIKO_ANIMATIONS = {
  idle: 'miko-idle',
  anticipation: 'miko-anticipation',
  jumpAscent: 'miko-jump-ascent',
  apex: 'miko-apex',
  fall: 'miko-fall',
  landing: 'miko-landing',
  run: 'miko-run',
  doubleJump: 'miko-double-jump',
  springLaunch: 'miko-spring-launch',
  shielded: 'miko-shielded',
  hit: 'miko-hit',
  defeat: 'miko-defeat',
  celebration: 'miko-celebration',
} as const;

export type MikoAnimation = typeof MIKO_ANIMATIONS[keyof typeof MIKO_ANIMATIONS];
export type MikoAction = 'anticipation' | 'landing' | 'doubleJump' | 'springLaunch' |
  'shielded' | 'hit' | 'defeat' | 'celebration' | null;

export interface MikoAnimationState {
  alive: boolean;
  onGround: boolean;
  velocityX: number;
  velocityY: number;
  action: MikoAction;
}

/** Pure state selector kept separate from Phaser so transitions can be unit tested. */
export function selectMikoAnimation(state: MikoAnimationState): MikoAnimation {
  if (!state.alive || state.action === 'defeat') return MIKO_ANIMATIONS.defeat;
  if (state.action) return MIKO_ANIMATIONS[state.action];
  if (state.onGround) {
    return Math.abs(state.velocityX) > 1 ? MIKO_ANIMATIONS.run : MIKO_ANIMATIONS.idle;
  }
  if (Math.abs(state.velocityY) <= 55) return MIKO_ANIMATIONS.apex;
  return state.velocityY < 0 ? MIKO_ANIMATIONS.jumpAscent : MIKO_ANIMATIONS.fall;
}
