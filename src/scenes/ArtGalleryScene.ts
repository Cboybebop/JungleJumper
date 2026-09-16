import Phaser from 'phaser';
import { CHARACTERS, COLORS } from '../constants';
import { PLATFORM_TEXTURES, WORLD_IMAGE_ASSETS, BACKGROUND_IMAGE_ASSETS } from '../graphics/WorldAssets';
import { BackgroundManager } from '../systems/BackgroundManager';
import { MenuNavigator } from '../systems/MenuNavigator';
import { RUN_BIOMES } from '../ui/RunProgress';
import { UIFactory, UI_ASSETS } from '../ui/UIFactory';
import { stateCue } from '../graphics/StateCue';
import { FeedbackManager } from '../systems/FeedbackManager';

type Sample = { label: string; texture?: string; frame?: number; animation?: string; color?: number };

/** Development-only inspection surface. Uses production textures and animation definitions. */
export class ArtGalleryScene extends Phaser.Scene {
  private page = 0;
  private samples: Phaser.GameObjects.Sprite[] = [];
  private background?: BackgroundManager;
  private stats!: Phaser.GameObjects.Text;
  private frozen = false;
  private elapsed = 0;
  private pages: { title: string; samples: Sample[]; biome?: number }[] = [];

  constructor() { super('ArtGallery'); }

