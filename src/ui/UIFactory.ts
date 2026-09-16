import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

export const UI_FONT = 'Silkscreen';

export const UI_ASSETS = [
  'badge-bronze', 'badge-gold', 'badge-silver',
  'button-large-focused', 'button-large-normal', 'button-large-pressed',
  'button-small-focused', 'button-small-normal', 'button-small-pressed',
  'gamepad-a-focused', 'gamepad-a-normal', 'gamepad-b-focused', 'gamepad-b-normal',
  'gamepad-dpad-focused', 'gamepad-dpad-normal', 'height-marker',
  'keycap-focused', 'keycap-normal', 'modal-nine-slice', 'panel-nine-slice',
  'pause-focused', 'pause-normal', 'pause-pressed', 'score-plaque',
  'selection-frame-focused', 'selection-frame-normal', 'selection-frame-selected',
  'slider-knob', 'slider-track', 'status-check', 'status-shield', 'status-warning',
  'tab-focused', 'tab-normal', 'tab-pressed', 'toggle-off-focused', 'toggle-off',
  'toggle-on-focused', 'toggle-on', 'touch-jump-normal', 'touch-jump-pressed',
  'touch-left-normal', 'touch-left-pressed', 'touch-right-normal', 'touch-right-pressed',
] as const;

export interface UIButton {
  container: Phaser.GameObjects.Container;
  image: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  activate: () => void;
  setFocused: (focused: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setDepth: (depth: number) => UIButton;
}

export interface UIRow {
  container: Phaser.GameObjects.Container;
  panel: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  valueText: Phaser.GameObjects.Text;
  activate: () => void;
  setFocused: (focused: boolean) => void;
  setActive: (active: boolean) => void;
  setValue: (value: string, color?: string) => void;
}

export interface ButtonOptions {
  size?: 'large' | 'small';
  fontSize?: number;
  depth?: number;
  onActivate: () => void;
}

export interface RowOptions {
  width: number;
  height?: number;
  fontSize?: number;
  value: string;
  onActivate?: () => void;
}

export class UIFactory {
  private static textureId = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  static preload(scene: Phaser.Scene): void {
    for (const key of UI_ASSETS) {
      scene.load.image(`ui-${key}`, `assets/ui/${key}.png`);
    }
  }

  text(x: number, y: number, value: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, value, {
      fontFamily: UI_FONT,
      color: '#FFFFFF',
      resolution: 1,
      ...style,
    });
  }

  panel(x: number, y: number, width: number, height: number, modal = false): Phaser.GameObjects.Image {
    const sourceKey = modal ? 'ui-modal-nine-slice' : 'ui-panel-nine-slice';
    const slice = modal ? 12 : 8;
    const key = this.bakeNineSlice(sourceKey, width, height, slice);
    const image = this.scene.add.image(x, y, key);
    image.once(Phaser.GameObjects.Events.DESTROY, () => this.scene.textures.remove(key));
    return image;
  }

  button(x: number, y: number, label: string, options: ButtonOptions): UIButton {
    const size = options.size ?? 'large';
    const texture = (state: 'normal' | 'focused' | 'pressed') => `ui-button-${size}-${state}`;
    const image = this.scene.add.image(0, 0, texture('normal')).setInteractive({ useHandCursor: true });
    const text = this.text(0, 0, label, {
      fontSize: `${options.fontSize ?? (size === 'large' ? 18 : 14)}px`,
      align: 'center',
    }).setOrigin(0.5);
    const container = this.scene.add.container(x, y, [image, text]);
    if (options.depth !== undefined) container.setDepth(options.depth);

    let focused = false;
    let pressed = false;
    let enabled = true;

    const render = () => {
      if (!image.scene || !container.scene) return;
      const state = pressed ? 'pressed' : focused ? 'focused' : 'normal';
      image.setTexture(texture(state));
      container.setScale(pressed ? 0.98 : focused ? 1.035 : 1);
      container.setY(y + (pressed ? 2 : 0));
      container.setAlpha(enabled ? 1 : 0.5);
    };

    const activate = () => {
      if (!enabled) return;
      AudioManager.buttonClick();
      options.onActivate();
    };

    image.on('pointerdown', () => {
      if (!enabled) return;
      pressed = true;
      render();
    });
    image.on('pointerup', () => {
      if (!enabled || !pressed) return;
      pressed = false;
      render();
      activate();
    });
    image.on('pointerout', () => {
      pressed = false;
      render();
    });

    const button: UIButton = {
      container,
      image,
      text,
      activate,
      setFocused: (next) => {
        if (focused === next) return;
        focused = next;
        if (focused) AudioManager.buttonFocus();
        render();
      },
      setEnabled: (next) => {
        enabled = next;
        if (!enabled) pressed = false;
        render();
      },
      setDepth: (depth) => {
        container.setDepth(depth);
        return button;
      },
    };
    return button;
  }

