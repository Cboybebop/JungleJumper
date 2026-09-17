import { DEFAULT_KEYS, GAME } from '../constants';

export interface KeyBindings {
  left: string;
  right: string;
  jump: string;
  pause: string;
  altLeft: string;
  altRight: string;
  altJump: string;
}

export type TouchControlSize = 'small' | 'medium' | 'large';
export type DisplayMode = 'mobile' | 'desktop';

interface DisplaySettings {
  mode: DisplayMode;
  width: number;
  height: number;
}

const STORAGE_KEY = 'jungle-jumper-settings';
const HIGHSCORE_KEY = 'jungle-jumper-highscore';
const CHARACTER_KEY = 'jungle-jumper-character';
const MOTION_KEY = 'jungle-jumper-reduced-motion';
const TOUCH_SIZE_KEY = 'jungle-jumper-touch-size';
const MOBILE_CONTROLS_KEY = 'jungle-jumper-mobile-controls';

export class SettingsManager {
  private static touchControlSize: TouchControlSize = 'medium';
  private static reducedMotion = false;
  private static keys: KeyBindings = { ...DEFAULT_KEYS };
  private static _selectedCharacter = 0;
  private static mobileControlsEnabled = true;
  private static displayMode: DisplayMode = 'desktop';

  static applyAutoDisplaySettings(): void {
    const display = this.getAutoDisplaySettings();
    this.displayMode = display.mode;
    GAME.WIDTH = display.width;
    GAME.HEIGHT = display.height;
  }

  static init(): void {
    const size = localStorage.getItem(TOUCH_SIZE_KEY);
    this.touchControlSize = size === 'small' || size === 'large' ? size : 'medium';
    const motion = localStorage.getItem(MOTION_KEY);
    this.reducedMotion = motion === null
      ? (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      : motion === 'true';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.keys = { ...DEFAULT_KEYS, ...parsed };
      } catch {
        this.keys = { ...DEFAULT_KEYS };
      }
    }

    const savedChar = localStorage.getItem(CHARACTER_KEY);
    if (savedChar !== null) {
      this._selectedCharacter = parseInt(savedChar, 10) || 0;
    }

    const savedMobileControls = localStorage.getItem(MOBILE_CONTROLS_KEY);
    if (savedMobileControls !== null) {
      this.mobileControlsEnabled = savedMobileControls === 'true';
    }
  }

  static getTouchControlSize(): TouchControlSize { return this.touchControlSize; }

  static setTouchControlSize(size: TouchControlSize): void {
    this.touchControlSize = size;
    localStorage.setItem(TOUCH_SIZE_KEY, size);
  }

  static getReducedMotion(): boolean { return this.reducedMotion; }

  static setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    localStorage.setItem(MOTION_KEY, String(enabled));
  }

  static getKeys(): KeyBindings {
    return { ...this.keys };
  }

  static setKey(action: keyof KeyBindings, key: string): void {
    this.keys[action] = key;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.keys));
  }

  static resetKeys(): void {
    this.keys = { ...DEFAULT_KEYS };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.keys));
  }

  static get selectedCharacter(): number {
    return this._selectedCharacter;
  }

  static set selectedCharacter(index: number) {
    this._selectedCharacter = index;
    localStorage.setItem(CHARACTER_KEY, index.toString());
  }

  static getMobileControlsEnabled(): boolean {
    return this.mobileControlsEnabled;
  }

  static setMobileControlsEnabled(enabled: boolean): void {
    this.mobileControlsEnabled = enabled;
    localStorage.setItem(MOBILE_CONTROLS_KEY, enabled ? 'true' : 'false');
  }

  static getDisplayModeLabel(): string {
    return this.displayMode === 'mobile' ? 'FIT (TOUCH)' : 'FIT (DESKTOP)';
  }

  static getResolutionLabel(): string {
    return `${GAME.WIDTH}x${GAME.HEIGHT}`;
  }

  static getHighScore(): number {
    const saved = localStorage.getItem(HIGHSCORE_KEY);
    return saved ? parseInt(saved, 10) || 0 : 0;
  }

  static setHighScore(score: number): void {
    const current = this.getHighScore();
    if (score > current) {
      localStorage.setItem(HIGHSCORE_KEY, score.toString());
    }
  }

  private static getAutoDisplaySettings(): DisplaySettings {
    if (typeof window === 'undefined') {
      return {
        mode: 'desktop',
        width: GAME.WIDTH,
        height: GAME.HEIGHT,
      };
    }

    const width = 480;
    const height = 800;
    const mode: DisplayMode = this.isMobileDevice() ? 'mobile' : 'desktop';

    return { mode, width, height };
  }

  private static isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;

    const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };

    if (typeof nav.userAgentData?.mobile === 'boolean') {
      return nav.userAgentData.mobile;
    }

    const ua = nav.userAgent.toLowerCase();
    const uaSuggestsMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/.test(ua);
    const hasCoarsePointer = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = nav.maxTouchPoints > 1;

    return uaSuggestsMobile || (hasCoarsePointer && hasTouch);
  }
}
