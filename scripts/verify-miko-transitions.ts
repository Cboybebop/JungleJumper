import assert from 'node:assert/strict';
import {
  MIKO_ANIMATIONS as A,
  type MikoAnimationState,
  selectMikoAnimation,
} from '../src/graphics/MikoAnimationState';

const base: MikoAnimationState = {
  alive: true,
  onGround: true,
  velocityX: 0,
  velocityY: 0,
  action: null,
};

const expected = [
  A.idle, A.anticipation, A.jumpAscent, A.apex, A.fall, A.landing,
  A.doubleJump, A.springLaunch, A.shielded, A.hit, A.defeat,
];
const states: MikoAnimationState[] = [
  base,
  { ...base, action: 'anticipation' },
  { ...base, onGround: false, velocityY: -300 },
  { ...base, onGround: false, velocityY: 10 },
  { ...base, onGround: false, velocityY: 300 },
  { ...base, action: 'landing' },
  { ...base, onGround: false, action: 'doubleJump' },
  { ...base, onGround: false, action: 'springLaunch' },
  { ...base, action: 'shielded' },
  { ...base, action: 'hit' },
  { ...base, alive: false, action: 'defeat' },
];

for (const direction of [-1, 1]) {
  assert.deepEqual(
    states.map((state) => selectMikoAnimation(state)),
    expected,
    `transition sequence should be identical while facing ${direction < 0 ? 'left' : 'right'}`,
  );
  assert.equal(selectMikoAnimation({ ...base, velocityX: direction * 120 }), A.run);
}

assert.equal(selectMikoAnimation({ ...base, action: 'celebration' }), A.celebration);
console.log('Verified Miko movement and action transitions at left and right orientations.');