  row(x: number, y: number, labelValue: string, options: RowOptions): UIRow {
    const height = options.height ?? 36;
    const panelKeys = {
      normal: this.bakeNineSlice('ui-panel-nine-slice', options.width, height, 8),
      focused: this.bakeNineSlice('ui-tab-focused', options.width, height, 8),
      active: this.bakeNineSlice('ui-tab-pressed', options.width, height, 8),
    };
    const panel = this.scene.add.image(0, 0, panelKeys.normal);
    const fontSize = options.fontSize ?? 13;
    const label = this.text(-options.width / 2 + 16, 0, labelValue, { fontSize: `${fontSize}px` }).setOrigin(0, 0.5);
    const valueText = this.text(options.width / 2 - 16, 0, options.value, {
      fontSize: `${fontSize}px`, color: '#FFE6A3', align: 'right',
    }).setOrigin(1, 0.5);
    const container = this.scene.add.container(x, y, [panel, label, valueText]);
    let focused = false;
    let active = false;

    if (options.onActivate) {
      panel.setInteractive({ useHandCursor: true });
    }

    const render = () => {
      if (!panel.scene || !container.scene) return;
      panel.setTexture(active ? panelKeys.active : focused ? panelKeys.focused : panelKeys.normal);
      container.setScale(focused && !active ? 1.01 : 1);
    };
    const activate = () => {
      if (!options.onActivate) return;
      AudioManager.buttonClick();
      options.onActivate();
    };
    panel.on('pointerdown', activate);

    container.once(Phaser.GameObjects.Events.DESTROY, () => {
      Object.values(panelKeys).forEach((key) => this.scene.textures.remove(key));
    });

    return {
      container, panel, label, valueText, activate,
      setFocused: (next) => {
        if (focused === next) return;
        focused = next;
        if (focused) AudioManager.buttonFocus();
        render();
      },
      setActive: (next) => { active = next; render(); },
      setValue: (value, color) => {
        valueText.setText(value);
        if (color) valueText.setColor(color);
      },
    };
  }

  selectionFrame(x: number, y: number): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, 'ui-selection-frame-normal');
  }

  scorePlaque(x: number, y: number): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, 'ui-score-plaque');
  }

  pauseButton(x: number, y: number, onActivate: () => void): UIButton {
    const image = this.scene.add.image(0, 0, 'ui-pause-normal').setInteractive({ useHandCursor: true });
    const text = this.text(0, 0, '', { fontSize: '1px' }).setOrigin(0.5);
    const container = this.scene.add.container(x, y, [image, text]);
    let focused = false;
    let pressed = false;
    let enabled = true;
    const render = () => {
      if (!image.scene || !container.scene) return;
      image.setTexture(`ui-pause-${pressed ? 'pressed' : focused ? 'focused' : 'normal'}`);
      container.setScale(pressed ? 0.96 : focused ? 1.06 : 1);
    };
    const activate = () => {
      if (!enabled) return;
      AudioManager.buttonClick();
      onActivate();
    };
    image.on('pointerover', () => { focused = true; render(); });
    image.on('pointerout', () => { focused = false; pressed = false; render(); });
    image.on('pointerdown', () => { pressed = true; render(); });
    image.on('pointerup', () => { if (!pressed) return; pressed = false; render(); activate(); });
    const button: UIButton = {
      container, image, text, activate,
      setFocused: (next) => { focused = next; render(); },
      setEnabled: (next) => { enabled = next; if (!enabled) pressed = false; render(); },
      setDepth: (depth) => { container.setDepth(depth); return button; },
    };
    return button;
  }

  private bakeNineSlice(sourceKey: string, width: number, height: number, slice: number): string {
    const key = `ui-baked-${UIFactory.textureId++}`;
    const texture = this.scene.textures.get(sourceKey);
    const source = texture.getSourceImage() as CanvasImageSource;
    const sourceWidth = texture.getSourceImage().width;
    const sourceHeight = texture.getSourceImage().height;
    const canvasTexture = this.scene.textures.createCanvas(key, width, height);
    if (!canvasTexture) return sourceKey;

    const context = canvasTexture.context;
    context.imageSmoothingEnabled = false;
    const sourceX = [0, slice, sourceWidth - slice];
    const sourceY = [0, slice, sourceHeight - slice];
    const sourceWidths = [slice, sourceWidth - slice * 2, slice];
    const sourceHeights = [slice, sourceHeight - slice * 2, slice];
    const destX = [0, slice, width - slice];
    const destY = [0, slice, height - slice];
    const destWidths = [slice, Math.max(1, width - slice * 2), slice];
    const destHeights = [slice, Math.max(1, height - slice * 2), slice];

    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        context.drawImage(
          source,
          sourceX[column], sourceY[row], sourceWidths[column], sourceHeights[row],
          destX[column], destY[row], destWidths[column], destHeights[row],
        );
      }
    }
    canvasTexture.refresh();
    return key;
  }
}
