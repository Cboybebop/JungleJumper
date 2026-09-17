import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser = await chromium.launch({headless:true, channel: process.env.QA_BROWSER || 'msedge'});
const errors=[];
const out='docs/play-screen-qa'; await mkdir(out,{recursive:true});
async function open(width,height,touch=false){const page=await browser.newPage({viewport:{width,height},hasTouch:touch});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/?qa');await page.waitForFunction(()=>window.__visualQA?.scene.isActive('MainMenu'));return page;}
async function start(page){await page.evaluate(()=>{const g=window.__visualQA;g.scene.getScenes(true).forEach(s=>g.scene.stop(s.scene.key));g.scene.start('Game');});await page.waitForTimeout(500);}
try {
 const page=await open(1920,1080);await start(page);
 for(const [width,height] of [[1920,1080],[1280,720],[3744,1912],[800,480],[320,480]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);const b=await page.locator('canvas').boundingBox();assert(Math.abs(b.x+b.width/2-width/2)<2,JSON.stringify(b));assert(Math.abs(b.y+b.height/2-height/2)<2);}
 await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(200);await page.screenshot({path:out+'/desktop.png'});
 // Verify landing contact against actual opaque platform pixels, for all characters.
 const contacts=await page.evaluate(async()=>{const {Player}=await import('/src/entities/Player.ts');const {Platform}=await import('/src/entities/Platform.ts');const {SettingsManager}=await import('/src/systems/SettingsManager.ts');const s=window.__visualQA.scene.getScene('Game');s.physics.pause();const results=[];for(let i=0;i<5;i++){SettingsManager.selectedCharacter=i;const p=new Player(s,240,300);p.anims.stop();p.setFrame(0);p.syncVisual();let lastOpaque = 0;
for(let y=0;y<32;y++) for(let x=7;x<25;x++) if(s.textures.getPixelAlpha(x,y,p.texture.key,0)>200) lastOpaque=Math.max(lastOpaque,y+1);
const foot=p.visual.y-p.visual.displayOriginY+lastOpaque;results.push({character:i,foot,bodyBottom:p.y+14});p.destroy();}
SettingsManager.selectedCharacter=0;
for (const type of ['normal', 'moving', 'crumbling', 'spring']) {
  // Include every normal frame and wrapped generator variants (4 through 7).
  for (let variant = 0; variant < (type === 'normal' ? 8 : 1); variant++) {
    const p = new Platform(s, 240, 400, type, variant);
    let surface = -1;
    for (let y = 0; y < 24; y++) {
      let count = 0;
      for (let x = 20; x < 60; x++) {
        if (s.textures.getPixelAlpha(x, y, p.texture.key, p.frame.name) > 200) count++;
      }
      if (count >= 30) { surface = y; break; }
    }
    results.push({ type, variant, frame: Number(p.frame.name), surface,
      top: p.body.top, artTop: p.y - p.displayOriginY + surface });
    p.destroy();
  }
}
return results;
});
console.log('Contacts', contacts);
assert(contacts.slice(0, 5).every(c => c.foot === c.bodyBottom));
for (const contact of contacts.slice(5)) {
  assert(contact.surface >= 0, `Missing visible surface: ${JSON.stringify(contact)}`);
  if (contact.type === 'normal') {
    assert.equal(contact.frame, contact.variant % 4);
    assert.equal(contact.top, contact.artTop,
      `Normal variant ${contact.variant} must land exactly on the visible grass`);
  } else {
    assert(Math.abs(contact.top - contact.artTop) <= 1);
  }
}

 const mobile=await open(375,667,true);await start(mobile);await mobile.evaluate(()=>window.__visualQA.scene.getScene('Game').togglePause());await mobile.screenshot({path:out+'/mobile-pause.png'});
 for(const size of ['small','medium','large']){
 const point=await mobile.evaluate(size=>{const s=window.__visualQA.scene.getScene('Game');const row=s.pauseOverlay.list.find(o=>o.list?.some(t=>t.text===size.toUpperCase()));const panel=row.list[0];const b=panel.getBounds();const c=s.cameras.main;return {x:b.centerX-c.scrollX,y:b.centerY-c.scrollY};},size);
 const box=await mobile.locator('canvas').boundingBox();await mobile.touchscreen.tap(box.x+point.x*box.width/480,box.y+point.y*box.height/800);
 assert.equal(await mobile.evaluate(()=>localStorage.getItem('jungle-jumper-touch-size')),size);
 }
 await mobile.evaluate(()=>window.__visualQA.scene.getScene('Game').togglePause());await mobile.waitForTimeout(100);await mobile.screenshot({path:out+'/mobile-large.png'});
 const buttons=await mobile.evaluate(()=>{const s=window.__visualQA.scene.getScene('Game');s.physics.pause();return [s.inputManager.leftBtn,s.inputManager.rightBtn,s.inputManager.jumpBtn].map(b=>({x:b.hitArea.x,y:b.hitArea.y,w:b.visual.displayWidth,hit:b.hitArea.width}));});assert(buttons.every(b=>b.hit>b.w));assert(buttons[0].x+buttons[0].hit/2<buttons[1].x-buttons[1].hit/2);
 const box=await mobile.locator('canvas').boundingBox();const pos=b=>({x:box.x+b.x*box.width/480,y:box.y+b.y*box.height/800});const left=pos(buttons[0]),right=pos(buttons[1]);
 await mobile.mouse.move(left.x,left.y);await mobile.mouse.down();assert(await mobile.evaluate(()=>window.__visualQA.scene.getScene('Game').inputManager.touchLeft));await mobile.mouse.move(right.x,right.y);assert(await mobile.evaluate(()=>{const i=window.__visualQA.scene.getScene('Game').inputManager;return !i.touchLeft&&i.touchRight;}));await mobile.mouse.up();assert(await mobile.evaluate(()=>!window.__visualQA.scene.getScene('Game').inputManager.touchRight));
 await mobile.reload();await mobile.waitForFunction(()=>window.__visualQA?.scene.isActive('MainMenu'));await start(mobile);assert.equal(await mobile.evaluate(async()=>{const {SettingsManager}=await import('/src/systems/SettingsManager.ts');return SettingsManager.getTouchControlSize();}),'large');
 assert.deepEqual(errors,[]);console.log('PASS: centering, landing alignment, size selection/persistence, padded targets, slide-to-steer and release.');
}finally{await browser.close();}


