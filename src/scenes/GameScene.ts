import Phaser from 'phaser';
import { SceneTransition } from '../ui/SceneTransition';
import { FeedbackManager } from '../systems/FeedbackManager';
import { SettingsManager } from '../systems/SettingsManager';
import { GAME } from '../constants';
import { Player, type PlayerFeedbackEvent } from '../entities/Player';
import { Platform } from '../entities/Platform';
import { Obstacle } from '../entities/Obstacle';
import { InputManager } from '../systems/InputManager';
import { LevelGenerator } from '../systems/LevelGenerator';
import { BackgroundManager } from '../systems/BackgroundManager';
import { AudioManager } from '../systems/AudioManager';
import { MenuNavigator } from '../systems/MenuNavigator';
import { UIFactory } from '../ui/UIFactory';
import {
  EFFECT_ANIMATIONS,
  EFFECT_TEXTURES,
} from '../graphics/AnimationRegistry';

export class GameScene extends Phaser.Scene {
  private feedback!: FeedbackManager;
  private lastObstacleHit = -Infinity;
  private player!: Player;
  private platforms!: Phaser.GameObjects.Group;
  private obstacles!: Phaser.GameObjects.Group;
  private shields!: Phaser.GameObjects.Group;
  private inputManager!: InputManager;
  private levelGenerator!: LevelGenerator;
  private bgManager!: BackgroundManager;
  private score = 0;
  private highestY = 0;
  private startY = 0;
  private gameOver = false;
  private deathPending = false;
  private isPaused = false;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private pauseMenuNavigator: MenuNavigator | null = null;
  private supportingPlatform: Platform | null = null;
  private supportContactAt = -Infinity;

  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    SceneTransition.install(this);
    this.feedback = new FeedbackManager(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.lastObstacleHit = -Infinity;
    this.supportingPlatform = null;
    this.supportContactAt = -Infinity;
    this.score = 0;
    this.gameOver = false;
    this.deathPending = false;
    this.isPaused = false;

    // Set up world bounds (wide enough, infinite vertical)
    this.physics.world.setBounds(0, -100000, GAME.WIDTH, 200000);
    this.physics.world.gravity.y = GAME.GRAVITY;

    // Background
    this.bgManager = new BackgroundManager(this);

    // Groups
    this.platforms = this.add.group();
    this.obstacles = this.add.group();
    this.shields = this.add.group();

    // Starting platform
    this.startY = GAME.HEIGHT - 100;
    const startPlatform = new Platform(this, GAME.WIDTH / 2, this.startY, 'normal');
    this.platforms.add(startPlatform);

    // Generate initial platforms above
    this.levelGenerator = new LevelGenerator(this.startY - GAME.MIN_PLATFORM_GAP, GAME.WIDTH / 2);
    const initial = this.levelGenerator.generateChunk(this.startY - GAME.HEIGHT * 2);
    this.spawnFromData(initial);

    // Player
    this.player = new Player(this, GAME.WIDTH / 2, this.startY - 40, this.feedback);
    this.player.on('feedback', this.onPlayerFeedback, this);
    this.highestY = this.player.y;

    // Camera - manually controlled to only scroll upward
    this.cameras.main.scrollY = this.startY - GAME.HEIGHT + 100;

    // Collisions
    this.physics.add.collider(
      this.player,
      this.platforms,
      this.onPlatformCollision,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.obstacles,
      this.onObstacleHit,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.shields,
      this.onShieldPickup,
      undefined,
      this
    );

    // Input
    this.inputManager = new InputManager(this);

    // Launch HUD
    this.scene.launch('GameUI', { gameScene: this });
  }

