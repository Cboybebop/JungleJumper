import Phaser from 'phaser';
import { COLORS, GAME, CHARACTERS } from '../constants';

export class TextureGenerator {
  static generate(scene: Phaser.Scene): void {
    this.generateCharacters(scene);
    this.generatePlatforms(scene);
    this.generateObstacles(scene);
    this.generateBackground(scene);
    this.generateUI(scene);
    this.generateShield(scene);
  }

  private static generateCharacters(scene: Phaser.Scene): void {
    const size = GAME.PLAYER_SIZE;

    for (const char of CHARACTERS) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      const s = size;

      switch (char.key) {
        case 'monkey':
          // Body
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.2, s * 0.15, s * 0.6, s * 0.55, 8);
          // Face
          g.fillStyle(char.accent);
          g.fillCircle(s * 0.5, s * 0.3, s * 0.2);
          // Eyes
          g.fillStyle(0xFFFFFF);
          g.fillCircle(s * 0.4, s * 0.25, 4);
          g.fillCircle(s * 0.6, s * 0.25, 4);
          g.fillStyle(0x000000);
          g.fillCircle(s * 0.4, s * 0.25, 2);
          g.fillCircle(s * 0.6, s * 0.25, 2);
          // Mouth
          g.lineStyle(2, 0x000000);
          g.beginPath();
          g.arc(s * 0.5, s * 0.35, 5, 0, Math.PI);
          g.strokePath();
          // Ears
          g.fillStyle(char.accent);
          g.fillCircle(s * 0.2, s * 0.2, 5);
          g.fillCircle(s * 0.8, s * 0.2, 5);
          // Legs
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.25, s * 0.65, s * 0.15, s * 0.25, 4);
          g.fillRoundedRect(s * 0.6, s * 0.65, s * 0.15, s * 0.25, 4);
          // Tail
          g.lineStyle(3, char.color);
          g.beginPath();
          g.arc(s * 0.85, s * 0.5, 10, -Math.PI * 0.5, Math.PI * 0.5);
          g.strokePath();
          break;

