import { applyDamageToEnemy, mitigateBunkerDamage } from '../combat/DamageSystem';
import { chainConfig, effectConfig, gameConfig, splashConfig } from '../config/gameConfig';
import type { EnemyKind } from '../config/enemiesConfig';
import type { MapDef } from '../config/mapsConfig';
import type { BunkerStats } from '../bunker/BunkerStats';
import { rollEnemyLoot, type Loot } from '../economy/DropSystem';
import { createEnemy, type Enemy } from '../enemies/Enemy';
import { chance, random } from '../rng';
import {
  DAMAGE_TYPES,
  EFFECT_KINDS,
  RESOURCE_KEYS,
  type DamageType,
  type EffectKind,
  type Item,
  type Resources,
} from '../types';
import { generateWave, type WavePlan } from '../waves/WaveGenerator';
import { Visuals } from './Visuals';

export type EnginePhase = 'break' | 'spawning' | 'clearing';
export type EngineState = 'running' | 'defeat' | 'victory';

export type GameEvent =
  | { type: 'kill'; enemy: Enemy; loot: Loot; xp: number }
  | { type: 'waveStart'; wave: number; isBoss: boolean }
  | { type: 'waveCleared'; wave: number }
  | { type: 'bossSpawn'; name: string }
  | { type: 'minibossSpawn'; name: string }
  | { type: 'bunkerHit'; amount: number }
  | { type: 'pulse'; crit: boolean }
  | { type: 'victory' }
  | { type: 'defeat' };

export interface RunStats {
  time: number;
  kills: number;
  killsByKind: Partial<Record<EnemyKind, number>>;
  eliteKills: number;
  minibossKills: number;
  bossKilled: boolean;
  wavesCleared: number;
  pulses: number;
  damageDealt: number;
  damageByType: Record<DamageType, number>;
  damageByEnemy: Partial<Record<EnemyKind, number>>;
  damageTaken: number;
  maxDps: number;
  effectProcs: Record<EffectKind, number>;
  effectDamage: number;
  resources: Resources;
  items: Item[];
  xp: number;
}

function emptyRunStats(): RunStats {
  return {
    time: 0,
    kills: 0,
    killsByKind: {},
    eliteKills: 0,
    minibossKills: 0,
    bossKilled: false,
    wavesCleared: 0,
    pulses: 0,
    damageDealt: 0,
    damageByType: Object.fromEntries(DAMAGE_TYPES.map((t) => [t, 0])) as Record<DamageType, number>,
    damageByEnemy: {},
    damageTaken: 0,
    maxDps: 0,
    effectProcs: Object.fromEntries(EFFECT_KINDS.map((k) => [k, 0])) as Record<EffectKind, number>,
    effectDamage: 0,
    resources: Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0])) as Resources,
    items: [],
    xp: 0,
  };
}

export interface BunkerRuntime {
  hp: number;
  battery: number;
  pulseTimer: number;
  suppressT: number;
  suppressFactor: number;
  hitFlash: number;
  efficiency: number;
}

const DPS_BUCKET = 0.25;
const DPS_BUCKETS = 16; // 4 секунды

/**
 * Игровой движок одного боя. Полностью независим от React и Canvas:
 * получает характеристики бункера, двигает роботов, считает урон и награды.
 */
export class GameEngine {
  state: EngineState = 'running';
  readonly map: MapDef;
  stats: BunkerStats;
  bunker: BunkerRuntime;
  wave = 0;
  phase: EnginePhase = 'break';
  phaseTimer = 1.2;
  plan: WavePlan | null = null;
  enemies: Enemy[] = [];
  visuals = new Visuals();
  run: RunStats = emptyRunStats();
  /** Последние выпавшие предметы (для HUD). */
  recentDrops: Item[] = [];
  /** Половина видимой области в игровых единицах. */
  view = { hw: gameConfig.viewWidth / 2, hh: 360 };

  private spawnIndex = 0;
  private spawnTimer = 0;
  private auraTimer = 0;
  private extraPulseTimer = -1;
  private dpsBuckets: number[] = new Array(DPS_BUCKETS).fill(0);
  private dpsBucketTime = 0;
  private listeners: ((e: GameEvent) => void)[] = [];
  private statsProvider: (efficiency: number) => BunkerStats;

  constructor(map: MapDef, statsProvider: (efficiency: number) => BunkerStats) {
    this.map = map;
    this.statsProvider = statsProvider;
    this.stats = statsProvider(1);
    this.bunker = {
      hp: this.stats.maxHp,
      battery: this.stats.energy.batteryCap,
      pulseTimer: 0,
      suppressT: 0,
      suppressFactor: 1,
      hitFlash: 0,
      efficiency: 1,
    };
  }

