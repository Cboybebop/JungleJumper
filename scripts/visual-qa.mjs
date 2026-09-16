// Run against `npm run dev`. PLAYWRIGHT_MODULE may point to a bundled Playwright index.mjs.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = 'docs/visual-qa-evidence';
await mkdir(root, { recursive: true });
const report = { capturedAt: new Date().toISOString(), checks: [], errors: [], profiles: [], viewports: [] };
const check = (name, pass, details) => report.checks.push({ name, pass: Boolean(pass), details });
let browser;
async function start(page, scene, data = {}) {
  await page.evaluate(({ scene, data }) => {
    const game = window.__visualQA;
    game.scene.getScenes(true).forEach(s => game.scene.stop(s.scene.key));
    game.scene.start(scene, data);
  }, { scene, data });
  await page.waitForTimeout(250);
}
async function capture(page, name) {
  await page.screenshot({ path: `${root}/${name}.png` });
  await page.waitForTimeout(650);
}
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM });
  for (const renderer of ['canvas', 'webgl']) {
    const context = await browser.newContext({ viewport: { width: 480, height: 800 }, hasTouch: true, recordVideo: { dir: root, size: { width: 480, height: 800 } } });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(`${renderer}: ${error.message}`));
    await page.goto(`http://127.0.0.1:5173/?qa&renderer=${renderer}`);
    await page.waitForFunction(() => window.__visualQA?.scene.isActive('MainMenu'));
    for (const scene of ['MainMenu', 'CharacterSelect', 'Settings', 'GameOver']) {
      await start(page, scene, { score: 950 });
      const before = await page.evaluate(scene => window.__visualQA.scene.getScene(scene).menuNavigator?.selectedIndex, scene);
      await page.keyboard.down('ArrowDown');
      await page.waitForTimeout(100);
      await page.keyboard.up('ArrowDown');
      await page.waitForTimeout(80);
      const after = await page.evaluate(scene => window.__visualQA.scene.getScene(scene).menuNavigator?.selectedIndex, scene);
      check(`${renderer}/${scene}/keyboard focus`, before !== after, { before, after });
      // Exercise the same production navigator with a deterministic gamepad adapter.
      const padFocus = await page.evaluate(scene => {
        const nav = window.__visualQA.scene.getScene(scene).menuNavigator;
        if (!nav) return false;
        const initial = nav.selectedIndex;
        const pad = { connected: true, leftStick: { x: 0, y: 0 }, buttons: [], A: false, B: false };
        nav.gamepad = pad; nav.padArmed = false; nav.handleGamepad();
        pad.leftStick.y = 1; nav.handleGamepad();
        const changed = nav.selectedIndex !== initial;
        nav.gamepad = null;
        return changed;
      }, scene);
      check(`${renderer}/${scene}/simulated gamepad focus`, padFocus);
      const targets = await page.evaluate(scene => {
        const s = window.__visualQA.scene.getScene(scene);
        const walk = objects => objects.flatMap(o => o.list ? walk(o.list) : [o]);
        return walk(s.children.list).filter(o => o.input?.enabled && o.getBounds).map(o => {
          const b = o.getBounds(); return { x: b.centerX, y: b.centerY };
        });
      }, scene);
      if (targets.length) {
        await page.mouse.move(targets[0].x, targets[0].y);
        await page.waitForTimeout(80);
        check(`${renderer}/${scene}/pointer focus`, await page.evaluate(scene => window.__visualQA.scene.getScene(scene).menuNavigator?.selectedIndex === 0, scene));
        // Touch one control, then restore the fixture; activation may change scene or start rebinding.
        await page.touchscreen.tap(targets[0].x, targets[0].y);
        await page.waitForTimeout(300);
        check(`${renderer}/${scene}/touch dispatch`, true, 'Tap delivered; recorded for visual review.');
        await start(page, scene, { score: 950 });
      }
      await capture(page, `${renderer}-${scene}`);
    }
    await start(page, 'Game');
    await page.waitForTimeout(500);
    const bodies = await page.evaluate(() => {
      const s = window.__visualQA.scene.getScene('Game');
      const objects = [s.player, ...s.platforms.getChildren(), ...s.obstacles.getChildren()];
      return objects.map(o => {
        const shape = () => [o.body.width, o.body.height, o.body.offset.x, o.body.offset.y, o.originX, o.originY];
        const original = JSON.stringify(shape()); const old = o.frame.name;
        const frames = o.texture.getFrameNames();
        const stable = frames.every(f => { o.setFrame(f); return JSON.stringify(shape()) === original; });
        o.setFrame(old);
        return { texture: o.texture.key, frames: frames.length, stable, shape: shape() };
      });
    });
    check(`${renderer}/live frame body and origin invariance`, bodies.every(b => b.stable), bodies);
    const allBodies = await page.evaluate(async () => {
      const { Player } = await import('/src/entities/Player.ts');
      const { Obstacle } = await import('/src/entities/Obstacle.ts');
      const { Platform } = await import('/src/entities/Platform.ts');
      const { SettingsManager } = await import('/src/systems/SettingsManager.ts');
      const s = window.__visualQA.scene.getScene('Game');
      const selected = SettingsManager.selectedCharacter;
      const objects = [];
      for (let i = 0; i < 5; i++) { SettingsManager.selectedCharacter = i; objects.push(new Player(s, 240, 400)); }
      SettingsManager.selectedCharacter = selected;
      for (const type of ['snake','coconut','thorns','bat']) objects.push(new Obstacle(s, 240, 400, type));
      for (const type of ['normal','moving','crumbling','spring']) objects.push(new Platform(s, 240, 400, type));
      return objects.map(o => {
        const shape = () => JSON.stringify([o.body.width,o.body.height,o.body.offset.x,o.body.offset.y,o.originX,o.originY]);
        const baseline = shape();
        const stable = [false,true].every(flip => { o.setFlipX(flip); return o.texture.getFrameNames().every(frame => {
          o.setFrame(frame);
          o.updatePlatform?.(); o.updateObstacle?.(-1000, -1000);
          return shape() === baseline;
        }); });
        const result = { texture: o.texture.key, stable, body: baseline }; o.destroy(); return result;
      });
    });
    check(`${renderer}/all characters enemies platforms both facings`, allBodies.every(b => b.stable), allBodies);
    const touch = await page.evaluate(() => {
      const input = window.__visualQA.scene.getScene('Game').inputManager;
      return input.rightBtn ? { x: input.rightBtn.hitArea.x, y: input.rightBtn.hitArea.y } : null;
    });
    if (touch) { await page.touchscreen.tap(touch.x, touch.y); check(`${renderer}/game/touch controls`, true, touch); }
    await page.keyboard.down('d'); await page.waitForTimeout(180); await page.keyboard.up('d');
    await page.keyboard.press('Space');
    await capture(page, `${renderer}-gameplay`);
    // Isolate pause from the preceding random gameplay: a lethal collision there
    // legitimately prevents pause and must not invalidate this menu fixture.
    await start(page, 'Game');
    await page.evaluate(() => window.__visualQA.scene.getScene('Game').togglePause());
    await capture(page, `${renderer}-pause`);
    check(`${renderer}/pause`, await page.evaluate(() => window.__visualQA.scene.getScene('Game').isPaused));
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(100); await page.keyboard.up('ArrowDown');
    check(`${renderer}/pause/keyboard focus`, await page.evaluate(() => window.__visualQA.scene.getScene('Game').pauseMenuNavigator.selectedIndex === 1));
    await page.evaluate(() => window.__visualQA.scene.getScene('Game').togglePause());
    for (const [label, score] of [['lower-jungle',0],['bright-canopy',120],['misty-heights',320],['sunset-canopy',600],['night-storm',900]]) {
      await start(page, 'Game');
      await page.evaluate(score => {
        const s = window.__visualQA.scene.getScene('Game');
        // Controlled altitude fixture retains live player/platform input and production backgrounds.
        s.score = score; s.highestY = s.startY - score * 10;
      }, score);
      await page.keyboard.down('Space'); await page.waitForTimeout(100); await page.keyboard.up('Space');
      await capture(page, `${renderer}-biome-${label}`);
    }
    await start(page, 'Game');
    await page.evaluate(() => {
      const game = window.__visualQA, gl = game.renderer.gl;
      window.__drawProfile = { draws: 0, frames: 0, deltas: [] };
      const stats = window.__drawProfile;
      game.events.on('postrender', () => { stats.frames++; stats.deltas.push(game.loop.delta); });
      if (gl) for (const method of ['drawArrays','drawElements']) {
        const original = gl[method].bind(gl);
        gl[method] = (...args) => { stats.draws++; return original(...args); };
      }
    });
    await page.waitForTimeout(1500);
    report.profiles.push(await page.evaluate(() => {
      const game = window.__visualQA, s = game.scene.getScene('Game'), p = window.__drawProfile;
      const deltas = p.deltas.sort((a,b) => a-b);
      return { kind: 'gameplay sample', renderer: game.renderer.gl ? 'webgl' : 'canvas', frames: p.frames, drawsPerFrame: game.renderer.gl ? p.draws / p.frames : null, p95FrameMs: deltas[Math.floor(deltas.length * .95)], objects: s.children.length, particlePool: s.feedback.particles.length, activeParticles: s.feedback.particles.filter(o => o.active).length, labelPool: s.feedback.labels.length };
    }));
    await start(page, 'ArtGallery');
    const galleryCount = await page.evaluate(() => window.__visualQA.scene.getScene('ArtGallery').pages.length);
    for (let index = 0; index < galleryCount; index++) {
      await start(page, 'ArtGallery', { page: index });
      const title = await page.evaluate(() => {
        const s = window.__visualQA.scene.getScene('ArtGallery'); return s.pages[s.page].title;
      });
      await page.screenshot({ path: `${root}/${renderer}-gallery-${String(index).padStart(2, '0')}.png` });
      if (index >= galleryCount - 5) await page.waitForTimeout(1000);
      check(`${renderer}/gallery/${index}`, true, title);
    }
    // Exercise recycling over 10,000 frames, without allocating new background objects.
    const profile = await page.evaluate(() => {
      const game = window.__visualQA, s = game.scene.getScene('ArtGallery');
      const before = s.children.length;
      for (let i = 0; i < 10000; i++) s.background.update(-i * 3, 900);
      const sources = game.textures.getTextureKeys().map(key => ({ key, bytes: game.textures.get(key).source.reduce((n, t) => n + t.width * t.height * 4, 0) }));
      return { before, after: s.children.length, sourceBytesEstimate: sources.reduce((n, t) => n + t.bytes, 0), largestSources: sources.sort((a, b) => b.bytes - a.bytes).slice(0, 10), fps: game.loop.actualFps };
    });
    report.profiles.push({ renderer, ...profile });
    check(`${renderer}/background recycling stable object count`, profile.before === profile.after, profile);
    const video = page.video();
    await context.close();
    await video.saveAs(`${root}/${renderer}-review.webm`);
    await video.delete();
  }
  for (const renderer of ['canvas', 'webgl']) for (const [width, height] of [[320,480],[375,667],[480,800],[800,480],[1280,720],[1920,1080]]) for (const dpr of [1, 2, 3]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:5173/?qa&renderer=${renderer}`);
    await page.waitForFunction(() => window.__visualQA?.scene.isActive('MainMenu'));
    const bounds = await page.locator('canvas').boundingBox();
    const fits = bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1;
    report.viewports.push({ renderer, width, height, dpr, bounds, fits });
    check(`${renderer}/${width}x${height}/DPR${dpr}/canvas fit`, fits);
    for (const scene of ['MainMenu', 'CharacterSelect', 'Settings', 'GameOver', 'Game']) {
      await start(page, scene, { score: 950 });
      if (scene === 'Game') await page.evaluate(() => window.__visualQA.scene.getScene('Game').togglePause());
      const clipped = await page.evaluate(scene => {
        const game = window.__visualQA, s = game.scene.getScene(scene);
        const walk = objects => objects.flatMap(o => o.list ? walk(o.list) : [o]);
        return walk(s.children.list).filter(o => o.input?.enabled && o.visible && o.getBounds).flatMap(o => {
          const b = o.getBounds();
          return b.x < -1 || b.y < -1 || b.right > game.scale.width + 1 || b.bottom > game.scale.height + 1
            ? [{ texture: o.texture?.key, x: b.x, y: b.y, width: b.width, height: b.height }] : [];
        });
      }, scene);
      check(`${renderer}/${width}x${height}/DPR${dpr}/${scene}/interactive bounds`, clipped.length === 0, clipped);
      if ((width === 320 || width === 1920) && dpr === 1) await page.screenshot({ path: `${root}/${renderer}-${width}x${height}-${scene}.png` });
    }
    await context.close();
  }
} catch (error) { report.errors.push(error.stack); }
finally {
  await browser?.close();
  await writeFile(`${root}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ checks: report.checks.length, failures: report.checks.filter(c => !c.pass), errors: report.errors, profiles: report.profiles }, null, 2));
if (report.errors.length || report.checks.some(c => !c.pass)) process.exitCode = 1;