  create(data: { page?: number } = {}): void {
    this.page = data.page ?? 0;
    this.samples = [];
    this.background = undefined;
    this.frozen = false;
    this.elapsed = 0;
    this.pages = [];
    for (const kind of ['moving', 'crumbling', 'spring', 'hazard'] as const) stateCue(this, kind).destroy();
    const animations = this.textures.getTextureKeys().flatMap(key => this.anims.getAnimsFromTexture(key)).map(key => this.anims.get(key));
    const addPages = (title: string, samples: Sample[]) => {
      const small = samples.filter(s => !s.texture || (this.textures.get(s.texture).get(s.frame ?? 0).width <= 144 && this.textures.get(s.texture).get(s.frame ?? 0).height <= 94));
      for (let i = 0; i < small.length; i += 12) this.pages.push({ title: `${title} ${Math.floor(i / 12) + 1}`, samples: small.slice(i, i + 12) });
      samples.filter(s => !small.includes(s)).forEach(s => this.pages.push({ title: `Full asset: ${s.label}`, samples: [s] }));
    };
    for (const character of CHARACTERS) {
      addPages(character.name, animations.filter(a => a.key.startsWith(`${character.animationPrefix}-`)).map(a => ({ label: a.key, animation: a.key, texture: character.texture })));
    }
    addPages('Enemies / effects / pickup', animations.filter(a => !CHARACTERS.some(c => a.key.startsWith(`${c.animationPrefix}-`))).map(a => ({ label: a.key, animation: a.key, texture: a.frames[0].textureKey })));
    addPages('Platforms: all states', PLATFORM_TEXTURES.flatMap(texture => Array.from({ length: 4 }, (_, frame) => ({ label: `${texture}\nframe ${frame}`, texture, frame }))));
    addPages('UI states', UI_ASSETS.map(key => ({ label: key, texture: `ui-${key}` })));
    addPages('Non-color cues', ['moving', 'crumbling', 'spring', 'hazard'].map(kind => ({ label: kind, texture: `state-cue-${kind}` })));
    addPages('Portraits / world', [...CHARACTERS.map(c => ({ label: c.portrait, texture: c.portrait })), ...WORLD_IMAGE_ASSETS.map(([key]) => ({ label: key, texture: key }))]);
    addPages('Palette', Object.entries(COLORS).filter((entry): entry is [string, number] => typeof entry[1] === 'number').map(([label, color]) => ({ label: `${label}\n#${color.toString(16).padStart(6, '0')}`, color })));
    this.pages.push({ title: 'Live UI states', samples: [] }, { title: 'Feedback pool effects', samples: [] });
    for (const [texture] of BACKGROUND_IMAGE_ASSETS) this.pages.push({ title: texture, samples: [{ label: texture, texture }] });
    RUN_BIOMES.forEach((b, biome) => this.pages.push({ title: b.label, samples: [], biome }));
    this.page = Phaser.Math.Wrap(this.page, 0, this.pages.length);
    const page = this.pages[this.page];
    this.cameras.main.setBackgroundColor(COLORS.OUTLINE_DEEP);
    const ui = new UIFactory(this);
    if (page.biome !== undefined) {
      this.background = new BackgroundManager(this);
      this.background.update(this.cameras.main.height / 2, RUN_BIOMES[page.biome].startsAt);
    } else if (page.title === 'Live UI states') {
      ['Normal', 'Focused', 'Pressed', 'Disabled'].forEach((label, i) => {
        const b = ui.button(240, 160 + i * 80, label, { onActivate: () => {} });
        if (i === 1) b.setFocused(true);
        if (i === 2) b.image.emit('pointerdown');
        if (i === 3) b.setEnabled(false);
      });
      const row = ui.row(240, 515, 'FOCUSED ROW', { width: 420, value: 'ON' }); row.setFocused(true);
      const active = ui.row(240, 565, 'ACTIVE ROW', { width: 420, value: 'LISTENING' }); active.setActive(true);
    } else if (page.title === 'Feedback pool effects') {
      const feedback = new FeedbackManager(this);
      const replay = () => {
        if (this.frozen) return;
        feedback.burst(100, 220, COLORS.HIGHLIGHT_WARM);
        feedback.burst(330, 220, COLORS.BRANCH, 20, 30, true);
        feedback.ring(100, 400, COLORS.SHIELD);
        feedback.trail(330, 400);
        feedback.label(240, 530, 'SHIELD BROKEN');
      };
      this.time.addEvent({ delay: 700, loop: true, callback: replay }); replay();
      ui.text(240, 110, 'BURST / SHARDS / RING / TRAIL / LABEL\nUses current reduced-motion setting', { fontSize: '11px', align: 'center' }).setOrigin(0.5);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => feedback.destroy());
    } else if (page.title.startsWith('background-') || page.title.startsWith('Full asset:')) {
      this.add.image(240, 400, page.samples[0].texture!).setScale(1).setDepth(-1);
    } else {
      page.samples.forEach((sample, index) => {
        const x = 80 + index % 3 * 160;
        const y = 150 + Math.floor(index / 3) * 135;
        this.add.rectangle(x, y, 144, 94, 0x334b68);
        const guides = this.add.graphics().lineStyle(1, COLORS.HIGHLIGHT_WARM, 0.6);
        guides.strokeRect(x - 16, y - 16, 32, 32).lineBetween(x - 55, y + 14, x + 55, y + 14).lineBetween(x, y - 40, x, y + 40);
        if (sample.color !== undefined) this.add.rectangle(x, y, 64, 48, sample.color);
        if (sample.texture) {
          const sprite = this.add.sprite(x, y, sample.texture, sample.frame ?? 0);
          // Oversize source previews are deliberately cropped rather than resampled.
          if (sprite.width > 144 || sprite.height > 94) sprite.setCrop(0, 0, Math.min(144, sprite.width), Math.min(94, sprite.height)).setOrigin(0).setPosition(x - 72, y - 47);
          if (sample.animation) sprite.play({ key: sample.animation, repeat: -1, repeatDelay: 300 });
          this.samples.push(sprite);
        }
        ui.text(x, y + 51, sample.label, { fontSize: '9px', align: 'center', wordWrap: { width: 150 } }).setOrigin(0.5, 0);
      });
    }
    ui.text(240, 22, `ART GALLERY ${this.page + 1}/${this.pages.length}\n${page.title}`, { fontSize: '14px', align: 'center', backgroundColor: '#211936' }).setOrigin(0.5, 0).setDepth(100);
    const actions = [
      { label: 'PREV', run: () => this.scene.restart({ page: this.page - 1 }) },
      { label: 'NEXT', run: () => this.scene.restart({ page: this.page + 1 }) },
      { label: 'FREEZE', run: () => { this.frozen = !this.frozen; this.samples.forEach(s => this.frozen ? s.anims.pause() : s.anims.resume()); } },
      { label: 'STEP', run: () => { this.frozen = true; this.samples.forEach(s => { s.anims.pause(); if (s.anims.currentAnim) s.anims.nextFrame(); }); } },
      { label: 'MENU', run: () => this.scene.start('MainMenu') },
    ];
    const buttons = actions.map((a, i) => ui.button(80 + i % 3 * 160, 710 + Math.floor(i / 3) * 42, a.label, { size: 'small', fontSize: 12, onActivate: a.run }).setDepth(100));
    const nav = new MenuNavigator(this, buttons.map(b => ({ activate: b.activate, onFocus: () => b.setFocused(true), onBlur: () => b.setFocused(false) })), { onBack: () => this.scene.start('MainMenu') });
    buttons.forEach((b, i) => b.image.on('pointerover', () => nav.setIndex(i)));
    this.stats = ui.text(12, 650, '', { fontSize: '10px', backgroundColor: '#211936' }).setDepth(100);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.background?.destroy());
  }

  update(_time: number, delta: number): void {
    if (!this.frozen) this.elapsed += delta;
    const biome = this.pages[this.page]?.biome;
    if (this.background && biome !== undefined) {
      const y = -this.elapsed * 0.1;
      this.cameras.main.scrollY = y;
      this.background.update(y + this.cameras.main.height / 2, RUN_BIOMES[biome].startsAt, RUN_BIOMES[biome].startsAt);
      // Keep controls fixed while exercising the production recycling pool.
      this.children.list.forEach(o => { if (o instanceof Phaser.GameObjects.Text || o instanceof Phaser.GameObjects.Container) o.setScrollFactor(0); });
    }
    const bytes = this.textures.getTextureKeys().reduce((sum, key) => sum + this.textures.get(key).source.reduce((n, s) => n + s.width * s.height * 4, 0), 0);
    this.stats.setText(`${this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'} | ${Math.round(this.game.loop.actualFps)} FPS | objects ${this.children.length}\nRGBA source estimate ${(bytes / 1048576).toFixed(2)} MiB | ${this.frozen ? 'FROZEN' : 'PLAYING'}`);
  }
}
