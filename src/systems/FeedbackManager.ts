import Phaser from 'phaser';
import { SettingsManager } from './SettingsManager';

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
      const p = this.acquire();
      if (!p) break;
      const angle = (Math.PI * 2 * i) / count;
      p.setPosition(x, y).setTint(tint).setScale(shards ? 0.5 : 0.7, shards ? 1.7 : 0.7).setRotation(angle);
      this.scene.tweens.add({ targets: p,
        x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance - distance / 3,
        alpha: 0, duration: reduced ? 180 : 320, ease: 'Quad.easeOut',
        onComplete: () => { p.setActive(false).setVisible(false); },
      });
    }
  }

  ring(x: number, y: number, tint: number): void {
    const p = this.acquire('feedback-ring');
    if (!p) return;
    const reduced = SettingsManager.getReducedMotion();
    p.setPosition(x, y).setTint(tint).setScale(reduced ? 0.8 : 0.4);
    this.scene.tweens.add({ targets: p, scale: reduced ? 0.8 : 1.4, alpha: 0, duration: 260,
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

  squash(sprite: Phaser.GameObjects.Sprite, x: number, y: number): void {
    this.scene.tweens.killTweensOf(sprite);
    sprite.setScale(1);
    if (SettingsManager.getReducedMotion()) return;
    sprite.setScale(Phaser.Math.Clamp(x, 0.88, 1.12), Phaser.Math.Clamp(y, 0.88, 1.12));
    this.scene.tweens.add({ targets: sprite, scaleX: 1, scaleY: 1, duration: 150, ease: 'Quad.easeOut' });
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
