import Phaser from 'phaser';
import { SettingsManager } from './SettingsManager';

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustDown: boolean;
  pause: boolean;
}

interface TouchButton {
  visual: Phaser.GameObjects.Container;
  hitArea: Phaser.GameObjects.Zone;
}

export class InputManager {
  private scene: Phaser.Scene;
  private keys: Map<string, Phaser.Input.Keyboard.Key> = new Map();
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevJump = false;

  // Touch controls
  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private touchJumpJustDown = false;
  private isTouchDevice = false;

  // Touch UI elements
  private leftBtn: TouchButton | null = null;
  private rightBtn: TouchButton | null = null;
  private jumpBtn: TouchButton | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.isTouchDevice = !!(scene.sys.game.device.input.touch);
    this.setupKeyboard();
    this.setupGamepad();
    if (this.isTouchDevice && SettingsManager.getMobileControlsEnabled()) {
      this.setupTouchControls();
    }
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  private setupKeyboard(): void {
    if (!this.scene.input.keyboard) return;
    const bindings = SettingsManager.getKeys();
    const allKeys = [
      bindings.left, bindings.right, bindings.jump, bindings.pause,
      bindings.altLeft, bindings.altRight, bindings.altJump,
    ];

    for (const keyName of allKeys) {
      if (!this.keys.has(keyName)) {
        const keyCode = Phaser.Input.Keyboard.KeyCodes[keyName as keyof typeof Phaser.Input.Keyboard.KeyCodes];
        if (keyCode !== undefined) {
          const key = this.scene.input.keyboard.addKey(keyCode, true, false);
          this.keys.set(keyName, key);
        }
      }
    }
  }

  private setupGamepad(): void {
    if (!this.scene.input.gamepad) return;
    this.scene.input.gamepad.once('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepad = pad;
    });
    if (this.scene.input.gamepad.total > 0) {
      this.gamepad = this.scene.input.gamepad.getPad(0);
    }
  }

  private setupTouchControls(): void {
    const btnSize = 60;
    this.leftBtn = this.createTouchButton(
      btnSize, '<',
      () => { this.touchLeft = true; },
      () => { this.touchLeft = false; }
    );

    this.rightBtn = this.createTouchButton(
      btnSize, '>',
      () => { this.touchRight = true; },
      () => { this.touchRight = false; }
    );

    this.jumpBtn = this.createTouchButton(
      btnSize * 1.2, 'JUMP',
      () => { this.touchJump = true; this.touchJumpJustDown = true; },
      () => { this.touchJump = false; }
    );

    this.layoutTouchControls();
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layoutTouchControls, this);
  }

  private createTouchButton(
    size: number, label: string,
    onDown: () => void, onUp: () => void
  ): TouchButton {
    const bg = this.scene.add.circle(0, 0, size / 2, 0x000000, 0.3);
    const text = this.scene.add.text(0, 0, label, {
      fontSize: size < 70 ? '20px' : '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    const visual = this.scene.add.container(0, 0, [bg, text]);
    visual.setScrollFactor(0);
    visual.setDepth(1000);

    // Keep the hit area in screen-space so taps stay aligned with the visuals.
    const hitArea = this.scene.add.zone(0, 0, size, size);
    hitArea.setOrigin(0.5);
    hitArea.setScrollFactor(0);
    hitArea.setDepth(1001);
    hitArea.setInteractive({ useHandCursor: false })
      .on('pointerdown', onDown)
      .on('pointerup', onUp)
      .on('pointerout', onUp);

    return { visual, hitArea };
  }

  private layoutTouchControls(): void {
    const cam = this.scene.cameras.main;
    const btnSize = 60;
    const margin = 20;
    const bottomY = cam.height - margin - btnSize / 2;

    this.positionTouchButton(this.leftBtn, margin + btnSize / 2, bottomY);
    this.positionTouchButton(this.rightBtn, margin + btnSize + 10 + btnSize / 2, bottomY);
    this.positionTouchButton(this.jumpBtn, cam.width - margin - (btnSize * 1.2) / 2, bottomY);
  }

  private positionTouchButton(button: TouchButton | null, x: number, y: number): void {
    if (!button) return;
    button.visual.setPosition(x, y);
    button.hitArea.setPosition(x, y);
  }

  private isKeyDown(keyName: string): boolean {
    const key = this.keys.get(keyName);
    return key ? key.isDown : false;
  }

  getState(): InputState {
    const bindings = SettingsManager.getKeys();

    // Keyboard input
    const kbLeft = this.isKeyDown(bindings.left) || this.isKeyDown(bindings.altLeft);
    const kbRight = this.isKeyDown(bindings.right) || this.isKeyDown(bindings.altRight);
    const kbJump = this.isKeyDown(bindings.jump) || this.isKeyDown(bindings.altJump);
    const kbPause = this.isKeyDown(bindings.pause);

    // Gamepad input
    let gpLeft = false, gpRight = false, gpJump = false, gpPause = false;
    if (this.gamepad) {
      const lx = this.gamepad.leftStick?.x ?? 0;
      gpLeft = this.gamepad.left || lx < -0.3;
      gpRight = this.gamepad.right || lx > 0.3;
      gpJump = this.gamepad.A;
      gpPause = (this.gamepad.buttons[9]?.pressed ?? false); // Start button
    }

    const jump = kbJump || gpJump || this.touchJump;
    const jumpJustDown = jump && !this.prevJump || this.touchJumpJustDown;

    this.prevJump = jump;
    this.touchJumpJustDown = false;

    return {
      left: kbLeft || gpLeft || this.touchLeft,
      right: kbRight || gpRight || this.touchRight,
      jump,
      jumpJustDown,
      pause: kbPause || gpPause,
    };
  }

  refreshKeys(): void {
    if (!this.scene.input.keyboard) return;
    this.keys.clear();
    this.setupKeyboard();
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layoutTouchControls, this);
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJump = false;
    this.touchJumpJustDown = false;
    this.keys.clear();
    this.destroyTouchButton(this.leftBtn);
    this.destroyTouchButton(this.rightBtn);
    this.destroyTouchButton(this.jumpBtn);
    this.leftBtn = null;
    this.rightBtn = null;
    this.jumpBtn = null;
  }

  private destroyTouchButton(button: TouchButton | null): void {
    if (!button) return;
    button.hitArea.destroy();
    button.visual.destroy();
  }
}
