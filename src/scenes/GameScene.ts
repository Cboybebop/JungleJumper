import Phaser from 'phaser';
import { GAME } from '../constants';
import { Player } from '../entities/Player';
import { Platform } from '../entities/Platform';
import { Obstacle } from '../entities/Obstacle';
import { InputManager } from '../systems/InputManager';
import { LevelGenerator } from '../systems/LevelGenerator';
import { BackgroundManager } from '../systems/BackgroundManager';
import { AudioManager } from '../systems/AudioManager';
import { MenuNavigator } from '../systems/MenuNavigator';

interface PauseMenuButton {
  image: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  activate: () => void;
}

export class GameScene extends Phaser.Scene {
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
  private isPaused = false;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private pauseMenuNavigator: MenuNavigator | null = null;

  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    this.score = 0;
    this.gameOver = false;
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
    this.player = new Player(this, GAME.WIDTH / 2, this.startY - 40);
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
    if (this.gameOver) return;
    if (this.isPaused) return;

    const input = this.inputManager.getState();

    // Pause
    if (input.pause) {
      this.togglePause();
      return;
    }

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

    // Update obstacles
    const obstacleChildren = this.obstacles.getChildren() as Obstacle[];
    for (const obstacle of obstacleChildren) {
      if (obstacle.active) {
        obstacle.updateObstacle();
        if (obstacle.y > cameraTop + GAME.HEIGHT + GAME.CLEANUP_BEHIND) {
          obstacle.destroy();
        }
      }
    }

    // Update shields
    const shieldChildren = this.shields.getChildren() as Phaser.GameObjects.Image[];
    for (const shield of shieldChildren) {
      if (shield.active) {
        if (shield.y > cameraTop + GAME.HEIGHT + GAME.CLEANUP_BEHIND) {
          shield.destroy();
        }
        // Bobbing animation
        shield.y += Math.sin(this.time.now * 0.005 + shield.x) * 0.3;
      }
    }

    // Camera: only scroll upward, smoothly follow player when they go higher
    const targetCamY = this.player.y - GAME.HEIGHT * 0.4;
    if (targetCamY < this.cameras.main.scrollY) {
      this.cameras.main.scrollY += (targetCamY - this.cameras.main.scrollY) * 0.1;
    }

    // Update background (use updated camera position)
    this.bgManager.update(this.cameras.main.scrollY + GAME.HEIGHT / 2);

    // Death: fell below camera
    if (this.player.y > cameraTop + GAME.HEIGHT + 50) {
      this.playerDied();
    }
  }

  private spawnFromData(data: {
    platforms: { x: number; y: number; type: string }[];
    obstacles: { x: number; y: number; type: string }[];
    shields: { x: number; y: number }[];
  }): void {
    for (const p of data.platforms) {
      const platform = new Platform(this, p.x, p.y, p.type as any);
      this.platforms.add(platform);
    }
    for (const o of data.obstacles) {
      const obstacle = new Obstacle(this, o.x, o.y, o.type as any);
      this.obstacles.add(obstacle);
    }
    for (const s of data.shields) {
      const shield = this.add.image(s.x, s.y, 'shield-pickup');
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

    if (platform.platformType === 'normal') {
      player.rechargeAirJump();
    }

    if (platform.platformType === 'spring') {
      player.springJump();
    } else if (platform.platformType === 'crumbling') {
      platform.startCrumble();
    }
  }

  private onObstacleHit(playerObj: any, _obstacleObj: any): void {
    const player = playerObj as Player;
    const died = player.hitObstacle();
    if (died) {
      this.time.delayedCall(800, () => this.playerDied());
    }
  }

  private onShieldPickup(playerObj: any, shieldObj: any): void {
    const player = playerObj as Player;
    const shield = shieldObj as Phaser.GameObjects.Image;
    player.pickupShield();
    shield.destroy();
  }

  private playerDied(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    AudioManager.gameOver();
    this.hidePauseMenu();
    this.scene.stop('GameUI');
    this.time.delayedCall(500, () => {
      this.scene.start('GameOver', { score: this.score });
    });
  }

  getScore(): number {
    return this.score;
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.physics.pause();
      this.showPauseMenu();
    } else {
      this.physics.resume();
      this.hidePauseMenu();
    }
  }

  private showPauseMenu(): void {
    const cam = this.cameras.main;
    const cx = cam.scrollX + GAME.WIDTH / 2;
    const cy = cam.scrollY + GAME.HEIGHT / 2;

    const overlay = this.add.rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.6);
    overlay.setDepth(100);

    const title = this.add.text(cx, cy - 80, 'PAUSED', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    const resumeButton: PauseMenuButton = {
      image: this.add.image(cx, cy, 'button').setInteractive({ useHandCursor: true }).setDepth(101),
      text: this.add.text(cx, cy, 'RESUME', {
        fontSize: '20px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(102),
      activate: () => {
        AudioManager.buttonClick();
        this.togglePause();
      },
    };

    resumeButton.image.on('pointerdown', resumeButton.activate);

    const menuButton: PauseMenuButton = {
      image: this.add.image(cx, cy + 60, 'button-small').setInteractive({ useHandCursor: true }).setDepth(101),
      text: this.add.text(cx, cy + 60, 'MAIN MENU', {
        fontSize: '16px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(102),
      activate: () => {
        AudioManager.buttonClick();
        this.physics.resume();
        this.scene.stop('GameUI');
        this.scene.start('MainMenu');
      },
    };

    menuButton.image.on('pointerdown', menuButton.activate);

    this.pauseOverlay = this.add.container(0, 0, [
      overlay,
      title,
      resumeButton.image,
      resumeButton.text,
      menuButton.image,
      menuButton.text,
    ]);
    this.pauseOverlay.setDepth(100);

    this.pauseMenuNavigator?.destroy();
    this.pauseMenuNavigator = new MenuNavigator(this, [
      {
        onFocus: () => this.setPauseButtonFocused(resumeButton, true),
        onBlur: () => this.setPauseButtonFocused(resumeButton, false),
        activate: resumeButton.activate,
      },
      {
        onFocus: () => this.setPauseButtonFocused(menuButton, true),
        onBlur: () => this.setPauseButtonFocused(menuButton, false),
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

    menuButton.image.on('pointerover', () => {
      this.pauseMenuNavigator?.setIndex(1);
    });
  }

  private setPauseButtonFocused(button: PauseMenuButton, focused: boolean): void {
    if (focused) {
      button.image.setTint(0xD8ECFF);
      button.text.setScale(1.05);
    } else {
      button.image.clearTint();
      button.text.setScale(1);
    }
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
    this.pauseMenuNavigator?.destroy();
    this.pauseMenuNavigator = null;
    this.inputManager?.destroy();
    this.bgManager?.destroy();
  }
}