  update(): void {
    if (this.gameOver || SceneTransition.isBusy(this)) return;
    if (this.isPaused) return;

    const input = this.inputManager.getState();

    // Pause
    if (input.pause) {
      this.togglePause();
      return;
    }

    // Hit-stop freezes gameplay updates too; pause input remains available.
    if (this.physics.world.isPaused) return;

    // Player movement
    if (input.left) {
      this.player.moveLeft();
    } else if (input.right) {
      this.player.moveRight();
    } else {
      this.player.stopHorizontal();
    }

    if (input.jumpJustDown) {
      this.player.jump();
    }

    this.player.update();
    if (this.player.alive && (this.player.body as Phaser.Physics.Arcade.Body).velocity.y < -400) {
      this.feedback.trail(this.player.x, this.player.y + 14);
    }

    // Track score (height climbed)
    if (this.player.y < this.highestY) {
      this.highestY = this.player.y;
      this.score = Math.floor((this.startY - this.highestY) / 10);
    }

    // Generate more level
    const cameraTop = this.cameras.main.scrollY;
    const chunk = this.levelGenerator.generateChunk(cameraTop);
    this.spawnFromData(chunk);

    // Update platforms
    const platformChildren = this.platforms.getChildren() as Platform[];
    for (const platform of platformChildren) {
      if (platform.active) {
        platform.updatePlatform();
        // Cleanup below camera
        if (platform.y > cameraTop + GAME.HEIGHT + GAME.CLEANUP_BEHIND) {
          platform.destroy();
        }
      }
    }

    this.carryPlayerWithMovingPlatform();

    // Update obstacles
    const obstacleChildren = this.obstacles.getChildren() as Obstacle[];
    for (const obstacle of obstacleChildren) {
      if (obstacle.active) {
        obstacle.updateObstacle(this.player.x, this.player.y);
        if (obstacle.y > cameraTop + GAME.HEIGHT + GAME.CLEANUP_BEHIND) {
          obstacle.destroy();
        }
      }
    }

    // Update shields
    const shieldChildren = this.shields.getChildren() as Phaser.GameObjects.Sprite[];
    for (const shield of shieldChildren) {
      if (shield.active) {
        if (shield.y > cameraTop + GAME.HEIGHT + GAME.CLEANUP_BEHIND) {
          shield.destroy();
        }
        const baseY = shield.getData('baseY') as number;
        shield.y = baseY + (SettingsManager.getReducedMotion() ? 0 : Math.sin(this.time.now * 0.005 + shield.x) * 3);
      }
    }

    // Camera: only scroll upward, smoothly follow player when they go higher
    const targetCamY = this.player.y - GAME.HEIGHT * 0.4;
    if (targetCamY < this.cameras.main.scrollY) {
      this.cameras.main.scrollY += (targetCamY - this.cameras.main.scrollY) * 0.1;
    }

    // Update background (use updated camera position)
    this.bgManager.update(this.cameras.main.scrollY + GAME.HEIGHT / 2, this.score);

    // Death: fell below camera
    if (this.player.alive && this.player.y > cameraTop + GAME.HEIGHT + 50) {
      this.player.die();
      this.scheduleGameOver(650);
    }
  }

  private spawnFromData(data: {
    platforms: { x: number; y: number; type: string; variant: number }[];
    obstacles: { x: number; y: number; type: string }[];
    shields: { x: number; y: number }[];
  }): void {
    for (const p of data.platforms) {
      const platform = new Platform(this, p.x, p.y, p.type as any, p.variant);
      this.platforms.add(platform);
    }
    for (const o of data.obstacles) {
      const obstacle = new Obstacle(this, o.x, o.y, o.type as any);
      if (o.type === 'snake' || o.type === 'thorns') {
        const support = (this.platforms.getChildren() as Platform[]).find(p =>
          Math.abs(p.x - o.x) < 1 && Math.abs(p.y - (o.y + (o.type === 'snake' ? 16 : 14))) < 1);
        if (support) obstacle.attachToPlatform(support);
      }
      this.obstacles.add(obstacle);
    }
    for (const s of data.shields) {
      const shield = this.add.sprite(s.x, s.y, EFFECT_TEXTURES.shieldIdle);
      if (!SettingsManager.getReducedMotion()) shield.play(EFFECT_ANIMATIONS.shieldIdle);
      shield.setData('baseY', s.y);
      this.physics.add.existing(shield, true);
      shield.setDepth(6);
      this.shields.add(shield);
    }
  }

