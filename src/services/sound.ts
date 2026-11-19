// Простые синтезированные звуки через Web Audio API (без файлов).
// Полноценный звук, музыка и раздельная громкость — этап 6.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
const lastPlayed: Record<string, number> = {};

function ac(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Браузеры разрешают звук только после действия пользователя. */
export function unlockAudio(): void {
  ac();
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (master) master.gain.value = on ? 0.35 : 0;
}

function throttle(key: string, ms: number): boolean {
  const now = performance.now();
  if ((lastPlayed[key] ?? 0) + ms > now) return false;
  lastPlayed[key] = now;
  return true;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, lowpass = 1200): void {
  const c = ac();
  if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

export const sfx = {
  pulse(crit: boolean) {
    if (!throttle('pulse', 90)) return;
    tone(crit ? 520 : 320, 0.18, 'sawtooth', crit ? 0.12 : 0.06, crit ? 120 : 90);
  },
  hit() {
    if (!throttle('hit', 120)) return;
    noise(0.08, 0.12, 600);
  },
  kill(big: boolean) {
    if (!throttle('kill', 60)) return;
    noise(big ? 0.6 : 0.15, big ? 0.4 : 0.08, big ? 900 : 1800);
  },
  item(rare: boolean) {
    tone(rare ? 880 : 660, 0.12, 'triangle', 0.12);
    setTimeout(() => tone(rare ? 1320 : 990, 0.18, 'triangle', 0.1), 90);
  },
  levelUp() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'square', 0.06), i * 90));
  },
  boss() {
    tone(90, 1.2, 'sawtooth', 0.2, 55);
  },
  victory() {
    [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.12), i * 140));
  },
  defeat() {
    tone(220, 0.9, 'sawtooth', 0.15, 60);
    noise(0.8, 0.3, 500);
  },
  click() {
    tone(1200, 0.03, 'square', 0.03);
  },
};
