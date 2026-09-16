import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = 'docs/visual-qa-evidence/attachments';
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.QA_CHROMIUM, headless: true });
const results = [];
try {
  for (const renderer of ['canvas', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 480, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:5173/?qa&renderer=${renderer}`);
    await page.waitForFunction(() => window.__visualQA?.scene.isActive('MainMenu'));
    await page.evaluate(() => { const g = window.__visualQA; g.scene.stop('MainMenu'); g.scene.start('Game'); });
    await page.waitForTimeout(300);
    const result = await page.evaluate(async () => {
      const { Platform } = await import('/src/entities/Platform.ts');
      const { Obstacle } = await import('/src/entities/Obstacle.ts');
      const s = window.__visualQA.scene.getScene('Game');
      s.player.die = () => {}; s.player.hitObstacle = () => false;
      let supported = true, bodiesStable = true;
      for (const type of ['normal', 'moving', 'crumbling', 'spring']) {
        const p = new Platform(s, 340, 400, type);
        for (const enemy of ['snake', 'thorns']) {
          const o = new Obstacle(s, p.x, p.y - 16, enemy); o.attachToPlatform(p);
          const shape = [o.body.width, o.body.height, o.body.offset.x, o.body.offset.y].join();
          for (let t = 0; t < 120; t++) {
            s.time.now += 50; p.updatePlatform(); o.updateObstacle(-1000, -1000);
            supported &&= Math.abs(o.y + 13 - p.body.top) < .01 && Math.abs(o.x - p.x) + 16 <= p.getSurfaceWidth() / 2 + .01;
            bodiesStable &&= shape === [o.body.width, o.body.height, o.body.offset.x, o.body.offset.y].join();
          }
          o.destroy();
        }
        p.destroy();
      }
      const p = new Platform(s, 340, 350, 'moving'), o = new Obstacle(s, 340, 334, 'snake');
      o.attachToPlatform(p); p.body.enable = false; o.updateObstacle(0, 0);
      const removedWithSupport = !o.active; p.destroy();
      return { supported, bodiesStable, removedWithSupport };
    });
    for (const altitude of [0,120,320,600,900]) {
      await page.evaluate(altitude => { const s = window.__visualQA.scene.getScene('Game'); s.score = altitude; s.highestY = s.startY - altitude * 10; }, altitude);
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${root}/${renderer}-${altitude}.png` });
    }
    results.push({ renderer, ...result, errors });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${root}/report.json`, JSON.stringify(results, null, 2));
console.log(results);
if (results.some(r => !r.supported || !r.bodiesStable || !r.removedWithSupport || r.errors.length)) process.exitCode = 1;