  on(fn: (e: GameEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit(e: GameEvent): void {
    for (const l of this.listeners) l(e);
  }

  setViewport(hw: number, hh: number): void {
    this.view = { hw, hh };
  }

  /** Пересчитать характеристики (после смены экипировки, уровня, энергии). */
  refreshStats(): void {
    const prevMax = this.stats.maxHp;
    this.stats = this.statsProvider(this.bunker.efficiency);
    if (this.stats.maxHp !== prevMax && prevMax > 0) {
      // Сохраняем долю HP при изменении максимума.
      this.bunker.hp = Math.min(this.stats.maxHp, (this.bunker.hp / prevMax) * this.stats.maxHp);
    }
    this.bunker.battery = Math.min(this.bunker.battery, this.stats.energy.batteryCap);
  }

  get bossWave(): number {
    return this.map.wavesBeforeBoss + 1;
  }

  get currentDps(): number {
    const sum = this.dpsBuckets.reduce((a, b) => a + b, 0);
    return sum / (DPS_BUCKET * DPS_BUCKETS);
  }

  get aliveCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  get boss(): Enemy | undefined {
    return this.enemies.find((e) => e.alive && e.isBoss);
  }

  // ───────────────────────── Главный шаг ─────────────────────────

  update(dt: number): void {
    this.visuals.update(dt);
    if (this.state !== 'running') return;
    this.run.time += dt;

    this.updateEnergy(dt);
    this.updateWaves(dt);
    this.updateBunker(dt);
    this.updateAuras(dt);
    for (const e of this.enemies) if (e.alive) this.updateEnemy(e, dt);
    this.updatePulses(dt);
    this.updateDps(dt);

    // Удаляем уничтоженных роботов пачкой, без перестроения массива каждый шаг.
    if (this.enemies.length > 0 && this.enemies.length - this.aliveCount > 32) {
      this.enemies = this.enemies.filter((e) => e.alive);
    }
    this.checkWaveCleared();
  }

  // ───────────────────────── Энергия ─────────────────────────

  private updateEnergy(dt: number): void {
    const en = this.stats.energy;
    const b = this.bunker;
    let eff = 1;
    if (en.balance >= 0) {
      b.battery = Math.min(en.batteryCap, b.battery + en.balance * dt);
    } else {
      b.battery -= -en.balance * dt;
      if (b.battery <= 0) {
        b.battery = 0;
        eff = Math.max(0, en.generation / en.consumption);
      }
    }
    // Квантуем, чтобы не пересчитывать характеристики каждый кадр.
    const q = Math.round(eff * 20) / 20;
    if (q !== b.efficiency) {
      b.efficiency = q;
      this.refreshStats();
    }
  }

  // ───────────────────────── Волны ─────────────────────────

  private updateWaves(dt: number): void {
    if (this.phase === 'break') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.startWave(this.wave + 1);
      return;
    }
    if (this.phase === 'spawning' && this.plan) {
      this.spawnTimer -= dt;
      while (this.spawnTimer <= 0 && this.spawnIndex < this.plan.spawns.length) {
        const s = this.plan.spawns[this.spawnIndex++];
        const pos = this.edgeSpawnPoint();
        this.spawnEnemy(s.kind, s.elite, pos.x, pos.y);
        // Иногда роботы появляются группой.
        this.spawnTimer += this.plan.interval * (random() < 0.25 ? 0.15 : 0.7 + random() * 0.6);
      }
      if (this.spawnIndex >= this.plan.spawns.length) this.phase = 'clearing';
    }
  }

  private startWave(n: number): void {
    this.wave = n;
    this.plan = generateWave(this.map, n);
    this.spawnIndex = 0;
    this.spawnTimer = 0;
    this.phase = 'spawning';
    this.emit({ type: 'waveStart', wave: n, isBoss: this.plan.isBoss });
  }

  private checkWaveCleared(): void {
    if (this.phase !== 'clearing' || this.state !== 'running') return;
    if (this.aliveCount > 0) return;
    this.run.wavesCleared++;
    this.bunker.hp = Math.min(this.stats.maxHp, this.bunker.hp + this.stats.maxHp * gameConfig.waveRepairPct);
    this.emit({ type: 'waveCleared', wave: this.wave });
    this.phase = 'break';
    this.phaseTimer = gameConfig.waveBreak;
  }

  /** Точка появления сразу за краем видимой области. */
  private edgeSpawnPoint(): { x: number; y: number } {
    const a = random() * Math.PI * 2;
    const hw = this.view.hw + gameConfig.spawnMargin;
    const hh = this.view.hh + gameConfig.spawnMargin;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const t = Math.min(hw / Math.max(1e-6, Math.abs(c)), hh / Math.max(1e-6, Math.abs(s)));
    return { x: c * t, y: s * t };
  }

  spawnEnemy(kind: EnemyKind, elite: boolean, x: number, y: number): Enemy {
    const e = createEnemy(kind, { wave: this.wave, mapDifficulty: this.map.difficulty }, elite, x, y);
    this.enemies.push(e);
    if (e.isBoss) this.emit({ type: 'bossSpawn', name: e.def.name });
    if (e.isMiniboss) this.emit({ type: 'minibossSpawn', name: e.def.name });
    return e;
  }

  // ───────────────────────── Бункер ─────────────────────────

  private updateBunker(dt: number): void {
    const b = this.bunker;
    b.hp = Math.min(this.stats.maxHp, b.hp + this.stats.regen * dt);
    if (b.suppressT > 0) {
      b.suppressT -= dt;
      if (b.suppressT <= 0) b.suppressFactor = 1;
    }
    if (b.hitFlash > 0) b.hitFlash -= dt;
  }

  damageBunker(amount: number, type: DamageType): void {
    if (this.state !== 'running') return;
    const dmg = mitigateBunkerDamage(amount, type, this.stats.resist);
    this.bunker.hp -= dmg;
    this.bunker.hitFlash = 0.15;
    this.run.damageTaken += dmg;
    this.emit({ type: 'bunkerHit', amount: dmg });
    if (this.bunker.hp <= 0) {
      this.bunker.hp = 0;
      this.state = 'defeat';
      this.visuals.blast(0, 0, 90, '#ff6a3d', 0.8);
      this.visuals.burst(0, 0, '#ff8a4a', 60, 160, 3, 1);
      this.emit({ type: 'defeat' });
    }
  }

  // ───────────────────────── Роботы ─────────────────────────

  private updateAuras(dt: number): void {
    this.auraTimer -= dt;
    if (this.auraTimer > 0) return;
    this.auraTimer = 0.25;
    for (const e of this.enemies) e.auraArmor = 0;
    for (const s of this.enemies) {
      if (!s.alive) continue;
      for (const ab of s.abilities) {
        if (ab.type !== 'armorAura') continue;
        const r2 = ab.radius * ab.radius;
        for (const e of this.enemies) {
          if (!e.alive || e === s) continue;
          const dx = e.x - s.x;
          const dy = e.y - s.y;
          if (dx * dx + dy * dy <= r2) e.auraArmor = Math.max(e.auraArmor, ab.armor);
        }
      }
    }
  }

  private updateEnemy(e: Enemy, dt: number): void {
    const st = e.status;
    e.anim += dt;
    if (e.hitFlash > 0) e.hitFlash -= dt;

    // Статусы
    if (st.slowT > 0) st.slowT -= dt;
    if (st.freezeT > 0) st.freezeT -= dt;
    if (st.stunT > 0) st.stunT -= dt;
    if (st.shockT > 0) st.shockT -= dt;
    if (st.corrosionT > 0) st.corrosionT -= dt;
    if (st.armorBreakT > 0) st.armorBreakT -= dt;
    if (st.burnT > 0) {
      st.burnT -= dt;
      const r = applyDamageToEnemy(e, st.burnDps * dt, 'dot');
      this.recordDamage(e, r.dealt, 'dot', true);
      if (r.killed) {
        this.killEnemy(e);
        return;
      }
    }

    // Щит
    if (e.maxShield > 0) {
      const sh = e.abilities.find((a) => a.type === 'shield');
      if (sh && sh.type === 'shield') {
        e.shieldDelay += dt;
        if (e.shieldDelay >= sh.regenDelay && e.shield < e.maxShield) {
          e.shield = Math.min(e.maxShield, e.shield + e.maxShield * sh.regenRate * dt);
        }
      }
    }

    const disabled = st.freezeT > 0 || st.stunT > 0;

    // Способности (работают, пока робот не оглушён)
    if (!disabled) this.updateAbilities(e, dt);

    const d = Math.hypot(e.x, e.y);
    const body = gameConfig.bunkerBodyRadius + e.size;
    let stopDist = body + e.range;
    if (e.kind === 'support') stopDist = Math.max(stopDist, body + 70);

    if (d > stopDist + 0.5) {
      e.attacking = false;
      if (disabled) return;
      const slow = st.slowT > 0 ? 1 - st.slowP : 1;
      const step = Math.min(d - stopDist, e.speed * slow * dt);
      // Издалека роботы идут по слегка изогнутой траектории.
      const bend = d > stopDist + 80 ? e.laneOffset * 0.35 : 0;
      const ang = Math.atan2(-e.y, -e.x) + bend;
      e.x += Math.cos(ang) * step;
      e.y += Math.sin(ang) * step;
      return;
    }

    e.attacking = true;
    if (disabled) return;
    if (e.abilities.some((a) => a.type === 'explode')) {
      // Камикадзе подрывается у стены бункера.
      this.damageBunker(e.damage, e.damageType);
      e.alive = false;
      this.visuals.blast(e.x, e.y, 34, '#ff7a2a', 0.45);
      this.visuals.burst(e.x, e.y, '#ffb347', 18, 140, 2.5, 0.5);
      return;
    }
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = e.def.attackInterval;
      this.damageBunker(e.damage, e.damageType);
      if (e.range > 0) {
        this.visuals.beam(e.x, e.y, 0, 0, '#ff5a4a', 2, false, 0.12);
      } else {
        const a = Math.atan2(e.y, e.x);
        this.visuals.burst(Math.cos(a) * gameConfig.bunkerBodyRadius, Math.sin(a) * gameConfig.bunkerBodyRadius, '#ffcc66', 4, 60, 2, 0.25);
      }
    }
  }