        case 'parrot':
          // Body
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.25, s * 0.15, s * 0.5, s * 0.5, 10);
          // Wing
          g.fillStyle(char.accent);
          g.fillRoundedRect(s * 0.2, s * 0.3, s * 0.2, s * 0.3, 6);
          g.fillRoundedRect(s * 0.6, s * 0.3, s * 0.2, s * 0.3, 6);
          // Eyes
          g.fillStyle(0xFFFFFF);
          g.fillCircle(s * 0.4, s * 0.25, 5);
          g.fillCircle(s * 0.6, s * 0.25, 5);
          g.fillStyle(0x000000);
          g.fillCircle(s * 0.4, s * 0.25, 2.5);
          g.fillCircle(s * 0.6, s * 0.25, 2.5);
          // Beak
          g.fillStyle(0xF39C12);
          g.fillTriangle(s * 0.5, s * 0.3, s * 0.42, s * 0.38, s * 0.58, s * 0.38);
          // Tail feathers
          g.fillStyle(0xE74C3C);
          g.fillRoundedRect(s * 0.35, s * 0.6, s * 0.1, s * 0.3, 3);
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.45, s * 0.6, s * 0.1, s * 0.35, 3);
          g.fillStyle(0xF1C40F);
          g.fillRoundedRect(s * 0.55, s * 0.6, s * 0.1, s * 0.3, 3);
          // Crest
          g.fillStyle(0xE74C3C);
          g.fillTriangle(s * 0.5, s * 0.05, s * 0.4, s * 0.18, s * 0.6, s * 0.18);
          break;

        case 'frog':
          // Body
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.2, s * 0.25, s * 0.6, s * 0.45, 12);
          // Belly
          g.fillStyle(char.accent);
          g.fillRoundedRect(s * 0.3, s * 0.35, s * 0.4, s * 0.3, 8);
          // Big eyes on top
          g.fillStyle(0xFFFFFF);
          g.fillCircle(s * 0.35, s * 0.2, 8);
          g.fillCircle(s * 0.65, s * 0.2, 8);
          g.fillStyle(0x000000);
          g.fillCircle(s * 0.35, s * 0.2, 4);
          g.fillCircle(s * 0.65, s * 0.2, 4);
          // Mouth
          g.lineStyle(2, 0x1B7A3E);
          g.beginPath();
          g.arc(s * 0.5, s * 0.52, 8, 0, Math.PI);
          g.strokePath();
          // Legs
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.1, s * 0.6, s * 0.2, s * 0.3, 6);
          g.fillRoundedRect(s * 0.7, s * 0.6, s * 0.2, s * 0.3, 6);
          // Feet
          g.fillStyle(char.accent);
          g.fillEllipse(s * 0.15, s * 0.9, s * 0.25, s * 0.1);
          g.fillEllipse(s * 0.85, s * 0.9, s * 0.25, s * 0.1);
          break;

        case 'toucan':
          // Body
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.3, s * 0.2, s * 0.4, s * 0.5, 10);
          // Belly
          g.fillStyle(0xFFFFFF);
          g.fillRoundedRect(s * 0.35, s * 0.35, s * 0.3, s * 0.25, 6);
          // Big beak
          g.fillStyle(char.accent);
          g.fillRoundedRect(s * 0.55, s * 0.22, s * 0.35, s * 0.15, 6);
          g.fillStyle(0xE67E22);
          g.fillRoundedRect(s * 0.55, s * 0.28, s * 0.35, s * 0.12, 4);
          // Beak tip
          g.fillStyle(0x2C3E50);
          g.fillCircle(s * 0.88, s * 0.3, 3);
          // Eye
          g.fillStyle(0xFFFFFF);
          g.fillCircle(s * 0.48, s * 0.28, 5);
          g.fillStyle(0x000000);
          g.fillCircle(s * 0.48, s * 0.28, 2.5);
          // Eye ring
          g.lineStyle(1.5, 0x3498DB);
          g.strokeCircle(s * 0.48, s * 0.28, 6);
          // Tail
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.15, s * 0.55, s * 0.2, s * 0.35, 4);
          // Feet
          g.fillStyle(0xF39C12);
          g.fillRoundedRect(s * 0.35, s * 0.68, s * 0.12, s * 0.15, 3);
          g.fillRoundedRect(s * 0.53, s * 0.68, s * 0.12, s * 0.15, 3);
          break;

        case 'gecko':
          // Body
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.25, s * 0.2, s * 0.5, s * 0.45, 10);
          // Spots
          g.fillStyle(char.accent);
          g.fillCircle(s * 0.4, s * 0.35, 4);
          g.fillCircle(s * 0.6, s * 0.4, 3);
          g.fillCircle(s * 0.5, s * 0.5, 3.5);
          // Big eyes
          g.fillStyle(0xF1C40F);
          g.fillCircle(s * 0.35, s * 0.2, 7);
          g.fillCircle(s * 0.65, s * 0.2, 7);
          g.fillStyle(0x000000);
          g.fillCircle(s * 0.35, s * 0.2, 3);
          g.fillCircle(s * 0.65, s * 0.2, 3);
          // Mouth
          g.lineStyle(1.5, 0x148F77);
          g.beginPath();
          g.arc(s * 0.5, s * 0.32, 6, 0, Math.PI);
          g.strokePath();
          // Legs
          g.fillStyle(char.color);
          g.fillRoundedRect(s * 0.1, s * 0.3, s * 0.18, s * 0.12, 4);
          g.fillRoundedRect(s * 0.72, s * 0.3, s * 0.18, s * 0.12, 4);
          g.fillRoundedRect(s * 0.12, s * 0.55, s * 0.18, s * 0.12, 4);
          g.fillRoundedRect(s * 0.7, s * 0.55, s * 0.18, s * 0.12, 4);
          // Tail
          g.lineStyle(4, char.color);
          g.beginPath();
          g.moveTo(s * 0.5, s * 0.65);
          g.lineTo(s * 0.5, s * 0.78);
          g.lineTo(s * 0.6, s * 0.88);
          g.lineTo(s * 0.55, s * 0.95);
          g.strokePath();
          // Toe pads
          g.fillStyle(0xE8D5B7);
          g.fillCircle(s * 0.1, s * 0.36, 3);
          g.fillCircle(s * 0.9, s * 0.36, 3);
          g.fillCircle(s * 0.12, s * 0.61, 3);
          g.fillCircle(s * 0.88, s * 0.61, 3);
          break;
      }

      g.generateTexture(char.key, size, size);
      g.destroy();
    }
  }

  private static generatePlatforms(scene: Phaser.Scene): void {
    const w = GAME.PLATFORM_WIDTH;
    const h = GAME.PLATFORM_HEIGHT;

    // Normal platform (branch)
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.BRANCH);
    g.fillRoundedRect(0, 2, w, h - 2, 6);
    g.fillStyle(COLORS.BRANCH_DARK);
    g.fillRoundedRect(2, h - 4, w - 4, 4, 3);
    // Knots
    g.fillStyle(COLORS.TRUNK);
    g.fillCircle(w * 0.2, h * 0.4, 3);
    g.fillCircle(w * 0.7, h * 0.5, 2);
    // Leaves
    g.fillStyle(0x27AE60);
    g.fillEllipse(w * 0.05, 2, 10, 6);
    g.fillEllipse(w * 0.95, 2, 10, 6);
    g.generateTexture('platform-normal', w, h);
    g.destroy();

    // Moving platform
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x8E44AD);
    g.fillRoundedRect(0, 2, w, h - 2, 6);
    g.fillStyle(0x7D3C98);
    g.fillRoundedRect(2, h - 4, w - 4, 4, 3);
    // Arrow indicators
    g.fillStyle(0xF1C40F);
    g.fillTriangle(8, h / 2, 14, h / 2 - 4, 14, h / 2 + 4);
    g.fillTriangle(w - 8, h / 2, w - 14, h / 2 - 4, w - 14, h / 2 + 4);
    g.generateTexture('platform-moving', w, h);
    g.destroy();

    // Crumbling platform
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x935D3A);
    g.fillRoundedRect(0, 2, w, h - 2, 6);
    // Cracks
    g.lineStyle(1, 0x6D4424);
    g.lineBetween(w * 0.3, 2, w * 0.35, h);
    g.lineBetween(w * 0.6, 2, w * 0.55, h);
    g.lineBetween(w * 0.15, h * 0.5, w * 0.4, h * 0.5);
    g.lineBetween(w * 0.5, h * 0.4, w * 0.85, h * 0.6);
    g.generateTexture('platform-crumbling', w, h);
    g.destroy();

    // Spring platform
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.BRANCH);
    g.fillRoundedRect(0, 8, w, h - 6, 6);
    // Spring coil on top
    g.fillStyle(COLORS.SPRING);
    g.fillRoundedRect(w * 0.3, 0, w * 0.4, 10, 4);
    g.lineStyle(2, COLORS.SPRING_COIL);
    for (let i = 0; i < 4; i++) {
      const x = w * 0.35 + i * (w * 0.3 / 4);
      g.lineBetween(x, 2, x + 5, 8);
    }
    g.generateTexture('platform-spring', w, h + 4);
    g.destroy();

    // Trunk segment
    g = scene.make.graphics({ x: 0, y: 0 });
    const tw = GAME.TRUNK_WIDTH;
    g.fillStyle(COLORS.TRUNK);
    g.fillRect(0, 0, tw, 64);
    // Bark lines
    g.lineStyle(1, 0x4A2A5A, 0.5);
    g.lineBetween(tw * 0.2, 0, tw * 0.25, 64);
    g.lineBetween(tw * 0.6, 0, tw * 0.55, 64);
    g.lineBetween(tw * 0.8, 0, tw * 0.85, 64);
    // Bark texture dots
    g.fillStyle(0x4A2A5A);
    g.fillCircle(tw * 0.4, 15, 2);
    g.fillCircle(tw * 0.7, 40, 1.5);
    g.fillCircle(tw * 0.3, 55, 2);
    g.generateTexture('trunk', tw, 64);
    g.destroy();
  }

  private static generateObstacles(scene: Phaser.Scene): void {
    // Snake
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.SNAKE_BODY);
    // Wavy body
    for (let i = 0; i < 6; i++) {
      const x = 4 + i * 7;
      const y = i % 2 === 0 ? 10 : 16;
      g.fillCircle(x, y, 5);
    }
    // Head
    g.fillStyle(COLORS.SNAKE_BODY);
    g.fillCircle(4, 10, 6);
    // Eyes
    g.fillStyle(0xFFFFFF);
    g.fillCircle(3, 8, 2.5);
    g.fillStyle(0x000000);
    g.fillCircle(3, 8, 1.5);
    // Tongue
    g.lineStyle(1, 0xE74C3C);
    g.lineBetween(0, 12, -4, 14);
    g.lineBetween(-4, 14, -6, 12);
    g.lineBetween(-4, 14, -6, 16);
    // Pattern
    g.fillStyle(COLORS.SNAKE_PATTERN);
    g.fillCircle(18, 16, 3);
    g.fillCircle(32, 10, 3);
    g.generateTexture('snake', 48, 24);
    g.destroy();

    // Coconut
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.COCONUT);
    g.fillCircle(12, 12, 12);
    g.fillStyle(COLORS.COCONUT_HAIR);
    g.fillCircle(12, 5, 8);
    // Face/dots
    g.fillStyle(0x5C3317);
    g.fillCircle(8, 14, 2);
    g.fillCircle(16, 14, 2);
    g.fillCircle(12, 18, 2);
    g.generateTexture('coconut', 24, 24);
    g.destroy();

    // Thorny vine
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x1B7A3E);
    g.fillRect(0, 8, 40, 6);
    // Thorns
    g.fillStyle(COLORS.THORN);
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 8;
      g.fillTriangle(x, 8, x - 3, 2, x + 3, 2);
      g.fillTriangle(x, 14, x - 3, 20, x + 3, 20);
    }
    g.generateTexture('thorns', 40, 22);
    g.destroy();

    // Bat
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.BAT_BODY);
    g.fillCircle(16, 12, 7);
    // Wings
    g.fillStyle(COLORS.BAT_WING);
    g.fillTriangle(0, 8, 10, 6, 10, 16);
    g.fillTriangle(32, 8, 22, 6, 22, 16);
    // Ears
    g.fillStyle(COLORS.BAT_BODY);
    g.fillTriangle(12, 4, 14, 0, 16, 4);
    g.fillTriangle(16, 4, 18, 0, 20, 4);
    // Eyes
    g.fillStyle(0xFF0000);
    g.fillCircle(14, 11, 2);
    g.fillCircle(18, 11, 2);
    // Fangs
    g.fillStyle(0xFFFFFF);
    g.fillTriangle(14, 15, 15, 18, 16, 15);
    g.fillTriangle(16, 15, 17, 18, 18, 15);
    g.generateTexture('bat', 32, 20);
    g.destroy();

    // Warning indicator for falling coconut
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xFF0000, 0.6);
    g.fillTriangle(8, 0, 0, 16, 16, 16);
    g.fillStyle(0xFFFFFF);
    g.fillRect(6, 4, 4, 7);
    g.fillRect(6, 13, 4, 3);
    g.generateTexture('warning', 16, 16);
    g.destroy();
  }

  private static generateBackground(scene: Phaser.Scene): void {
    // Cloud
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.CLOUD, 0.9);
    g.fillCircle(30, 25, 18);
    g.fillCircle(50, 20, 22);
    g.fillCircle(70, 25, 18);
    g.fillCircle(45, 30, 16);
    g.fillCircle(55, 30, 16);
    g.generateTexture('cloud', 100, 50);
    g.destroy();

    // Jungle tree (side decoration)
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.JUNGLE_TREE);
    g.fillRoundedRect(0, 0, 60, 100, 20);
    g.fillStyle(COLORS.JUNGLE_TREE_DARK);
    g.fillRoundedRect(5, 90, 50, 15, 8);
    // Pink dots
    g.fillStyle(COLORS.PINK_DOT);
    const dotPositions = [
      [15, 20], [40, 15], [25, 40], [45, 50], [15, 60], [35, 70], [50, 35], [10, 45],
    ];
    for (const [dx, dy] of dotPositions) {
      g.fillCircle(dx, dy, 4);
    }
    g.generateTexture('jungle-tree', 60, 105);
    g.destroy();

    // Flower
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.FLOWER);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      g.fillCircle(8 + Math.cos(angle) * 5, 8 + Math.sin(angle) * 5, 4);
    }
    g.fillStyle(0xF1C40F);
    g.fillCircle(8, 8, 3);
    g.generateTexture('flower', 16, 16);
    g.destroy();

    // Strawberry (like in reference image)
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xFF4444);
    g.fillRoundedRect(2, 4, 12, 14, 5);
    g.fillStyle(0x27AE60);
    g.fillTriangle(8, 0, 4, 6, 12, 6);
    // Seeds
    g.fillStyle(0xFFFF00);
    g.fillCircle(6, 10, 1);
    g.fillCircle(10, 10, 1);
    g.fillCircle(8, 14, 1);
    g.generateTexture('strawberry', 16, 18);
    g.destroy();
  }

  private static generateUI(scene: Phaser.Scene): void {
    // Button
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.BUTTON);
    g.fillRoundedRect(0, 0, 180, 50, 12);
    g.fillStyle(COLORS.BUTTON_HOVER, 0.3);
    g.fillRoundedRect(0, 0, 180, 25, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.generateTexture('button', 180, 50);
    g.destroy();

    // Small button
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.BUTTON);
    g.fillRoundedRect(0, 0, 120, 40, 10);
    g.generateTexture('button-small', 120, 40);
    g.destroy();

    // Character frame
    g = scene.make.graphics({ x: 0, y: 0 });
    g.lineStyle(3, 0xF1C40F);
    g.strokeRoundedRect(2, 2, 76, 76, 10);
    g.generateTexture('char-frame', 80, 80);
    g.destroy();

    // Selected character frame
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xF1C40F, 0.2);
    g.fillRoundedRect(0, 0, 80, 80, 10);
    g.lineStyle(4, 0xF1C40F);
    g.strokeRoundedRect(2, 2, 76, 76, 10);
    g.generateTexture('char-frame-selected', 80, 80);
    g.destroy();
  }

  private static generateShield(scene: Phaser.Scene): void {
    // Shield pickup
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.SHIELD, 0.6);
    g.fillCircle(12, 12, 12);
    g.lineStyle(2, COLORS.SHIELD_GLOW);
    g.strokeCircle(12, 12, 12);
    g.fillStyle(0xFFFFFF, 0.4);
    g.fillCircle(8, 8, 4);
    g.generateTexture('shield-pickup', 24, 24);
    g.destroy();

    // Shield effect (around player)
    g = scene.make.graphics({ x: 0, y: 0 });
    g.lineStyle(2, COLORS.SHIELD, 0.7);
    g.strokeCircle(20, 20, 18);
    g.lineStyle(1, COLORS.SHIELD_GLOW, 0.4);
    g.strokeCircle(20, 20, 20);
    g.generateTexture('shield-effect', 40, 40);
    g.destroy();
  }
}
