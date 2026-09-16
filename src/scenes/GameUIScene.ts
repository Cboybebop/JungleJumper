import Phaser from 'phaser';
import { GAME, CHARACTERS } from '../constants';
import { UIFactory } from '../ui/UIFactory';
import { getSafeArea } from '../ui/SafeArea';
import { SettingsManager } from '../systems/SettingsManager';
import { getRunProgress } from '../ui/RunProgress';
import type { GameScene } from './GameScene';

export class GameUIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private gameScene!: GameScene;
  private notice!: Phaser.GameObjects.Text;
  private noticeTimer?: Phaser.Time.TimerEvent;
  private lastMilestone = 0;
  private lastBiome = '';
  private readyCard?: Phaser.GameObjects.Container;

  constructor() { super({ key: 'GameUI' }); }

  init(data: { gameScene: GameScene }): void { this.gameScene = data.gameScene; }

  create(): void {
    const ui = new UIFactory(this);
    const safe = getSafeArea(this, 12);
    this.lastMilestone = 0;
    this.lastBiome = getRunProgress(0).biome.label;
    const scoreY = safe.top + 21;
    ui.scorePlaque(GAME.WIDTH / 2, scoreY).setDepth(100);
    this.scoreText = ui.text(GAME.WIDTH / 2, scoreY, '0M', {
      fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);
    ui.pauseButton(GAME.WIDTH - safe.right - 18, safe.top + 18,
      () => this.gameScene.togglePause()).setDepth(102);

    // Shallow HUD strip, above the player and central landing area.
    this.notice = ui.text(GAME.WIDTH / 2, safe.top + 48, '', {
      fontSize: '10px', color: '#FFE6A3', backgroundColor: '#211936',
      padding: { x: 8, y: 5 }, align: 'center', wordWrap: { width: GAME.WIDTH - safe.left - safe.right - 24 },
    }).setOrigin(0.5, 0).setDepth(103).setVisible(false);
    const character = CHARACTERS[SettingsManager.selectedCharacter] ?? CHARACTERS[0];
    const width = Math.min(360, GAME.WIDTH - safe.left - safe.right);
    const panel = ui.panel(0, 0, width, 84);
    const portrait = this.add.image(-width / 2 + 28, -17, character.portrait).setDisplaySize(36, 36);
    const cue = ui.text(-width / 2 + 54, -32, `${character.name.toUpperCase()} · READY!`, {
      fontSize: '12px', color: '#FFE6A3',
    });
    const biome = ui.text(-width / 2 + 54, -12, 'LOWER JUNGLE', { fontSize: '9px', color: '#87CEEB' });
    const keys = SettingsManager.getKeys();
    const touch = this.sys.game.device.input.touch && SettingsManager.getMobileControlsEnabled();
    const pad = (this.input.gamepad?.total ?? 0) > 0;
    const controls = touch ? 'TAP LEFT / RIGHT TO MOVE · TAP JUMP' : pad
      ? 'STICK / D-PAD MOVE · A JUMP'
      : `${keys.left}/${keys.right} MOVE · ${keys.jump} JUMP`;
    const reminder = ui.text(0, 9, `${controls}\nJUMP AGAIN IN AIR`, {
      fontSize: '9px', align: 'center', wordWrap: { width: width - 20 },
    }).setOrigin(0.5, 0);
    this.readyCard = this.add.container(GAME.WIDTH / 2, safe.top + 90, [panel, portrait, cue, biome, reminder]).setDepth(104);
    this.time.delayedCall(1600, () => {
      if (!this.readyCard) return;
      this.tweens.add({ targets: this.readyCard, alpha: 0, duration: 120, onComplete: () => {
        this.readyCard?.destroy(); this.readyCard = undefined;
      } });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.noticeTimer?.remove(); this.noticeTimer = undefined; this.readyCard = undefined;
    });
  }

  update(): void {
    const height = this.gameScene.getScore();
    this.scoreText.setText(`${height}M`);
    // Spring jumps can briefly outrun camera tracking: yield the notice area.
    if (this.readyCard) this.readyCard.setVisible(this.gameScene.isHudAreaClear(this.readyCard.y + 42));
    this.notice.setAlpha(this.gameScene.isHudAreaClear(this.notice.getBounds().bottom) ? 1 : 0);
    const progress = getRunProgress(height);
    const milestone = progress.milestones > this.lastMilestone;
    const biome = progress.biome.label !== this.lastBiome;
    if (!milestone && !biome) return;
    this.lastMilestone = progress.milestones;
    this.lastBiome = progress.biome.label;
    if (this.readyCard) {
      this.tweens.killTweensOf(this.readyCard);
      this.readyCard.destroy(); this.readyCard = undefined;
    }
    const parts = [];
    if (milestone) parts.push(`${progress.latestMilestone}M · KEEP CLIMBING!`);
    if (biome) parts.push(progress.biome.label.toUpperCase());
    this.noticeTimer?.remove();
    this.notice.setText(parts.join('\n')).setVisible(true);
    this.noticeTimer = this.time.delayedCall(1400, () => this.notice.setVisible(false));
  }
}