  private updateAbilities(e: Enemy, dt: number): void {
    for (let i = 0; i < e.abilities.length; i++) {
      const ab = e.abilities[i];
      switch (ab.type) {
        case 'heal': {
          e.abilityTimers[i] -= dt;
          if (e.abilityTimers[i] > 0) break;
          e.abilityTimers[i] = ab.interval;
          const r2 = ab.radius * ab.radius;
          let healed = false;
          for (const o of this.enemies) {
            if (!o.alive || o === e || o.hp >= o.maxHp) continue;
            const dx = o.x - e.x;
            const dy = o.y - e.y;
            if (dx * dx + dy * dy > r2) continue;
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * ab.percent);
            healed = true;
          }
          if (healed) this.visuals.blast(e.x, e.y, ab.radius, '#4dff9a', 0.5);
          break;
        }
        case 'summon': {
          e.abilityTimers[i] -= dt;
          if (e.abilityTimers[i] > 0) break;
          e.abilityTimers[i] = ab.interval;
          for (let k = 0; k < ab.count; k++) {
            const a = random() * Math.PI * 2;
            this.spawnEnemy(ab.kind, false, e.x + Math.cos(a) * (e.size + 12), e.y + Math.sin(a) * (e.size + 12));
          }
          this.visuals.blast(e.x, e.y, e.size * 2, '#ff4040', 0.5);
          break;
        }
        case 'blast': {
          e.abilityTimers[i] -= dt;
          if (e.abilityTimers[i] > 0) break;
          e.abilityTimers[i] = ab.interval;
          this.damageBunker(ab.damage * this.map.difficulty, ab.damageType);
          this.visuals.beam(e.x, e.y, 0, 0, '#ff3355', 5, false, 0.3);
          this.visuals.blast(0, 0, gameConfig.bunkerBodyRadius + 10, '#ff3355', 0.35);
          break;
        }
        case 'suppress': {
          e.abilityTimers[i] -= dt;
          if (e.abilityTimers[i] > 0) break;
          e.abilityTimers[i] = ab.interval;
          this.bunker.suppressT = ab.duration;
          this.bunker.suppressFactor = ab.rateFactor;
          this.visuals.blast(0, 0, this.stats.radius, '#b04dff', 0.7);
          break;
        }
        case 'selfRepair': {
          if (e.hp < e.maxHp * ab.belowHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * ab.percentPerSec * dt);
          break;
        }
        default:
          break;
      }
    }
  }

  // ───────────────────────── Импульсы ─────────────────────────

  private updatePulses(dt: number): void {
    const b = this.bunker;
    const rate = this.stats.pulseRate * b.suppressFactor;
    const interval = 1 / Math.max(0.05, rate);
    b.pulseTimer += dt;
    while (b.pulseTimer >= interval) {
      b.pulseTimer -= interval;
      this.firePulse(1, false);
    }
    if (this.extraPulseTimer >= 0) {
      this.extraPulseTimer -= dt;
      if (this.extraPulseTimer < 0) this.firePulse(effectConfig.extraPulse.power * this.stats.effectPower, true);
    }
  }

  private hasEffect(kind: EffectKind): number {
    const e = this.stats.effects.find((x) => x.kind === kind);
    return e ? e.chance : 0;
  }

  /** Импульс: все роботы в радиусе получают урон одновременно. */
  firePulse(power: number, isExtra: boolean): void {
    const s = this.stats;
    const crit = chance(s.critChance);
    const base = s.damage * power * (crit ? s.critMultiplier : 1);
    const radius = s.radius;
    this.run.pulses++;
    this.visuals.ring(radius, crit, isExtra);
    this.emit({ type: 'pulse', crit });

    const targets: Enemy[] = [];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x, e.y) - e.size;
      if (d <= radius) targets.push(e);
    }

    const ep = s.effectPower;
    for (const e of targets) {
      if (!e.alive) continue;
      e.pendingDamage = 0;
      e.pendingCrit = crit;
      let killed = false;
      for (const c of s.components) {
        const r = applyDamageToEnemy(e, base * c.mult, c.type);
        e.pendingDamage += r.dealt;
        this.recordDamage(e, r.dealt, c.type, false);
        if (r.killed) {
          killed = true;
          break;
        }
      }
      this.showNumber(e);
      if (killed) {
        this.killEnemy(e, true, base);
        continue;
      }
      this.applyOnHitEffects(e, base, ep);
    }

    if (!isExtra && targets.length > 0) {
      const p = this.hasEffect('extraPulse');
      if (p > 0 && chance(p)) {
        this.run.effectProcs.extraPulse++;
        this.extraPulseTimer = 0.15;
      }
    }
  }

  private applyOnHitEffects(e: Enemy, base: number, ep: number): void {
    const st = e.status;
    const fx = this.stats.effects;
    for (const f of fx) {
      if (!e.alive) return;
      if (!chance(f.chance)) continue;
      const cfg = effectConfig[f.kind];
      switch (f.kind) {
        case 'slow':
          st.slowT = cfg.duration;
          st.slowP = Math.min(0.8, cfg.power * ep);
          break;
        case 'freeze':
          if (e.isBoss) continue; // Боссы не замораживаются полностью
          st.freezeT = cfg.duration * ep;
          break;
        case 'stun':
          if (e.isBoss) continue;
          st.stunT = cfg.duration * ep;
          break;
        case 'burn': {
          const dps = base * cfg.power * ep;
          st.burnDps = st.burnT > 0 ? Math.max(st.burnDps, dps) : dps;
          st.burnT = cfg.duration;
          break;
        }
        case 'shock':
          st.shockT = cfg.duration;
          st.shockP = cfg.power * ep;
          break;
        case 'corrosion':
          st.corrosionT = cfg.duration;
          st.corrosionP = Math.min(e.armor, st.corrosionP + cfg.power * ep);
          break;
        case 'armorBreak':
          st.armorBreakT = cfg.duration;
          st.armorBreakP = Math.min(0.9, cfg.power * ep);
          break;
        case 'chain':
          this.chainLightning(e, base * cfg.power * ep);
          break;
        default:
          continue; // extraPulse и splash обрабатываются отдельно
      }
      this.run.effectProcs[f.kind]++;
    }
  }

  private chainLightning(from: Enemy, dmg: number): void {
    const hit = new Set<number>([from.id]);
    let cur = from;
    const r2 = chainConfig.jumpRange * chainConfig.jumpRange;
    for (let j = 0; j < chainConfig.jumps; j++) {
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const o of this.enemies) {
        if (!o.alive || hit.has(o.id)) continue;
        const dx = o.x - cur.x;
        const dy = o.y - cur.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 < bestD) {
          best = o;
          bestD = d2;
        }
      }
      if (!best) return;
      hit.add(best.id);
      this.visuals.beam(cur.x, cur.y, best.x, best.y, '#9fe8ff', 2, true, 0.2);
      const r = applyDamageToEnemy(best, dmg, 'electric');
      this.recordDamage(best, r.dealt, 'electric', true);
      best.pendingDamage = r.dealt;
      best.pendingCrit = false;
      this.showNumber(best, '#9fe8ff');
      if (r.killed) this.killEnemy(best);
      cur = best;
    }
  }

  private showNumber(e: Enemy, color?: string): void {
    if (e.pendingDamage < 0.5) return;
    this.visuals.number(e.x, e.y - e.size - 4, Math.round(e.pendingDamage), e.pendingCrit, color ?? (e.pendingCrit ? '#ffd24a' : '#e8f6ff'));
    e.pendingDamage = 0;
  }

  private recordDamage(e: Enemy, dealt: number, type: DamageType, fromEffect: boolean): void {
    if (dealt <= 0) return;
    this.run.damageDealt += dealt;
    this.run.damageByType[type] += dealt;
    this.run.damageByEnemy[e.kind] = (this.run.damageByEnemy[e.kind] ?? 0) + dealt;
    if (fromEffect) this.run.effectDamage += dealt;
    this.dpsBuckets[DPS_BUCKETS - 1] += dealt;
  }

  private updateDps(dt: number): void {
    this.dpsBucketTime += dt;
    if (this.dpsBucketTime >= DPS_BUCKET) {
      this.dpsBucketTime -= DPS_BUCKET;
      this.run.maxDps = Math.max(this.run.maxDps, this.currentDps);
      this.dpsBuckets.shift();
      this.dpsBuckets.push(0);
    }
  }

  // ───────────────────────── Уничтожение и награды ─────────────────────────

  private killEnemy(e: Enemy, byPulse = false, pulseBase = 0): void {
    e.alive = false;
    e.hp = 0;
    const r = this.run;
    r.kills++;
    r.killsByKind[e.kind] = (r.killsByKind[e.kind] ?? 0) + 1;
    if (e.elite) r.eliteKills++;
    if (e.isMiniboss) r.minibossKills++;

    const loot = rollEnemyLoot(e, {
      mapId: this.map.id,
      wave: this.wave,
      dropChanceMult: this.stats.dropChanceMult,
      coinMult: this.stats.coinMult,
    });
    for (const k of RESOURCE_KEYS) r.resources[k] += loot.resources[k] ?? 0;
    for (const it of loot.items) {
      r.items.push(it);
      this.recentDrops.unshift(it);
      this.visuals.lootFly(e.x, e.y, it.rarity);
    }
    if (this.recentDrops.length > 5) this.recentDrops.length = 5;
    r.xp += e.xp;

    // Визуальный эффект разрушения
    const big = e.isBoss || e.isMiniboss;
    this.visuals.burst(e.x, e.y, e.elite ? '#ffd24a' : '#9aa4ad', big ? 50 : 10, big ? 180 : 90, big ? 4 : 2.5, big ? 1 : 0.5);
    this.visuals.burst(e.x, e.y, '#ff9a3c', big ? 30 : 5, big ? 120 : 60, 2, 0.4);
    if (big) this.visuals.blast(e.x, e.y, e.size * 2.5, '#ffb347', 0.7);

    this.emit({ type: 'kill', enemy: e, loot, xp: e.xp });

    // Взрыв при уничтожении
    if (byPulse) {
      const sp = this.hasEffect('splash');
      if (sp > 0 && chance(sp)) {
        this.run.effectProcs.splash++;
        const dmg = pulseBase * effectConfig.splash.power * this.stats.effectPower;
        this.visuals.blast(e.x, e.y, splashConfig.radius, '#ffb347', 0.35);
        const r2 = splashConfig.radius * splashConfig.radius;
        for (const o of this.enemies) {
          if (!o.alive) continue;
          const dx = o.x - e.x;
          const dy = o.y - e.y;
          if (dx * dx + dy * dy > r2) continue;
          const res = applyDamageToEnemy(o, dmg, 'explosive');
          this.recordDamage(o, res.dealt, 'explosive', true);
          if (res.killed) this.killEnemy(o);
        }
      }
    }

    if (e.isBoss) this.onBossKilled();
  }

  private onBossKilled(): void {
    this.run.bossKilled = true;
    // Босс управлял армией — оставшиеся роботы отключаются.
    for (const o of this.enemies) {
      if (!o.alive) continue;
      o.alive = false;
      this.visuals.burst(o.x, o.y, '#6b7680', 8, 60, 2, 0.6);
    }
    this.run.wavesCleared++;
    this.state = 'victory';
    this.emit({ type: 'waveCleared', wave: this.wave });
    this.emit({ type: 'victory' });
  }

  /** Сдаться (завершить попытку вручную). */
  surrender(): void {
    if (this.state !== 'running') return;
    this.bunker.hp = 0;
    this.state = 'defeat';
    this.emit({ type: 'defeat' });
  }
}
