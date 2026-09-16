// Contract tests with a minimal scene adapter; no browser or renderer required.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const stored = new Map();
globalThis.localStorage = { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) };
globalThis.window = { matchMedia: () => ({ matches: true }) };
globalThis.__feedbackPhaser = {
  Math: { Clamp: (v, min, max) => Math.max(min, Math.min(max, v)), Vector2: class { constructor(x, y) { this.x = x; this.y = y; } } },
  Display: { Color: { IntegerToRGB: () => ({ r: 100, g: 150, b: 200 }) } },
};
const result = await build({
  stdin: { contents: `export { FeedbackManager } from './src/systems/FeedbackManager'; export { SettingsManager } from './src/systems/SettingsManager';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'scene-adapter', setup(b) {
    b.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export default globalThis.__feedbackPhaser;' }));
  } }],
});
const { FeedbackManager, SettingsManager } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
SettingsManager.init();
assert.equal(SettingsManager.getReducedMotion(), true, 'OS preference is the default');
SettingsManager.setReducedMotion(false);
SettingsManager.init();
assert.equal(SettingsManager.getReducedMotion(), false, 'explicit preference persists');

const objects = [], tweens = [], timers = [], shakes = [], flashes = [];
function object() {
  const o = { active: true, visible: true, destroy() { this.destroyed = true; } };
  for (const method of ['setDepth','setOrigin','setTexture','setRotation','clearTint','setTint','setText']) o[method] = () => o;
  for (const [method, key] of [['setActive','active'], ['setVisible','visible'], ['setAlpha','alpha']]) o[method] = v => { o[key] = v; return o; };
  o.setScale = (x, y = x) => { o.scaleX = x; o.scaleY = y; return o; };
  o.setPosition = (x, y) => { o.x = x; o.y = y; return o; };
  objects.push(o); return o;
}
const camera = { width: 1920, height: 1080, flashEffect: {}, shake: (...args) => shakes.push(args), flash: (...args) => flashes.push(args) };
const scene = {
  textures: { exists: () => true }, add: { sprite: object, text: object }, cameras: { main: camera },
  tweens: { add: t => tweens.push(t), killTweensOf: o => { for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].targets === o) tweens.splice(i, 1); } },
  time: { now: 0, delayedCall: (duration, callback) => { const t = { duration, callback, remove() { this.removed = true; } }; timers.push(t); return t; } },
  physics: { world: { isPaused: false }, pause() { this.world.isPaused = true; }, resume() { this.world.isPaused = false; } },
};
const fx = new FeedbackManager(scene);
const allocationCount = objects.length;
for (let i = 0; i < 100; i++) { fx.burst(0, 0, 0xffffff, 20); fx.label(0, 0, 'SHIELD'); }
assert.equal(objects.length, allocationCount, 'bursts cannot allocate beyond the pool');
assert.equal(tweens.length, allocationCount, 'pool exhaustion drops effects');
for (const t of tweens.splice(0)) t.onComplete();
fx.burst(0, 0, 0xffffff);
assert.equal(tweens.length, 8, 'completed sprites are reused');
fx.impulse(100, 1000); fx.impulse(100);
assert.equal(shakes.length, 1, 'repeated impulses are throttled');
assert.equal(shakes[0][0], 120);
assert.equal(shakes[0][1].x * camera.width, 3, 'shake has a viewport-independent pixel cap');
fx.hitStop(1000); fx.hitStop(1000);
assert.equal(timers.length, 1); assert.equal(timers[0].duration, 55);
assert.equal(scene.physics.world.isPaused, true);
fx.cancelHitStop(); assert.equal(scene.physics.world.isPaused, false);
scene.physics.pause(); scene.time.now += 500; fx.hitStop();
assert.equal(timers.length, 1, 'does not own or resume an existing pause');
fx.cancelHitStop(); assert.equal(scene.physics.world.isPaused, true); scene.physics.resume();
SettingsManager.setReducedMotion(true);
const before = tweens.length;
fx.impulse(3); fx.flash(0xffffff); fx.hitStop(); fx.trail(0, 0); fx.label(0, 0, 'SHIELD BROKEN');
assert.equal(shakes.length, 1); assert.equal(flashes.length, 0); assert.equal(timers.length, 1);
assert.equal(tweens.length, before + 1, 'reduced motion retains informative labels but omits trails');
const sprite = object(); fx.squash(sprite, 1.12, 0.88);
assert.equal(sprite.scaleX, 1); assert.equal(sprite.scaleY, 1);
SettingsManager.setReducedMotion(false); scene.time.now += 500; fx.hitStop();
fx.destroy(); assert.equal(scene.physics.world.isPaused, false, 'shutdown releases an owned hit-stop');
assert.equal(objects.slice(0, allocationCount).every(o => o.destroyed), true);
console.log('Verified feedback pool reuse, camera caps, hit-stop ownership, cleanup, and reduced-motion persistence.');
