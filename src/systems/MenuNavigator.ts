import Phaser from 'phaser';

export interface MenuNavItem {
  activate: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

export interface MenuNavigatorOptions {
  startIndex?: number;
  onBack?: () => void;
}

export class MenuNavigator {
  private scene: Phaser.Scene;
  private items: MenuNavItem[];
  private onBack?: () => void;
  private selectedIndex = 0;
  private hasFocus = false;
  private enabled = true;
  private destroyed = false;

  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevPadUp = false;
  private prevPadDown = false;
  private prevPadLeft = false;
  private prevPadRight = false;
  private prevPadConfirm = false;
  private prevPadBack = false;

  private upKey?: Phaser.Input.Keyboard.Key;
  private wKey?: Phaser.Input.Keyboard.Key;
  private downKey?: Phaser.Input.Keyboard.Key;
  private sKey?: Phaser.Input.Keyboard.Key;
  private leftKey?: Phaser.Input.Keyboard.Key;
  private aKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;
  private dKey?: Phaser.Input.Keyboard.Key;
  private tabKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private backspaceKey?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, items: MenuNavItem[], options: MenuNavigatorOptions = {}) {
    this.scene = scene;
    this.items = items;
    this.onBack = options.onBack;

    this.setupKeyboard();
    this.setupGamepad();

    const startIndex = options.startIndex ?? 0;
    if (this.items.length > 0) {
      this.setIndex(startIndex);
    }

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  setIndex(index: number): void {
    if (this.items.length === 0) return;

    const normalized = this.normalizeIndex(index);
    if (this.hasFocus && normalized === this.selectedIndex) {
      if (this.enabled) {
        this.items[this.selectedIndex].onFocus();
      }
      return;
    }

    if (this.hasFocus && this.selectedIndex < this.items.length) {
      this.items[this.selectedIndex].onBlur();
    }

    this.selectedIndex = normalized;
    this.hasFocus = true;

    if (this.enabled) {
      this.items[this.selectedIndex].onFocus();
    }
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;

    this.enabled = enabled;

    if (!this.enabled && this.hasFocus && this.selectedIndex < this.items.length) {
      this.items[this.selectedIndex].onBlur();
      this.resetGamepadState();
      return;
    }

    this.refreshFocus();
  }

  refreshFocus(): void {
    if (!this.enabled || !this.hasFocus || this.items.length === 0) return;
    this.items[this.selectedIndex].onFocus();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.destroy, this);

    if (this.hasFocus && this.selectedIndex < this.items.length) {
      this.items[this.selectedIndex].onBlur();
    }

    this.items = [];
    this.gamepad = null;
    this.resetGamepadState();
  }

  private setupKeyboard(): void {
    if (!this.scene.input.keyboard) return;

    const kb = this.scene.input.keyboard;
    this.upKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP, true, false);
    this.wKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W, true, false);
    this.downKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, true, false);
    this.sKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S, true, false);
    this.leftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, true, false);
    this.aKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A, true, false);
    this.rightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, true, false);
    this.dKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D, true, false);
    this.tabKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TAB, true, false);
    this.enterKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER, true, false);
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, true, false);
    this.escapeKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, true, false);
    this.backspaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE, true, false);
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

  private update(): void {
    if (!this.enabled || this.items.length === 0) return;

    this.handleKeyboard();
    this.handleGamepad();
  }

  private handleKeyboard(): void {
    const backward = this.wasJustPressed(this.upKey) || this.wasJustPressed(this.wKey) || this.wasJustPressed(this.leftKey) || this.wasJustPressed(this.aKey);
    const forward = this.wasJustPressed(this.downKey) || this.wasJustPressed(this.sKey) || this.wasJustPressed(this.rightKey) || this.wasJustPressed(this.dKey) || this.wasJustPressed(this.tabKey);

    if (backward) {
      this.move(-1);
    } else if (forward) {
      this.move(1);
    }

    if (this.wasJustPressed(this.enterKey) || this.wasJustPressed(this.spaceKey)) {
      this.activateCurrent();
    }

    if (this.onBack && (this.wasJustPressed(this.escapeKey) || this.wasJustPressed(this.backspaceKey))) {
      this.onBack();
    }
  }

  private handleGamepad(): void {
    const pad = this.getActiveGamepad();
    if (!pad) {
      this.resetGamepadState();
      return;
    }

    const lx = pad.leftStick?.x ?? 0;
    const ly = pad.leftStick?.y ?? 0;
    const up = pad.up || ly < -0.5;
    const down = pad.down || ly > 0.5;
    const left = pad.left || lx < -0.5;
    const right = pad.right || lx > 0.5;
    const confirm = pad.A || (pad.buttons[0]?.pressed ?? false);
    const back = pad.B || (pad.buttons[1]?.pressed ?? false);

    const backward = up || left;
    const forward = down || right;
    const prevBackward = this.prevPadUp || this.prevPadLeft;
    const prevForward = this.prevPadDown || this.prevPadRight;

    if (backward && !prevBackward) {
      this.move(-1);
    } else if (forward && !prevForward) {
      this.move(1);
    }

    if (confirm && !this.prevPadConfirm) {
      this.activateCurrent();
    }

    if (this.onBack && back && !this.prevPadBack) {
      this.onBack();
    }

    this.prevPadUp = up;
    this.prevPadDown = down;
    this.prevPadLeft = left;
    this.prevPadRight = right;
    this.prevPadConfirm = confirm;
    this.prevPadBack = back;
  }

  private getActiveGamepad(): Phaser.Input.Gamepad.Gamepad | null {
    if (this.gamepad?.connected) {
      return this.gamepad;
    }

    if (!this.scene.input.gamepad || this.scene.input.gamepad.total === 0) {
      return null;
    }

    this.gamepad = this.scene.input.gamepad.getPad(0);
    return this.gamepad;
  }

  private resetGamepadState(): void {
    this.prevPadUp = false;
    this.prevPadDown = false;
    this.prevPadLeft = false;
    this.prevPadRight = false;
    this.prevPadConfirm = false;
    this.prevPadBack = false;
  }

  private wasJustPressed(key?: Phaser.Input.Keyboard.Key): boolean {
    return !!key && Phaser.Input.Keyboard.JustDown(key);
  }

  private move(delta: number): void {
    if (this.items.length === 0) return;
    this.setIndex(this.selectedIndex + delta);
  }

  private activateCurrent(): void {
    if (!this.hasFocus || this.selectedIndex >= this.items.length) return;
    this.items[this.selectedIndex].activate();
  }

  private normalizeIndex(index: number): number {
    const total = this.items.length;
    return ((index % total) + total) % total;
  }
}
