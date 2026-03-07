import { DEFAULT_KEYS } from '../constants';

export interface KeyBindings {
  left: string;
  right: string;
  jump: string;
  pause: string;
  altLeft: string;
  altRight: string;
  altJump: string;
}

const STORAGE_KEY = 'jungle-jumper-settings';
const HIGHSCORE_KEY = 'jungle-jumper-highscore';
const CHARACTER_KEY = 'jungle-jumper-character';
const MOBILE_CONTROLS_KEY = 'jungle-jumper-mobile-controls';

export class SettingsManager {
  private static keys: KeyBindings = { ...DEFAULT_KEYS };
  private static _selectedCharacter = 0;
  private static mobileControlsEnabled = true;

  static init(): void {
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
}
