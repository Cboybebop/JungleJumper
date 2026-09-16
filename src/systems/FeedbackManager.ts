import Phaser from 'phaser';
import { SettingsManager } from './SettingsManager';

const PARTICLE_COLORS = [0xffffff, 0xd8c49b, 0xffe6a3, 0x9ef4ff, 0x87cefa, 0x00bfff, 0xffad65, 0xf1c40f, 0xc0392b, 0x6b4a7b];
const particleTexture = (kind: string, tint: number) => `${kind}-${PARTICLE_COLORS.includes(tint) ? tint : 0xffffff}`;

/** Scene-owned, bounded pools. Exhaustion drops decoration, never gameplay. */
export class FeedbackManager {
  private particles: Phaser.GameObjects.Sprite[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private stopTimer: Phaser.Time.TimerEvent | null = null;
  private lastImpulse = -Infinity;
  private lastStop = -Infinity;
  private lastFlash = -Infinity;
  private lastTrail = -Infinity;

  constructor(private scene: Phaser.Scene) {
    // Bake the bounded effect palette once: Canvas does not apply sprite tint.
    for (const tint of PARTICLE_COLORS) for (const kind of ['feedback-dot', 'feedback-ring']) {
      const key = particleTexture(kind, tint);
      if (scene.textures.exists(key)) continue;
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(tint);
      if (kind === 'feedback-dot') g.fillRect(0, 0, 4, 4);
      else {
        // Stepped native-pixel ring, with no antialiased circle edge.
        for (const [x, y, w, h] of [[8,2,16,2],[4,4,4,2],[24,4,4,2],[2,6,2,20],[28,6,2,20],[4,26,4,2],[24,26,4,2],[8,28,16,2]]) g.fillRect(x,y,w,h);
      }
      g.generateTexture(key, kind === 'feedback-dot' ? 4 : 32, kind === 'feedback-dot' ? 4 : 32); g.destroy();
    }
    if (!scene.textures.exists('feedback-dot')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
      g.generateTexture('feedback-dot', 4, 4);
      g.clear().lineStyle(2, 0xffffff).strokeCircle(16, 16, 13);
      g.generateTexture('feedback-ring', 32, 32);
      g.destroy();
    }
    for (let i = 0; i < 96; i++) {
      this.particles.push(scene.add.sprite(0, 0, 'feedback-dot').setDepth(13).setActive(false).setVisible(false));
    }
    for (let i = 0; i < 6; i++) {
      this.labels.push(scene.add.text(0, 0, '', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', stroke: '#211936', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(15).setActive(false).setVisible(false));
    }
  }

  private acquire(texture = 'feedback-dot'): Phaser.GameObjects.Sprite | undefined {
    const sprite = this.particles.find(p => !p.active);
    if (!sprite) return;
    sprite.setTexture(texture).setActive(true).setVisible(true).setAlpha(1).setScale(1).setRotation(0).clearTint();
    return sprite;
  }

  burst(x: number, y: number, tint: number, count = 8, distance = 30, shards = false): void {
    const reduced = SettingsManager.getReducedMotion();
    count = reduced ? Math.min(count, 4) : Math.min(count, 20);
    distance = reduced ? 8 : distance;
    for (let i = 0; i < count; i++) {
      const p = this.acquire(particleTexture('feedback-dot', tint));
      if (!p) break;
      const angle = (Math.PI * 2 * i) / count;
      p.setPosition(x, y).setScale(1).setRotation(shards ? Math.round(angle / (Math.PI / 2)) * Math.PI / 2 : 0);
      this.scene.tweens.add({ targets: p,
        x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance - distance / 3,
        alpha: 0, duration: reduced ? 180 : 320, ease: 'Quad.easeOut',
        onComplete: () => { p.setActive(false).setVisible(false); },
      });
    }
  }

  ring(x: number, y: number, tint: number): void {
    const p = this.acquire(particleTexture('feedback-ring', tint));
    if (!p) return;
    const reduced = SettingsManager.getReducedMotion();
    p.setPosition(x, y).setScale(1);
    this.scene.tweens.add({ targets: p, alpha: 0, duration: reduced ? 180 : 260,
      onComplete: () => { p.setActive(false).setVisible(false); },
    });
  }

  label(x: number, y: number, text: string): void {
    const label = this.labels.find(p => !p.active);
    if (!label) return;
    label.setPosition(x, y - 24).setText(text).setAlpha(1).setActive(true).setVisible(true);
    this.scene.tweens.add({ targets: label, y: y - (SettingsManager.getReducedMotion() ? 24 : 40),
      alpha: 0, delay: 200, duration: 380,
      onComplete: () => { label.setActive(false).setVisible(false); },
    });
  }

  trail(x: number, y: number): void {
    if (SettingsManager.getReducedMotion() || this.scene.time.now - this.lastTrail < 65) return;
    this.lastTrail = this.scene.time.now;
    this.burst(x, y, 0xffe6a3, 1, 4);
  }

  squash(sprite: Phaser.GameObjects.Sprite, _x: number, _y: number): void {
    this.scene.tweens.killTweensOf(sprite);
    sprite.setScale(1);
    // Anticipation/landing poses supply pixel-authored squash. Never resample the actor.
  }

  impulse(pixels: number, duration = 90): void {
    const now = this.scene.time.now;
    if (SettingsManager.getReducedMotion() || now - this.lastImpulse < 180) return;
    this.lastImpulse = now;
    const camera = this.scene.cameras.main;
    // Pixel cap remains restrained on both phones and wide desktop viewports.
    const amount = Phaser.Math.Clamp(pixels, 0, 3);
    camera.shake(Math.min(duration, 120), new Phaser.Math.Vector2(amount / camera.width, amount / camera.height), false);
  }

  flash(tint: number): void {
    if (SettingsManager.getReducedMotion() || this.scene.time.now - this.lastFlash < 400) return;
    this.lastFlash = this.scene.time.now;
    const color = Phaser.Display.Color.IntegerToRGB(tint);
    this.scene.cameras.main.flashEffect.alpha = 0.12;
    this.scene.cameras.main.flash(65, color.r, color.g, color.b, false);
  }

  hitStop(duration = 40): void {
    if (SettingsManager.getReducedMotion() || this.stopTimer || this.scene.physics.world.isPaused
      || this.scene.time.now - this.lastStop < 250) return;
    this.lastStop = this.scene.time.now;
    this.scene.physics.pause();
    this.stopTimer = this.scene.time.delayedCall(Math.min(duration, 55), () => this.cancelHitStop());
  }

  cancelHitStop(): void {
    if (!this.stopTimer) return;
    this.stopTimer.remove(false);
    this.stopTimer = null;
    this.scene.physics.resume();
  }

  destroy(): void {
    this.cancelHitStop();
    for (const object of [...this.particles, ...this.labels]) {
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }
    this.particles = [];
    this.labels = [];
  }
}
