import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = 'docs/visual-qa-evidence/release';
await mkdir(root, { recursive: true });
const report = { checks: [], profiles: [], errors: [] };
const check = (name, pass, details) => report.checks.push({ name, pass: !!pass, details });
const browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM });
async function start(page, key, data = {}) {
  await page.evaluate(({ key, data }) => {
    const g = window.__visualQA;
    g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(key, data);
  }, { key, data });
  await page.waitForTimeout(120);
}
try {
  report.browser = browser.version();
  for (const renderer of ['canvas', 'webgl']) {
    console.log(`Release QA: ${renderer}`);
    const context = await browser.newContext({ viewport: { width: 480, height: 800 }, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(`http://127.0.0.1:5173/?qa&renderer=${renderer}`);
    await page.waitForFunction(() => window.__visualQA?.scene.isActive('MainMenu'));
    for (const [index, altitude] of [0,60,120,220,320,460,600,750,900].entries()) {
      await start(page, 'ArtGallery');
      const galleryPage = await page.evaluate(() => window.__visualQA.scene.getScene('ArtGallery').pages.findIndex(p => p.biome === 0));
      await start(page, 'ArtGallery', { page: galleryPage });
      await page.evaluate(altitude => {
        const s = window.__visualQA.scene.getScene('ArtGallery');
        s.update = () => {};
        s.cameras.main.scrollY = 0; s.background.update(400, altitude, altitude);
        const layers = s.background.managedLayers.flatMap(l => l.objects);
        s.children.list.forEach(o => o.setVisible(layers.includes(o)));
      }, altitude);
      await page.waitForTimeout(80);
      await page.screenshot({ path: `${root}/${renderer}-palette-${index}.png` });
    }
    // Restore class update after isolating gallery screenshots.
    await page.reload(); await page.waitForFunction(() => window.__visualQA?.scene.isActive('MainMenu'));
    await start(page, 'Game'); await page.waitForTimeout(500);
    const bodyChecks = await page.evaluate(async () => {
      const { Platform } = await import('/src/entities/Platform.ts');
      const { Obstacle } = await import('/src/entities/Obstacle.ts');
      const s = window.__visualQA.scene.getScene('Game');
      const moving = new Platform(s, 240, 400, 'moving');
      const snake = new Obstacle(s, 240, 300, 'snake');
      const bat = new Obstacle(s, 240, 200, 'bat');
      const objects = [moving, snake, bat];
      const shape = o => JSON.stringify([o.body.width, o.body.height, o.body.offset.x, o.body.offset.y]);
      const before = objects.map(shape);
      for (let i = 0; i < 120; i++) { moving.updatePlatform(); snake.updateObstacle(-1000,-1000); bat.updateObstacle(-1000,-1000); }
      const stable = objects.every((o, i) => shape(o) === before[i]);
      objects.forEach(o => o.destroy());
      const foot = s.player.visual.y;
      const contact = Math.abs(foot - s.player.body.bottom) < .1;
      s.player.carryWithPlatform(3.25); s.player.syncVisual();
      const carriedContact = Math.abs(s.player.visual.y - s.player.body.bottom) < .1;
      return { stable, contact, carriedContact };
    });
    for (const [name, pass] of Object.entries(bodyChecks)) check(`${renderer}/${name}`, pass);
    const controls = await page.evaluate(() => {
      const s = window.__visualQA.scene.getScene('Game'), i = s.inputManager;
      return { right: { x: i.rightBtn.hitArea.x, y: i.rightBtn.hitArea.y }, jump: { x: i.jumpBtn.hitArea.x, y: i.jumpBtn.hitArea.y } };
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...controls.right, id: 0 }, { ...controls.jump, id: 1 }] });
    await page.waitForTimeout(100);
    check(`${renderer}/simultaneous touch move+jump`, await page.evaluate(() => {
      const s = window.__visualQA.scene.getScene('Game'); return s.inputManager.touchRight && s.inputManager.touchJump && s.player.body.velocity.x > 0 && s.player.body.velocity.y < 0;
    }));
    // CDP lists the changed (released) points, not the fingers still held down.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...controls.jump, id: 1 }] });
    await page.waitForTimeout(60);
    check(`${renderer}/independent touch release`, await page.evaluate(() => { const i = window.__visualQA.scene.getScene('Game').inputManager; return i.touchRight && !i.touchJump; }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const inputChecks = await page.evaluate(() => {
      const s = window.__visualQA.scene.getScene('Game'), i = s.inputManager;
      const pad = { connected: true, leftStick: { x: 0, y: 0 }, buttons: [], A: false };
      i.gamepad = pad; i.getState(); pad.buttons[9] = { pressed: true };
      const pauseEdge = i.getState().pause && !i.getState().pause;
      s.togglePause(); const paused = !i.enabled && !i.rightBtn.hitArea.input.enabled;
      pad.A = true; s.togglePause(); const noResumeJump = !i.getState().jumpJustDown;
      pad.A = false; pad.buttons[9].pressed = false; i.getState(); pad.A = true;
      const freshJump = i.getState().jumpJustDown;
      pad.connected = false; const disconnected = !i.getState().jump;
      const replacement = { ...pad, connected: true, A: true };
      i.connectGamepad(replacement); const reconnectGuard = !i.getState().jumpJustDown;
      i.touchRight = true; i.resetInput(); const interruptedTouch = !i.touchRight;
      return { pauseEdge, paused, noResumeJump, freshJump, disconnected, reconnectGuard, interruptedTouch };
    });
    for (const [name, pass] of Object.entries(inputChecks)) check(`${renderer}/${name}`, pass);
    // Random levels may introduce a shared cue only on a later cycle. Warm the
    // complete finite cache before measuring growth, rather than treating it as a leak.
    await page.evaluate(async () => {
      const { stateCue } = await import('/src/graphics/StateCue.ts');
      const s = window.__visualQA.scene.getScene('Game');
      for (const kind of ['moving', 'crumbling', 'spring', 'hazard']) stateCue(s, kind).destroy();
    });
    // Scene cycling catches leaked baked textures, listeners and scene objects.
    const cycles = [];
    for (let i = 0; i < 20; i++) {
      await start(page, 'Game');
      await page.evaluate(() => window.__visualQA.scene.getScene('Game').togglePause());
      await start(page, 'GameOver', { score: 900 });
      await start(page, 'CharacterSelect');
      await start(page, 'Settings');
      await start(page, 'MainMenu');
      cycles.push(await page.evaluate(() => { const g = window.__visualQA; return { textures: g.textures.getTextureKeys().length, objects: g.scene.getScene('MainMenu').children.length, blurListeners: g.events.listenerCount('blur') }; }));
    }
    check(`${renderer}/20 scene cycles bounded`, cycles.every(c => JSON.stringify(c) === JSON.stringify(cycles[0])), cycles);
    await start(page, 'Game');
    await page.evaluate(() => {
      const g = window.__visualQA, s = g.scene.getScene('Game');
      s.player.body.setAllowGravity(false).setVelocityY(-200);
      s.player.hitObstacle = () => false; s.player.die = () => {};
      window.__stress = { frames: 0, draws: 0, deltas: [], samples: [] };
      const p = window.__stress;
      g.events.on('postrender', () => { p.frames++; p.deltas.push(g.loop.delta); });
      const gl = g.renderer.gl;
      if (gl) for (const method of ['drawArrays', 'drawElements']) { const original = gl[method].bind(gl); gl[method] = (...args) => { p.draws++; return original(...args); }; }
      s.time.addEvent({ delay: 250, loop: true, callback: () => { s.feedback.burst(s.player.x, s.player.y, 0xffe6a3, 20); } });
      s.time.addEvent({ delay: 1000, loop: true, callback: () => p.samples.push({ objects: s.children.length, textures: g.textures.getTextureKeys().length, particles: s.feedback.particles.filter(o => o.active).length, score: s.score }) });
    });
    const duration = Number(process.env.QA_PROFILE_MS ?? 60000);
    console.log(`${renderer}: profiling an invulnerable ascending fixture for ${duration}ms`);
    for (let elapsed = 0; elapsed < duration; elapsed += 1000) await page.waitForTimeout(Math.min(1000, duration - elapsed));
    const profile = await page.evaluate(() => {
      const g = window.__visualQA, s = g.scene.getScene('Game'), p = window.__stress;
      p.deltas.sort((a,b) => a-b);
      const before = s.bgManager.managedLayers.flatMap(l => l.objects).length + s.bgManager.trunkSegments.length + s.bgManager.treeAccents.length;
      for (let frame = 0; frame < 36000; frame++) s.bgManager.update(-frame * (200/60), frame / 3);
      const after = s.bgManager.managedLayers.flatMap(l => l.objects).length + s.bgManager.trunkSegments.length + s.bgManager.treeAccents.length;
      return { frames: p.frames, drawsPerFrame: g.renderer.gl ? p.draws / p.frames : null, p95Ms: p.deltas[Math.floor(p.deltas.length*.95)], samples: p.samples, backgroundBefore: before, backgroundAfter: after, particleCapacity: s.feedback.particles.length, labelCapacity: s.feedback.labels.length, sourceBytes: g.textures.getTextureKeys().reduce((n,k) => n + g.textures.get(k).source.reduce((a,t) => a+t.width*t.height*4,0),0) };
    });
    report.profiles.push({ renderer, duration, ...profile });
    check(`${renderer}/particle cap`, profile.particleCapacity === 96 && profile.samples.every(s => s.particles <= 96));
    check(`${renderer}/10 simulated minutes background recycling`, profile.backgroundBefore === profile.backgroundAfter);
    // Intro UI textures are freed; up to four shared state-cue textures can be created lazily.
    check(`${renderer}/climb resource bound`, profile.samples.every(s => s.objects < 600 && s.textures <= profile.samples[0].textures + 4), profile.samples);
    await context.close();
  }
} catch (e) { report.errors.push(e.stack); }
finally { await browser.close(); await writeFile(`${root}/report.json`, JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ checks: report.checks.length, failures: report.checks.filter(c => !c.pass), errors: report.errors, profiles: report.profiles.map(({ samples, ...p }) => ({ ...p, samples: samples.length })) }, null, 2));
if (report.errors.length || report.checks.some(c => !c.pass)) process.exitCode = 1;
