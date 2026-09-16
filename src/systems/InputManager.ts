import Phaser from 'phaser';
import { SettingsManager } from './SettingsManager';
import { getSafeArea } from '../ui/SafeArea';

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustDown: boolean;
  pause: boolean;
}

interface TouchButton {
  visual: Phaser.GameObjects.Image;
  hitArea: Phaser.GameObjects.Zone;
  size: number;
}

export class InputManager {
  private scene: Phaser.Scene;
  private keys: Map<string, Phaser.Input.Keyboard.Key> = new Map();
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevJump = false;
  private prevPause = false;
  private enabled = true;
  private actionsArmed = false;
  private touchReleases: ((id?: number) => void)[] = [];

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
    this.scene.input.on('pointerup', this.releasePointer, this);
    this.scene.input.on('pointerupoutside', this.releasePointer, this);
    this.scene.game.events.on(Phaser.Core.Events.BLUR, this.resetInput, this);
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
    this.scene.input.gamepad.on('connected', this.connectGamepad, this);
    if (this.scene.input.gamepad.total > 0) {
      this.gamepad = this.scene.input.gamepad.getPad(0);
    }
  }

  private setupTouchControls(): void {
    const btnSize = 64;
    this.leftBtn = this.createTouchButton(
      btnSize, 'left',
      () => { this.touchLeft = true; },
      () => { this.touchLeft = false; }
    );

    this.rightBtn = this.createTouchButton(
      btnSize, 'right',
      () => { this.touchRight = true; },
      () => { this.touchRight = false; }
    );

    this.jumpBtn = this.createTouchButton(
      btnSize, 'jump',
      () => { this.touchJump = true; this.touchJumpJustDown = true; },
      () => { this.touchJump = false; }
    );

    this.layoutTouchControls();
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layoutTouchControls, this);
  }

  private createTouchButton(
    size: number, kind: 'left' | 'right' | 'jump',
    onDown: () => void, onUp: () => void
  ): TouchButton {
    const visual = this.scene.add.image(0, 0, `ui-touch-${kind}-normal`);
    visual.setScrollFactor(0);
    visual.setDepth(1000);

    // Keep the hit area in screen-space so taps stay aligned with the visuals.
    const hitArea = this.scene.add.zone(0, 0, size, size);
    hitArea.setOrigin(0.5);
    hitArea.setScrollFactor(0);
    hitArea.setDepth(1001);
    const pointers = new Set<number>();
    const release = (id?: number) => {
      if (id === undefined) pointers.clear(); else pointers.delete(id);
      if (pointers.size === 0 && visual.scene) { visual.setTexture(`ui-touch-${kind}-normal`); onUp(); }
    };
    this.touchReleases.push(release);
    hitArea.setInteractive({ useHandCursor: false })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.enabled) return;
        pointers.add(pointer.id); visual.setTexture(`ui-touch-${kind}-pressed`); onDown();
      })
      .on('pointerup', (pointer: Phaser.Input.Pointer) => release(pointer.id))
      .on('pointerout', (pointer: Phaser.Input.Pointer) => release(pointer.id));

    return { visual, hitArea, size };
  }

  private layoutTouchControls(): void {
    const cam = this.scene.cameras.main;
    const safe = getSafeArea(this.scene, 16);
    // Hit targets stay at least 44 CSS pixels while the artwork remains native size.
    const cssScale = this.scene.scale.canvasBounds.width / this.scene.scale.width;
    const btnSize = Math.max(64, Math.ceil(44 / Math.max(0.1, cssScale)));
    for (const button of [this.leftBtn, this.rightBtn, this.jumpBtn]) if (button) {
      button.size = btnSize;
      button.hitArea.setSize(btnSize, btnSize);
      if (button.hitArea.input) button.hitArea.input.hitArea.setTo(0, 0, btnSize, btnSize);
    }
    const gap = 10;
    const bottomY = cam.height - safe.bottom - btnSize / 2;

    this.positionTouchButton(this.leftBtn, safe.left + btnSize / 2, bottomY);
    this.positionTouchButton(this.rightBtn, safe.left + btnSize * 1.5 + gap, bottomY);
    this.positionTouchButton(this.jumpBtn, cam.width - safe.right - btnSize / 2, bottomY);
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
    if (!this.enabled) return { left: false, right: false, jump: false, jumpJustDown: false, pause: false };
    const bindings = SettingsManager.getKeys();

    // Keyboard input
    const kbLeft = this.isKeyDown(bindings.left) || this.isKeyDown(bindings.altLeft);
    const kbRight = this.isKeyDown(bindings.right) || this.isKeyDown(bindings.altRight);
    const kbJump = this.isKeyDown(bindings.jump) || this.isKeyDown(bindings.altJump);
    const kbPause = this.isKeyDown(bindings.pause);

    // Gamepad input
    let gpLeft = false, gpRight = false, gpJump = false, gpPause = false;
    if (!this.gamepad?.connected) this.gamepad = this.scene.input.gamepad?.getPad(0) ?? null;
    if (this.gamepad?.connected) {
      const lx = this.gamepad.leftStick?.x ?? 0;
      gpLeft = this.gamepad.left || lx < -0.3;
      gpRight = this.gamepad.right || lx > 0.3;
      gpJump = this.gamepad.A;
      gpPause = (this.gamepad.buttons[9]?.pressed ?? false); // Start button
    }

    const jump = kbJump || gpJump || this.touchJump;
    const pause = kbPause || gpPause;
    if (!this.actionsArmed && !jump && !pause) this.actionsArmed = true;
    const jumpJustDown = this.actionsArmed && ((jump && !this.prevJump) || this.touchJumpJustDown);
    const pauseJustDown = this.actionsArmed && pause && !this.prevPause;

    this.prevJump = jump;
    this.prevPause = pause;
    this.touchJumpJustDown = false;

    return {
      left: kbLeft || gpLeft || this.touchLeft,
      right: kbRight || gpRight || this.touchRight,
      jump,
      jumpJustDown,
      pause: pauseJustDown,
    };
  }

  refreshKeys(): void {
    if (!this.scene.input.keyboard) return;
    this.keys.clear();
    this.setupKeyboard();
  }

  destroy(): void {
    this.scene.input.off('pointerup', this.releasePointer, this);
    this.scene.input.off('pointerupoutside', this.releasePointer, this);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.resetInput, this);
    this.scene.input.gamepad?.off('connected', this.connectGamepad, this);
    this.resetInput();
    this.touchReleases = [];
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

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.resetInput();
    for (const button of [this.leftBtn, this.rightBtn, this.jumpBtn]) {
      if (button?.hitArea.input) button.hitArea.input.enabled = enabled;
      button?.visual.setVisible(enabled);
    }
  }

  private connectGamepad(pad: Phaser.Input.Gamepad.Gamepad): void {
    this.gamepad = pad;
    this.actionsArmed = false;
  }

  private releasePointer(pointer: Phaser.Input.Pointer): void {
    this.touchReleases.forEach(release => release(pointer.id));
  }

  private resetInput(): void {
    this.touchReleases.forEach(release => release());
    this.prevJump = false; this.prevPause = false; this.actionsArmed = false;
    this.touchJumpJustDown = false;
  }
}
