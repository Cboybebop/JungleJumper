import assert from 'node:assert/strict';
import EventEmitter from 'eventemitter3';
import { build } from 'esbuild';
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.__transitionPhaser = {
  Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy', UPDATE: 'update' } },
  Input: { Keyboard: { KeyCodes: {}, JustDown: key => { const down = key.justDown; key.justDown = false; return down; } } },
};
const bundle = await build({
  stdin: { contents: `export { SceneTransition } from './src/ui/SceneTransition';
    export { MenuNavigator } from './src/systems/MenuNavigator';
    export { SettingsManager } from './src/systems/SettingsManager';
    export { getRunProgress } from './src/ui/RunProgress';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'phaser-adapter', setup(b) {
    b.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export default globalThis.__transitionPhaser;' }));
  } }],
});
const { SceneTransition, MenuNavigator, SettingsManager, getRunProgress } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
function makeScene() {
  const starts = [], tweens = [], objects = [];
  return {
    starts, queued: tweens, objects, events: new EventEmitter(), input: { enabled: true }, sys: { isActive: () => true },
    cameras: { main: { width: 320, height: 480 } },
    scene: { start: (...args) => starts.push(args) },
    add: { graphics() {
      const g = { destroyed: false, destroy() { this.destroyed = true; } };
      for (const method of ['setScrollFactor','setDepth','clear','fillStyle','fillRect','fillEllipse','lineStyle','lineBetween']) g[method] = () => g;
      objects.push(g); return g;
    } },
    tweens: { add(config) { const tween = { ...config, stop() { this.stopped = true; } }; tweens.push(tween); return tween; } },
  };
}
for (const style of ['leaf', 'palette', 'mosaic']) {
  const s = makeScene(); SceneTransition.install(s);
  assert.equal(SceneTransition.start(s, 'Game', { score: 123 }, style), true);
  for (let i = 0; i < 30; i++) assert.equal(SceneTransition.start(s, 'MainMenu'), false);
  assert.equal(s.input.enabled, false); assert.equal(s.queued.length, 1);
  const t = s.queued[0]; assert.equal(t.duration, 180);
  for (const value of [0, 0.5, 1]) { t.targets.value = value; t.onUpdate(); }
  t.onComplete(); assert.deepEqual(s.starts, [['Game', { score: 123 }]]);
  s.events.emit('shutdown'); assert.ok(t.stopped && s.objects[0].destroyed);
  SceneTransition.install(s); assert.equal(s.input.enabled, true);
  assert.equal(SceneTransition.start(s, 'GameOver'), true, 'restart releases the previous run lock');
}
SettingsManager.setReducedMotion(true);
const reduced = makeScene(); SceneTransition.start(reduced, 'Settings');
assert.equal(reduced.queued[0].duration, 100);
reduced.queued[0].targets.value = 0.5; reduced.queued[0].onUpdate();
SettingsManager.setReducedMotion(false);
const inactive = makeScene(); inactive.sys.isActive = () => false;
assert.equal(SceneTransition.start(inactive, 'Game'), false); assert.equal(inactive.queued.length, 0);

const scene = makeScene(); SceneTransition.install(scene);
let activations = 0;
const nav = new MenuNavigator(scene, [{ onFocus() {}, onBlur() {}, activate() { activations++; SceneTransition.start(scene, 'Game'); } }]);
nav.enterKey = { isDown: true, justDown: true };
nav.handleKeyboard(); assert.equal(activations, 0, 'held confirm on scene entry is ignored');
nav.enterKey.isDown = false; nav.handleKeyboard();
nav.enterKey.isDown = true; nav.enterKey.justDown = true; nav.update();
assert.equal(activations, 1); nav.update(); assert.equal(activations, 1);
scene.events.emit('shutdown');
const padScene = makeScene(); const pad = { connected: true, A: true, buttons: [], leftStick: {} };
const padNav = new MenuNavigator(padScene, [{ onFocus() {}, onBlur() {}, activate() { activations++; } }]);
padNav.gamepad = pad; padNav.update(); assert.equal(activations, 1, 'held gamepad A is ignored');
pad.A = false; padNav.update(); pad.A = true; padNav.update(); padNav.update();
assert.equal(activations, 2, 'one activation per gamepad press'); padNav.destroy();
for (const [height, label, count] of [[0,'Lower Jungle',0],[99,'Lower Jungle',0],[100,'Lower Jungle',1],[120,'Bright Canopy',1],[320,'Misty Heights',3],[600,'Sunset Canopy',6],[900,'Night Storm',9],[1500,'Night Storm',15]]) {
  const p = getRunProgress(height); assert.equal(p.biome.label, label); assert.equal(p.milestones, count);
}
console.log('Verified all transition styles, duplicate locking, restart/cleanup, held keyboard/gamepad guards, reduced motion and milestone/biome boundaries.');


