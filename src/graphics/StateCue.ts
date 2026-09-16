import Phaser from 'phaser';

/** High-contrast symbols supplement color; generated once and shared by all instances. */
export function stateCue(scene: Phaser.Scene, kind: 'moving' | 'crumbling' | 'spring' | 'hazard'): Phaser.GameObjects.Image {
  const key = `state-cue-${kind}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x211936).fillRect(0, 0, 16, 10);
    g.lineStyle(2, 0xffe6a3);
    if (kind === 'moving') {
      g.lineBetween(2, 5, 5, 2).lineBetween(2, 5, 5, 8);
      g.lineBetween(14, 5, 11, 2).lineBetween(14, 5, 11, 8);
    } else if (kind === 'spring') {
      g.lineBetween(4, 6, 8, 2).lineBetween(8, 2, 12, 6).lineBetween(8, 2, 8, 9);
    } else if (kind === 'crumbling') {
      g.lineBetween(4, 2, 7, 5).lineBetween(7, 5, 5, 8);
      g.lineBetween(11, 2, 9, 5).lineBetween(9, 5, 12, 8);
    } else {
      g.lineBetween(8, 1, 8, 5).fillStyle(0xffe6a3).fillRect(7, 7, 2, 2);
    }
    g.generateTexture(key, 16, 10);
    g.destroy();
  }
  return scene.add.image(0, 0, key);
}
