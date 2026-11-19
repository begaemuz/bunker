import { gameConfig } from '../config/gameConfig';
import type { Rarity } from '../types';

// Визуальные сущности — только для отрисовки, не влияют на расчёты.

export interface PulseRing {
  t: number;
  maxT: number;
  radius: number;
  crit: boolean;
  weak: boolean;
}
export interface DamageNumber {
  x: number;
  y: number;
  t: number;
  value: number;
  crit: boolean;
  color: string;
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  maxT: number;
  color: string;
  size: number;
}
export interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
  maxT: number;
  color: string;
  width: number;
  jagged: boolean;
}
export interface Blast {
  x: number;
  y: number;
  r: number;
  t: number;
  maxT: number;
  color: string;
}
export interface LootFlyer {
  x: number;
  y: number;
  t: number;
  maxT: number;
  rarity: Rarity;
}

export class Visuals {
  rings: PulseRing[] = [];
  numbers: DamageNumber[] = [];
  particles: Particle[] = [];
  beams: Beam[] = [];
  blasts: Blast[] = [];
  loot: LootFlyer[] = [];
  /** Пул частиц, чтобы не создавать объекты каждый кадр. */
  private particlePool: Particle[] = [];

  ring(radius: number, crit: boolean, weak = false): void {
    this.rings.push({ t: 0, maxT: gameConfig.pulseVisualTime, radius, crit, weak });
  }

  number(x: number, y: number, value: number, crit: boolean, color = '#e8f6ff'): void {
    if (this.numbers.length >= gameConfig.maxDamageNumbers) this.numbers.shift();
    this.numbers.push({ x: x + (Math.random() - 0.5) * 10, y, t: 0, value, crit, color });
  }

  burst(x: number, y: number, color: string, count: number, speed = 80, size = 2.5, life = 0.5): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= gameConfig.maxParticles) return;
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      const p = this.particlePool.pop() ?? ({} as Particle);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v;
      p.t = 0;
      p.maxT = life * (0.6 + Math.random() * 0.6);
      p.color = color;
      p.size = size * (0.6 + Math.random() * 0.8);
      this.particles.push(p);
    }
  }

  beam(x1: number, y1: number, x2: number, y2: number, color: string, width = 2, jagged = false, life = 0.18): void {
    if (this.beams.length > 80) return;
    this.beams.push({ x1, y1, x2, y2, t: 0, maxT: life, color, width, jagged });
  }

  blast(x: number, y: number, r: number, color: string, life = 0.4): void {
    if (this.blasts.length > 40) return;
    this.blasts.push({ x, y, r, t: 0, maxT: life, color });
  }

  lootFly(x: number, y: number, rarity: Rarity): void {
    this.loot.push({ x, y, t: 0, maxT: 0.9, rarity });
  }

  update(dt: number): void {
    this.rings = this.rings.filter((r) => (r.t += dt) < r.maxT);
    this.numbers = this.numbers.filter((n) => (n.t += dt) < 0.8);
    const alive: Particle[] = [];
    for (const p of this.particles) {
      p.t += dt;
      if (p.t >= p.maxT) {
        this.particlePool.push(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.5 * dt;
      p.vy *= 1 - 2.5 * dt;
      alive.push(p);
    }
    this.particles = alive;
    this.beams = this.beams.filter((b) => (b.t += dt) < b.maxT);
    this.blasts = this.blasts.filter((b) => (b.t += dt) < b.maxT);
    this.loot = this.loot.filter((l) => (l.t += dt) < l.maxT);
  }

  clear(): void {
    this.rings = [];
    this.numbers = [];
    this.particles = [];
    this.beams = [];
    this.blasts = [];
    this.loot = [];
  }
}
