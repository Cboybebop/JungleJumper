import Phaser from 'phaser';
import { SceneTransition } from '../ui/SceneTransition';
import { GAME } from '../constants';
import { SettingsManager, type KeyBindings } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import { MenuNavigator } from '../systems/MenuNavigator';
import { UIFactory, type UIButton, type UIRow } from '../ui/UIFactory';

interface BindingRow extends UIRow {
  action: keyof KeyBindings;
}

export class SettingsScene extends Phaser.Scene {
  private rows: BindingRow[] = [];
  private listeningRow: BindingRow | null = null;
  private fromGame = false;
  private menuNavigator: MenuNavigator | null = null;
  private motionRow: UIRow | null = null;
  private mobileRow: UIRow | null = null;
  private displayModeRow: UIRow | null = null;
  private keyListener: ((event: KeyboardEvent) => void) | null = null;

  constructor() {
    super({ key: 'Settings' });
  }

  init(data: { fromGame?: boolean }): void {
    this.fromGame = data?.fromGame ?? false;
  }

  create(): void {
    SceneTransition.install(this);
    const ui = new UIFactory(this);
    const compact = GAME.HEIGHT < 740;
    const rowWidth = Math.min(560, GAME.WIDTH - 32);
    const rowHeight = compact ? 26 : 36;
    const visualHeight = compact ? 24 : 32;
    const startY = compact ? 76 : 120;
    const fontSize = compact ? 10 : 13;

    this.rows = [];
    this.listeningRow = null;
    this.cameras.main.setBackgroundColor(0x1A1A2E);

    ui.text(GAME.WIDTH / 2, compact ? 24 : 40, 'SETTINGS', {
      fontSize: compact ? '22px' : '30px', fontStyle: 'bold',
      stroke: '#211936', strokeThickness: 4,
    }).setOrigin(0.5);
    ui.text(GAME.WIDTH / 2, compact ? 50 : 75, 'CONTROLS & DISPLAY', {
      fontSize: compact ? '9px' : '11px', color: '#AAB4C8',
    }).setOrigin(0.5);

    const bindings = SettingsManager.getKeys();
    const actions: { key: keyof KeyBindings; label: string }[] = [
      { key: 'left', label: 'MOVE LEFT' },
      { key: 'right', label: 'MOVE RIGHT' },
      { key: 'jump', label: 'JUMP' },
      { key: 'pause', label: 'PAUSE' },
      { key: 'altLeft', label: 'ALT LEFT' },
      { key: 'altRight', label: 'ALT RIGHT' },
      { key: 'altJump', label: 'ALT JUMP' },
    ];

    actions.forEach((action, index) => {
      let row!: BindingRow;
      const base = ui.row(GAME.WIDTH / 2, startY + index * rowHeight, action.label, {
        width: rowWidth, height: visualHeight, fontSize, value: bindings[action.key],
        onActivate: () => this.startListening(row),
      });
      row = Object.assign(base, { action: action.key });
      row.panel.on('pointerover', () => this.menuNavigator?.setIndex(index));
      this.rows.push(row);
    });

    const mobileY = startY + actions.length * rowHeight + (compact ? 5 : 16);
    this.mobileRow = ui.row(GAME.WIDTH / 2, mobileY, 'TOUCH OVERLAY', {
      width: rowWidth, height: visualHeight, fontSize, value: '',
      onActivate: () => this.toggleMobileControls(),
    });
    this.mobileRow.panel.on('pointerover', () => this.menuNavigator?.setIndex(this.rows.length));

    this.motionRow = ui.row(GAME.WIDTH / 2, mobileY + rowHeight, 'REDUCED MOTION', {
      width: rowWidth, height: visualHeight, fontSize, value: '',
      onActivate: () => {
        SettingsManager.setReducedMotion(!SettingsManager.getReducedMotion());
        this.refreshValues();
      },
    });
    this.motionRow.panel.on('pointerover', () => this.menuNavigator?.setIndex(this.rows.length + 1));
    const displayY = mobileY + rowHeight * 2;
    this.displayModeRow = ui.row(GAME.WIDTH / 2, displayY, 'DISPLAY MODE', {
      width: rowWidth, height: visualHeight, fontSize, value: '',
    });
    this.displayModeRow.container.setAlpha(0.8);

    ui.text(GAME.WIDTH / 2, displayY + (compact ? 25 : 30), `VIEWPORT ${SettingsManager.getResolutionLabel()}`, {
      fontSize: compact ? '8px' : '10px', color: '#87CEEB',
    }).setOrigin(0.5);
    ui.text(GAME.WIDTH / 2, displayY + (compact ? 43 : 58), compact
      ? 'ARROWS / D-PAD   ENTER / A'
      : 'ARROWS / D-PAD / STICK     ENTER / A TO SELECT', {
      fontSize: compact ? '8px' : '10px', color: '#AAB4C8', align: 'center',
      wordWrap: { width: rowWidth },
    }).setOrigin(0.5);

    const resetButton = ui.button(GAME.WIDTH / 2, GAME.HEIGHT - (compact ? 88 : 160), 'RESET KEYS', {
      size: 'small', fontSize: compact ? 10 : 12,
      onActivate: () => { SettingsManager.resetKeys(); this.refreshValues(); },
    });
    const backButton = ui.button(GAME.WIDTH / 2, GAME.HEIGHT - (compact ? 40 : 100), 'BACK', {
      size: 'small', fontSize: compact ? 11 : 13,
      onActivate: () => this.navigateBack(),
    });

    const navItems = this.rows.map((row) => ({
      onFocus: () => row.setFocused(true), onBlur: () => row.setFocused(false), activate: row.activate,
    }));
    navItems.push({
      onFocus: () => this.mobileRow?.setFocused(true),
      onBlur: () => this.mobileRow?.setFocused(false),
      activate: () => this.mobileRow?.activate(),
    });
    navItems.push({
      onFocus: () => this.motionRow?.setFocused(true),
      onBlur: () => this.motionRow?.setFocused(false),
      activate: () => this.motionRow?.activate(),
    });
    navItems.push(this.buttonNav(resetButton), this.buttonNav(backButton));

    this.menuNavigator = new MenuNavigator(this, navItems, {
      onBack: () => {
        if (!this.listeningRow) { AudioManager.buttonClick(); this.navigateBack(); }
      },
    });
    resetButton.image.on('pointerover', () => this.menuNavigator?.setIndex(this.rows.length + 2));
    backButton.image.on('pointerover', () => this.menuNavigator?.setIndex(this.rows.length + 3));

    this.refreshValues();
    this.keyListener = (event) => {
      if (!this.listeningRow || SceneTransition.isBusy(this)) return;
      event.preventDefault();
      this.captureKey(event);
    };
    this.input.keyboard?.on('keydown', this.keyListener);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  private buttonNav(button: UIButton) {
    return {
      onFocus: () => button.setFocused(true),
      onBlur: () => button.setFocused(false),
      activate: button.activate,
    };
  }

  private startListening(row: BindingRow): void {
    this.listeningRow?.setActive(false);
    this.listeningRow = row;
    row.setActive(true);
    row.setValue('PRESS A KEY', '#FFFFFF');
    this.menuNavigator?.setEnabled(false);
  }

  private captureKey(event: KeyboardEvent): void {
    if (!this.listeningRow || SceneTransition.isBusy(this)) return;
    const keyName = this.getKeyName(event.code);
    if (!keyName) return;
    SettingsManager.setKey(this.listeningRow.action, keyName);
    this.listeningRow.setActive(false);
    this.listeningRow = null;
    AudioManager.buttonClick();
    this.refreshValues();
    this.menuNavigator?.setEnabled(true);
    this.menuNavigator?.refreshFocus();
  }

  private toggleMobileControls(): void {
    SettingsManager.setMobileControlsEnabled(!SettingsManager.getMobileControlsEnabled());
    this.refreshValues();
  }

  private refreshValues(): void {
    const bindings = SettingsManager.getKeys();
    for (const row of this.rows) {
      if (row !== this.listeningRow) row.setValue(bindings[row.action], '#FFE6A3');
    }
    this.motionRow?.setValue(SettingsManager.getReducedMotion() ? 'ON' : 'OFF', '#87CEEB');
    const enabled = SettingsManager.getMobileControlsEnabled();
    this.mobileRow?.setValue(enabled ? 'ON' : 'OFF', enabled ? '#2ECC71' : '#FF6B6B');
    this.displayModeRow?.setValue(SettingsManager.getDisplayModeLabel(), '#87CEEB');
  }

  private navigateBack(): void {
    SceneTransition.start(this, this.fromGame ? 'Game' : 'MainMenu', {}, 'palette');
  }

  private getKeyName(code: string): string | null {
    const letters = /^Key([A-Z])$/.exec(code);
    if (letters) return letters[1];
    const digits = /^Digit([0-9])$/.exec(code);
    const digitNames = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    if (digits) return digitNames[Number(digits[1])];
    const mapping: Record<string, string> = {
      Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', ArrowUp: 'UP', ArrowDown: 'DOWN',
      ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT',
      ControlLeft: 'CTRL', ControlRight: 'CTRL', Tab: 'TAB', Backspace: 'BACKSPACE',
    };
    return mapping[code] ?? null;
  }

  private cleanup(): void {
    if (this.keyListener) this.input.keyboard?.off('keydown', this.keyListener);
    this.keyListener = null;
    this.menuNavigator?.destroy();
    this.menuNavigator = null;
  }
}
