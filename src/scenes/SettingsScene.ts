import Phaser from 'phaser';
import { GAME } from '../constants';
import { SettingsManager, KeyBindings } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import { MenuNavigator } from '../systems/MenuNavigator';

interface BindingRow {
  label: Phaser.GameObjects.Text;
  valueText: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Rectangle;
  action: keyof KeyBindings;
}

interface ToggleRow {
  label: Phaser.GameObjects.Text;
  valueText: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Rectangle;
}

interface MenuButton {
  image: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  activate: () => void;
}

const ROW_DEFAULT_COLOR = 0x34495E;
const ROW_FOCUS_COLOR = 0x4A6375;
const ROW_LISTENING_COLOR = 0xE74C3C;

export class SettingsScene extends Phaser.Scene {
  private rows: BindingRow[] = [];
  private listeningRow: BindingRow | null = null;
  private fromGame = false;
  private menuNavigator: MenuNavigator | null = null;
  private mobileRow: ToggleRow | null = null;

  constructor() {
    super({ key: 'Settings' });
  }

  init(data: { fromGame?: boolean }): void {
    this.fromGame = data?.fromGame ?? false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x2C3E50);

    // Title
    this.add.text(GAME.WIDTH / 2, 40, 'SETTINGS', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
      stroke: '#1A252F',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME.WIDTH / 2, 75, 'Rebind keys and control options', {
      fontSize: '14px',
      color: '#95A5A6',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Key binding rows
    const bindings = SettingsManager.getKeys();
    const actions: { key: keyof KeyBindings; label: string }[] = [
      { key: 'left', label: 'Move Left' },
      { key: 'right', label: 'Move Right' },
      { key: 'jump', label: 'Jump' },
      { key: 'pause', label: 'Pause' },
      { key: 'altLeft', label: 'Alt Left' },
      { key: 'altRight', label: 'Alt Right' },
      { key: 'altJump', label: 'Alt Jump' },
    ];

    const startY = 120;
    const rowHeight = 44;

    for (let i = 0; i < actions.length; i++) {
      const y = startY + i * rowHeight;
      const action = actions[i];

      const bg = this.add.rectangle(GAME.WIDTH / 2, y, GAME.WIDTH - 60, 36, ROW_DEFAULT_COLOR)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(50, y, action.label, {
        fontSize: '16px',
        color: '#ECF0F1',
        fontFamily: 'Arial',
      }).setOrigin(0, 0.5);

      const valueText = this.add.text(GAME.WIDTH - 50, y, bindings[action.key], {
        fontSize: '16px',
        color: '#F1C40F',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      const row: BindingRow = { label, valueText, bg, action: action.key };
      this.rows.push(row);

      bg.on('pointerdown', () => {
        this.startListening(row);
      });

      bg.on('pointerover', () => {
        this.menuNavigator?.setIndex(i);
      });
    }

    const mobileRowY = startY + actions.length * rowHeight + 16;
    const mobileBg = this.add.rectangle(GAME.WIDTH / 2, mobileRowY, GAME.WIDTH - 60, 36, ROW_DEFAULT_COLOR)
      .setInteractive({ useHandCursor: true });

    const mobileLabel = this.add.text(50, mobileRowY, 'Touch Overlay', {
      fontSize: '16px',
      color: '#ECF0F1',
      fontFamily: 'Arial',
    }).setOrigin(0, 0.5);

    const mobileValue = this.add.text(GAME.WIDTH - 50, mobileRowY, '', {
      fontSize: '16px',
      color: '#2ECC71',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.mobileRow = {
      label: mobileLabel,
      valueText: mobileValue,
      bg: mobileBg,
    };

    mobileBg.on('pointerdown', () => {
      this.toggleMobileControls();
    });

    mobileBg.on('pointerover', () => {
      this.menuNavigator?.setIndex(actions.length);
    });

    // Gamepad and touch info
    this.add.text(GAME.WIDTH / 2, mobileRowY + 42, 'UI: Arrow keys / D-pad / Left stick + Enter or A', {
      fontSize: '12px',
      color: '#7F8C8D',
      fontFamily: 'Arial',
      wordWrap: { width: GAME.WIDTH - 60 },
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(GAME.WIDTH / 2, mobileRowY + 66, 'Gamepad in-game: D-Pad/Stick = Move, A = Jump, Start = Pause', {
      fontSize: '12px',
      color: '#7F8C8D',
      fontFamily: 'Arial',
      wordWrap: { width: GAME.WIDTH - 60 },
      align: 'center',
    }).setOrigin(0.5);

    // Reset button
    const resetY = GAME.HEIGHT - 160;
    const resetButton = this.createButton(GAME.WIDTH / 2, resetY, 'button-small', 'RESET KEYS', '14px', () => {
      AudioManager.buttonClick();
      SettingsManager.resetKeys();
      this.refreshValues();
    });

    // Back button
    const backButton = this.createButton(GAME.WIDTH / 2, GAME.HEIGHT - 100, 'button-small', 'BACK', '16px', () => {
      AudioManager.buttonClick();
      this.navigateBack();
    });

    const navItems = this.rows.map((row) => ({
      onFocus: () => this.setBindingRowFocused(row, true),
      onBlur: () => this.setBindingRowFocused(row, false),
      activate: () => this.startListening(row),
    }));

    if (this.mobileRow) {
      navItems.push({
        onFocus: () => this.setToggleRowFocused(this.mobileRow!, true),
        onBlur: () => this.setToggleRowFocused(this.mobileRow!, false),
        activate: () => this.toggleMobileControls(),
      });
    }

    navItems.push({
      onFocus: () => this.setButtonFocused(resetButton, true),
      onBlur: () => this.setButtonFocused(resetButton, false),
      activate: resetButton.activate,
    });

    navItems.push({
      onFocus: () => this.setButtonFocused(backButton, true),
      onBlur: () => this.setButtonFocused(backButton, false),
      activate: backButton.activate,
    });

    this.menuNavigator = new MenuNavigator(this, navItems, {
      onBack: () => {
        if (!this.listeningRow) {
          AudioManager.buttonClick();
          this.navigateBack();
        }
      },
    });

    resetButton.image.on('pointerover', () => {
      this.menuNavigator?.setIndex(this.rows.length + 1);
    });

    backButton.image.on('pointerover', () => {
      this.menuNavigator?.setIndex(this.rows.length + 2);
    });

    this.refreshValues();

    // Global key listener for rebinding
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (this.listeningRow) {
          event.preventDefault();
          this.captureKey(event);
        }
      });
    }
  }

  private createButton(
    x: number,
    y: number,
    texture: string,
    label: string,
    fontSize: string,
    callback: () => void
  ): MenuButton {
    const image = this.add.image(x, y, texture).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontSize,
      color: '#FFFFFF',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    image.on('pointerdown', callback);

    return {
      image,
      text,
      activate: callback,
    };
  }

  private setButtonFocused(button: MenuButton, focused: boolean): void {
    if (focused) {
      button.image.setTint(0xD8ECFF);
      button.text.setScale(1.05);
    } else {
      button.image.clearTint();
      button.text.setScale(1);
    }
  }

  private setBindingRowFocused(row: BindingRow, focused: boolean): void {
    if (this.listeningRow === row) return;
    row.bg.setFillStyle(focused ? ROW_FOCUS_COLOR : ROW_DEFAULT_COLOR);
  }

  private setToggleRowFocused(row: ToggleRow, focused: boolean): void {
    row.bg.setFillStyle(focused ? ROW_FOCUS_COLOR : ROW_DEFAULT_COLOR);
  }

  private startListening(row: BindingRow): void {
    // Reset previous
    if (this.listeningRow) {
      this.listeningRow.bg.setFillStyle(ROW_DEFAULT_COLOR);
      this.refreshValues();
    }

    this.listeningRow = row;
    row.bg.setFillStyle(ROW_LISTENING_COLOR);
    row.valueText.setText('Press a key...');
    row.valueText.setColor('#FFFFFF');
    this.menuNavigator?.setEnabled(false);
  }

  private captureKey(event: KeyboardEvent): void {
    if (!this.listeningRow) return;

    // Map the key code to a Phaser key name
    const keyName = this.getKeyName(event.code);
    if (!keyName) return;

    SettingsManager.setKey(this.listeningRow.action, keyName);
    this.listeningRow.bg.setFillStyle(ROW_DEFAULT_COLOR);
    this.listeningRow = null;
    AudioManager.buttonClick();
    this.refreshValues();
    this.menuNavigator?.setEnabled(true);
    this.menuNavigator?.refreshFocus();
  }

  private toggleMobileControls(): void {
    const next = !SettingsManager.getMobileControlsEnabled();
    SettingsManager.setMobileControlsEnabled(next);
    AudioManager.buttonClick();
    this.refreshValues();
  }

  private navigateBack(): void {
    if (this.fromGame) {
      this.scene.start('Game');
    } else {
      this.scene.start('MainMenu');
    }
  }

  private getKeyName(code: string): string | null {
    // Map browser key codes to Phaser key names
    const mapping: Record<string, string> = {
      KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D',
      KeyE: 'E', KeyF: 'F', KeyG: 'G', KeyH: 'H',
      KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L',
      KeyM: 'M', KeyN: 'N', KeyO: 'O', KeyP: 'P',
      KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T',
      KeyU: 'U', KeyV: 'V', KeyW: 'W', KeyX: 'X',
      KeyY: 'Y', KeyZ: 'Z',
      Digit0: 'ZERO', Digit1: 'ONE', Digit2: 'TWO',
      Digit3: 'THREE', Digit4: 'FOUR', Digit5: 'FIVE',
      Digit6: 'SIX', Digit7: 'SEVEN', Digit8: 'EIGHT',
      Digit9: 'NINE',
      Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC',
      ArrowUp: 'UP', ArrowDown: 'DOWN',
      ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT',
      ControlLeft: 'CTRL', ControlRight: 'CTRL',
      Tab: 'TAB', Backspace: 'BACKSPACE',
    };
    return mapping[code] ?? null;
  }

  private refreshValues(): void {
    const bindings = SettingsManager.getKeys();

    for (const row of this.rows) {
      if (row !== this.listeningRow) {
        row.valueText.setText(bindings[row.action]);
        row.valueText.setColor('#F1C40F');
      }
    }

    if (this.mobileRow) {
      const enabled = SettingsManager.getMobileControlsEnabled();
      this.mobileRow.valueText.setText(enabled ? 'ON' : 'OFF');
      this.mobileRow.valueText.setColor(enabled ? '#2ECC71' : '#E74C3C');
    }
  }
}
