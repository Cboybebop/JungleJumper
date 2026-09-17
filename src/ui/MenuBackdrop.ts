import Phaser from 'phaser';
import { CHARACTERS, GAME } from '../constants';
import { getAnimationKey } from '../graphics/AnimationRegistry';
import { SettingsManager } from '../systems/SettingsManager';

/** A bounded, reusable cast of scenery; everything wraps outside the viewport. */
export class MenuBackdrop {
  private readonly trunk: Phaser.GameObjects.TileSprite;
  private readonly platforms: Phaser.GameObjects.Container[] = [];
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly reducedMotion = SettingsManager.getReducedMotion();
  private readonly spacing = Math.max(150, (GAME.HEIGHT + 200) / CHARACTERS.length);
  private readonly loopHeight = this.spacing * CHARACTERS.length;

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < 4; i++) {
      this.clouds.push(scene.add.image(
        GAME.WIDTH * [0.16, 0.81, 0.33, 0.72][i],
        GAME.HEIGHT * (i + 0.5) / 4,
        'world-cloud',
      ).setAlpha(0.45).setDepth(-30));
    }

    this.trunk = scene.add.tileSprite(
      GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.TRUNK_WIDTH, GAME.HEIGHT, 'world-trunk-0',
    ).setDepth(-20);

    CHARACTERS.forEach((character, index) => {
      const x = GAME.WIDTH * [0.24, 0.76, 0.29, 0.71, 0.22][index % 5];
      const platform = scene.add.image(0, 0, 'platform-normal', index % 4);
      const sprite = scene.add.sprite(0, -8, character.texture).setOrigin(0.5, 1);
      const animation = getAnimationKey(character, 'idle');
      if (!this.reducedMotion && scene.anims.exists(animation)) sprite.play(animation);
      const flower = scene.add.image(index % 2 ? -25 : 25, -8,
        index % 2 ? 'world-flower-gold' : 'world-flower-pink').setOrigin(0.5, 1);
      this.platforms.push(scene.add.container(x, GAME.HEIGHT * 0.43 + index * this.spacing,
        [platform, flower, sprite]).setDepth(-10));
    });
    this.update(0);
  }

  update(delta: number): void {
    // Cap a resumed/background-tab frame to avoid a sudden jump in the scene.
    const distance = this.reducedMotion ? 0 : Math.min(delta, 50) * 0.022;
    this.trunk.tilePositionY += distance;
    for (const platform of this.platforms) {
      platform.y = Phaser.Math.Wrap(platform.y - distance, -80, this.loopHeight - 80);
    }
    for (const cloud of this.clouds) {
      cloud.y = Phaser.Math.Wrap(cloud.y - distance * 0.3, -100, GAME.HEIGHT + 100);
    }
  }
}
