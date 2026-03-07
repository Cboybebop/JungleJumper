export class AudioManager {
  private static ctx: AudioContext | null = null;

  private static getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private static playTone(
    freq: number, duration: number, type: OscillatorType = 'square',
    freqEnd?: number, volume = 0.15
  ): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not available
    }
  }

  static jump(): void {
    this.playTone(300, 0.15, 'square', 600, 0.1);
  }

  static land(): void {
    this.playTone(150, 0.08, 'triangle', 100, 0.08);
  }

  static shieldPickup(): void {
    this.playTone(523, 0.1, 'sine');
    setTimeout(() => this.playTone(659, 0.1, 'sine'), 100);
    setTimeout(() => this.playTone(784, 0.15, 'sine'), 200);
  }

  static shieldBreak(): void {
    try {
      const ctx = this.getContext();
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Audio not available
    }
  }

  static death(): void {
    this.playTone(400, 0.15, 'sawtooth', 200, 0.12);
    setTimeout(() => this.playTone(200, 0.3, 'sawtooth', 80, 0.12), 150);
  }

  static gameOver(): void {
    const notes = [392, 349, 330, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'triangle', undefined, 0.12), i * 300);
    });
  }

  static spring(): void {
    this.playTone(200, 0.2, 'sine', 800, 0.12);
  }

  static buttonClick(): void {
    this.playTone(600, 0.05, 'square', 800, 0.06);
  }
}
