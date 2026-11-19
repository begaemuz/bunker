// Генератор случайных чисел. Все вероятности игры идут через этот модуль,
// поэтому для тестов его можно сделать детерминированным через setSeed.

let state = (Date.now() ^ 0x9e3779b9) >>> 0;
let seeded = false;

function mulberry32(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function setSeed(seed: number): void {
  state = seed >>> 0;
  seeded = true;
}

export function random(): number {
  return seeded ? mulberry32() : Math.random();
}

export function chance(p: number): boolean {
  return p > 0 && random() < p;
}

export function randFloat(min: number, max: number): number {
  return min + (max - min) * random();
}

export function randInt(min: number, max: number): number {
  return Math.floor(min + (max - min + 1) * random());
}

export function pickWeighted<T>(entries: readonly T[], weight: (e: T) => number): T {
  let total = 0;
  for (const e of entries) total += Math.max(0, weight(e));
  let r = random() * total;
  for (const e of entries) {
    r -= Math.max(0, weight(e));
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

export function uid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!seeded && c && typeof c.randomUUID === 'function') return c.randomUUID();
  const hex = () => Math.floor(random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}
