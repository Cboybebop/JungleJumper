import Phaser from 'phaser';
import { COLORS } from '../constants';
import { SettingsManager } from '../systems/SettingsManager';

export type TransitionStyle = 'leaf' | 'palette' | 'mosaic';

/** One short outgoing cover, with a synchronous lock shared by every input path. */
export class SceneTransition {
  private static controllers = new WeakMap<Phaser.Scene, SceneTransition>();
  private busy = false;

  static install(scene: Phaser.Scene): void {
    this.controllers.set(scene, new SceneTransition(scene));
    scene.input.enabled = true;
  }

  static isBusy(scene: Phaser.Scene): boolean {
    return this.controllers.get(scene)?.busy ?? false;
  }

  static start(scene: Phaser.Scene, target: string, data: object = {}, style: TransitionStyle = 'leaf'): boolean {
    if (!this.controllers.has(scene)) this.install(scene);
    return this.controllers.get(scene)!.start(target, data, style);
  }

  private constructor(private readonly scene: Phaser.Scene) {}

  private start(target: string, data: object, style: TransitionStyle): boolean {
    const scene = this.scene;
    if (this.busy || !scene.sys.isActive()) return false;
    this.busy = true;
    scene.input.enabled = false;
    if (SettingsManager.getReducedMotion()) style = 'palette';
    const duration = SettingsManager.getReducedMotion() ? 100 : 180;
    const { width, height } = scene.cameras.main;
    const cover = scene.add.graphics().setScrollFactor(0).setDepth(10000);
    const progress = { value: 0 };
    const draw = () => {
      const p = progress.value;
      cover.clear();
      if (style === 'palette') {
        cover.fillStyle(COLORS.OUTLINE_DEEP, p).fillRect(0, 0, width, height);
      } else if (style === 'mosaic') {
        const size = 40;
        for (let y = 0; y < height; y += size) {
          for (let x = 0; x < width; x += size) {
            const rank = ((x / size * 7 + y / size * 13) % 17) / 17;
            if (p > rank) cover.fillStyle((x + y) % 80 ? COLORS.JUNGLE_TREE_DARK : COLORS.OUTLINE_DEEP)
              .fillRect(x, y, size, size);
          }
        }
      } else {
        const edge = p * (width + 100);
        cover.fillStyle(COLORS.JUNGLE_TREE_DARK).fillRect(0, 0, Math.max(0, edge - 60), height);
        for (let y = -32; y < height + 64; y += 48) {
          cover.fillStyle(COLORS.JUNGLE_TREE).fillEllipse(edge - 65, y, 130, 90);
          cover.lineStyle(2, COLORS.JUNGLE_TREE_DARK).lineBetween(edge - 110, y + 20, edge - 15, y - 20);
        }
      }
    };
    const tween = scene.tweens.add({
      targets: progress, value: 1, duration, onUpdate: draw,
      onComplete: () => scene.scene.start(target, data),
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      tween.stop();
      cover.destroy();
    });
    return true;
  }
}