  private onPlatformCollision(playerObj: any, platformObj: any): void {
    const player = playerObj as Player;
    const platform = platformObj as Platform;
    const playerBody = player.body as Phaser.Physics.Arcade.Body;

    // Only land if player is falling down
    if (playerBody.velocity.y < 0) return;

    this.supportingPlatform = platform;
    this.supportContactAt = this.time.now;

    if (platform.platformType === 'normal') {
      player.rechargeAirJump();
    }

    if (platform.platformType === 'spring') {
      platform.activateSpring();
      player.springJump();
    } else if (platform.platformType === 'crumbling') {
      platform.startCrumble();
    }
  }

  private onObstacleHit(playerObj: any, obstacleObj: any): void {
    const player = playerObj as Player;
    const obstacle = obstacleObj as Obstacle;
    if (!player.alive || this.time.now - this.lastObstacleHit < 450) return;
    this.lastObstacleHit = this.time.now;
    AudioManager.impact();
    const died = player.hitObstacle();
    obstacle.reactToHit(!died);
    if (died) {
      this.scheduleGameOver(800);
    }
  }

  private carryPlayerWithMovingPlatform(): void {
    const platform = this.supportingPlatform;
    if (!platform?.active || this.time.now - this.supportContactAt > 50) {
      this.supportingPlatform = null;
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const withinSurface = Math.abs(this.player.x - platform.x) <= platform.getSurfaceWidth() / 2 + body.width / 2;
    if (body.velocity.y < 0 || !withinSurface) return;
    this.player.carryWithPlatform(platform.getMovementDeltaX());
  }

  private onShieldPickup(playerObj: any, shieldObj: any): void {
    const player = playerObj as Player;
    const shield = shieldObj as Phaser.GameObjects.Sprite;
    player.pickupShield();
    shield.destroy();
  }

  private onPlayerFeedback(kind: PlayerFeedbackEvent, x: number, y: number, speed = 0): void {
    const fx = this.feedback;
    switch (kind) {
      case 'landing': {
        const weight = Phaser.Math.Clamp(speed / 700, 0, 1);
        fx.burst(x, y + 14, 0xd8c49b, 3 + Math.round(weight * 7), 10 + weight * 24);
        if (speed > 450) fx.impulse(weight * 2, 70);
        break;
      }
      case 'jump': fx.burst(x, y + 14, 0xffe6a3, 5, 18); break;
      case 'double-jump':
        fx.ring(x, y + 12, 0x9ef4ff);
        fx.burst(x, y + 14, 0x9ef4ff, 6, 24);
        break;
      case 'shield-pickup':
        fx.burst(x, y, 0x87cefa, 10, 30);
        fx.ring(x, y, 0x87cefa);
        fx.label(x, y, 'SHIELD');
        break;
      case 'shield-break':
        fx.burst(x, y, 0x00bfff, 12, 40, true);
        fx.label(x, y, 'SHIELD BROKEN');
        fx.impulse(2.5); fx.hitStop(); fx.flash(0x87cefa);
        break;
      case 'obstacle-damage':
        fx.burst(x, y, 0xffad65, 9, 30);
        fx.impulse(3, 110); fx.hitStop(50); fx.flash(0xc0392b);
        break;
      case 'spring-launch':
        fx.ring(x, y + 16, 0xf1c40f);
        fx.burst(x, y + 16, 0xf1c40f, 8, 30);
        fx.impulse(1.5, 75);
        break;
      case 'death':
        fx.burst(x, y, 0xc0392b, 12, 44, true);
        fx.label(x, y, 'DEFEAT');
        fx.impulse(3, 110);
        break;
    }
  }

  private scheduleGameOver(delayMs: number): void {
    if (this.deathPending) return;
    this.deathPending = true;
    this.time.delayedCall(delayMs, () => this.playerDied());
  }

  private playerDied(): void {
    if (this.gameOver || SceneTransition.isBusy(this)) return;
    this.gameOver = true;
    AudioManager.gameOver();
    this.hidePauseMenu();
    this.scene.stop('GameUI');
    SceneTransition.start(this, 'GameOver', { score: this.score }, 'mosaic');
  }

  getScore(): number {
    return this.score;
  }

  isHudAreaClear(bottom: number): boolean {
    const playerTop = this.player.y - this.cameras.main.scrollY - this.player.displayHeight / 2;
    return playerTop > bottom + 12;
  }

  togglePause(): void {
    if (this.gameOver || this.deathPending || SceneTransition.isBusy(this)) return;
    this.feedback.cancelHitStop();
    this.isPaused = !this.isPaused;
    this.inputManager.setEnabled(!this.isPaused);

    if (this.isPaused) {
      this.physics.pause();
      this.showPauseMenu();
    } else {
      this.physics.resume();
      this.hidePauseMenu();
    }
  }

  private showPauseMenu(): void {
    const ui = new UIFactory(this);
    const cam = this.cameras.main;
    const cx = cam.scrollX + GAME.WIDTH / 2;
    const cy = cam.scrollY + GAME.HEIGHT / 2;

    const overlay = this.add.rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.6);
    overlay.setDepth(100);

    const touch = this.sys.game.device.input.touch && SettingsManager.getMobileControlsEnabled();
    const panel = ui.panel(cx, cy, 320, touch ? 380 : 260, true).setDepth(101);
    const title = ui.text(cx, cy - (touch ? 140 : 82), 'PAUSED', {
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    const resumeButton = ui.button(cx, cy - (touch ? 75 : 10), 'RESUME', {
      fontSize: 16,
      onActivate: () => this.togglePause(),
    }).setDepth(102);

    const menuButton = ui.button(cx, cy + (touch ? 130 : 58), 'MAIN MENU', {
      size: 'small', fontSize: 11,
      onActivate: () => {
        if (SceneTransition.isBusy(this)) return;
        this.scene.stop('GameUI');
        SceneTransition.start(this, 'MainMenu', {}, 'palette');
      },
    }).setDepth(102);

    this.pauseOverlay = this.add.container(0, 0, [
      overlay,
      panel,
      title,
      resumeButton.container,
      menuButton.container,
    ]);
    this.pauseOverlay.setDepth(100);
    const sizeRows = touch ? (['small', 'medium', 'large'] as const).map((size, index) => {
      const row = ui.row(cx, cy + index * 36, size.toUpperCase(), {
        width: 256, height: 34, fontSize: 12,
        value: SettingsManager.getTouchControlSize() === size ? 'SELECTED' : '',
        onActivate: () => {
          SettingsManager.setTouchControlSize(size);
          this.inputManager.layoutTouchControls();
          sizeRows.forEach((option, i) => {
            option.setValue(i === index ? 'SELECTED' : '');
            option.setActive(i === index);
          });
        },
      });
      row.setActive(SettingsManager.getTouchControlSize() === size);
      this.pauseOverlay!.add(row.container);
      return row;
    }) : [];
    if (touch) this.pauseOverlay.add(ui.text(cx, cy - 30, 'TOUCH CONTROL SIZE', {
      fontSize: '11px', color: '#FFE6A3',
    }).setOrigin(0.5));

    this.pauseMenuNavigator?.destroy();
    this.pauseMenuNavigator = new MenuNavigator(this, [
      {
        onFocus: () => resumeButton.setFocused(true),
        onBlur: () => resumeButton.setFocused(false),
        activate: resumeButton.activate,
      },
      ...sizeRows.map(row => ({
        onFocus: () => row.setFocused(true),
        onBlur: () => row.setFocused(false),
        activate: row.activate,
      })),
      {
        onFocus: () => menuButton.setFocused(true),
        onBlur: () => menuButton.setFocused(false),
        activate: menuButton.activate,
      },
    ], {
      onBack: () => {
        this.togglePause();
      },
    });

    resumeButton.image.on('pointerover', () => {
      this.pauseMenuNavigator?.setIndex(0);
    });

    sizeRows.forEach((row, index) => row.panel.on('pointerover', () => {
      this.pauseMenuNavigator?.setIndex(index + 1);
    }));
    menuButton.image.on('pointerover', () => {
      this.pauseMenuNavigator?.setIndex(sizeRows.length + 1);
    });
  }

  private hidePauseMenu(): void {
    this.pauseMenuNavigator?.destroy();
    this.pauseMenuNavigator = null;

    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }

  shutdown(): void {
    this.feedback?.destroy();
    this.player?.off('feedback', this.onPlayerFeedback, this);
    this.pauseMenuNavigator?.destroy();
    this.pauseMenuNavigator = null;
    this.inputManager?.destroy();
    this.bgManager?.destroy();
  }
}


