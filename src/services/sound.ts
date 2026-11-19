// Звук через Web Audio API (без файлов): эффекты и генеративная фоновая музыка.
// Отдельная громкость: общая, эффекты, музыка.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let enabled = true;
let unlocked = false;
const vol = { master: 0.8, sfx: 0.8, music: 0.5 };
const lastPlayed: Record<string, number> = {};

function ac(): AudioContext | null {
  if (!unlocked) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(ctx.destination);
    applyVolumes();
    startMusic();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function applyVolumes(): void {
  if (!master || !sfxBus || !musicBus || !ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(enabled ? vol.master * 0.5 : 0, t, 0.05);
  sfxBus.gain.setTargetAtTime(vol.sfx, t, 0.05);
  musicBus.gain.setTargetAtTime(vol.music * 0.6, t, 0.3);
}

/** Браузеры разрешают звук только после действия пользователя. */
export function unlockAudio(): void {
  unlocked = true;
  ac();
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  applyVolumes();
}

export function setVolumes(v: Partial<typeof vol>): void {
  Object.assign(vol, v);
  applyVolumes();
}

function throttle(key: string, ms: number): boolean {
  const now = performance.now();
  if ((lastPlayed[key] ?? 0) + ms > now) return false;
  lastPlayed[key] = now;
  return true;
}

function tone(freq: number, dur: number, type: OscillatorType, v: number, slideTo?: number, bus: GainNode | null = sfxBus, when = 0): void {
  const c = ac();
  if (!c || !bus || !enabled) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, v: number, lowpass = 1200): void {
  const c = ac();
  if (!c || !sfxBus || !enabled) return;
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
  g.gain.value = v;
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  src.start();
}

// ───────── Генеративная музыка ─────────
// Тёмный эмбиент: низкий гул + медленное арпеджио в миноре.
// В бою с боссом темп и напряжение растут.

let musicMode: 'calm' | 'boss' = 'calm';
let step = 0;
const SCALE = [0, 3, 5, 7, 10, 12, 15];
const ROOTS = [45, 43, 41, 40];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function startMusic(): void {
  const c = ctx;
  if (!c || !musicBus) return;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 120;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  const droneGain = c.createGain();
  droneGain.gain.value = 0.18;
  for (const det of [-7, 6]) {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midi(33);
    o.detune.value = det;
    o.connect(filter);
    o.start();
  }
  filter.connect(droneGain);
  droneGain.connect(musicBus);
  lfo.start();
  scheduleMusic();
}

function scheduleMusic(): void {
  const boss = musicMode === 'boss';
  const beat = boss ? 0.26 : 0.55;
  if (!document.hidden && vol.music > 0) {
    const root = ROOTS[Math.floor(step / 16) % ROOTS.length] + (boss ? 0 : 12);
    if (step % 2 === 0 || boss) {
      const n = root + SCALE[(step * 5 + Math.floor(step / 3)) % SCALE.length];
      tone(midi(n), beat * 1.8, 'triangle', boss ? 0.09 : 0.06, undefined, musicBus);
    }
    if (step % 8 === 0) tone(midi(root - 12), beat * 6, 'sine', boss ? 0.2 : 0.14, undefined, musicBus);
    if (boss && step % 4 === 0) tone(60, 0.25, 'sine', 0.25, 35, musicBus);
  }
  step++;
  setTimeout(scheduleMusic, beat * 1000);
}

export function setMusicMode(m: 'calm' | 'boss'): void {
  musicMode = m;
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
    tone(rare ? 1320 : 990, 0.18, 'triangle', 0.1, undefined, sfxBus, 0.09);
  },
  levelUp() {
    [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'square', 0.06, undefined, sfxBus, i * 0.09));
  },
  boss() {
    tone(90, 1.2, 'sawtooth', 0.2, 55);
  },
  victory() {
    [392, 523, 659, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, undefined, sfxBus, i * 0.14));
  },
  defeat() {
    tone(220, 0.9, 'sawtooth', 0.15, 60);
    noise(0.8, 0.3, 500);
  },
  click() {
    tone(1200, 0.03, 'square', 0.03);
  },
};
