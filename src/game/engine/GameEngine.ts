import { applyCoilHit, mitigateBunkerDamage } from '../combat/DamageSystem';
import { balanceConfig } from '../config/balanceConfig';
import { bossesConfig } from '../config/bossesConfig';
import type { EnemyKind } from '../config/enemiesConfig';
import { chainConfig, effectConfig, gameConfig, modeConfig } from '../config/gameConfig';
import type { LocationDef } from '../config/locationsConfig';
import type { BunkerStats, CoilStats } from '../bunker/BunkerStats';
import { rollEnemyLoot, type Loot } from '../economy/DropSystem';
import { createEnemy, type Enemy } from '../enemies/Enemy';
import { chance, pickWeighted, randInt, random } from '../rng';
import { COIL_MODES, RESOURCE_KEYS, type AttackType, type CoilMode, type Item, type Resources } from '../types';
import { Visuals } from './Visuals';

export type EngineMode = 'normal' | 'boss';
export type EngineState = 'running' | 'defeat';

export type GameEvent =
  | { type: 'kill'; enemy: Enemy; loot: Loot; xp: number }
  | { type: 'groupCleared'; groupId: number }
  | { type: 'bossSpawn'; name: string }
  | { type: 'bossKilled'; bossId: string }
  | { type: 'minibossSpawn'; name: string }
  | { type: 'bunkerHit'; amount: number }
  | { type: 'pulse'; coil: number; crit: boolean }
  | { type: 'overheat' }
  | { type: 'emergencyRepair' }
  | { type: 'defeat'; duringBoss: boolean }
  | { type: 'bossRetreat' };

export interface RunStats {
  time: number;
  kills: number;
  killsByKind: Partial<Record<string, number>>;
  eliteKills: number;
  minibossKills: number;
  groupsCleared: number;
  bossesKilled: number;
  pulses: number;
  damageDealt: number;
  damageByMode: Record<CoilMode | 'dot', number>;
  damageByEnemy: Partial<Record<string, number>>;
  damageTaken: number;
  maxDps: number;
  effectProcs: Record<string, number>;
  overheats: number;
  resources: Resources;
  items: Item[];
  parts: number;
  xp: number;
}

function emptyRunStats(): RunStats {
  return {
    time: 0,
    kills: 0,
    killsByKind: {},
    eliteKills: 0,
    minibossKills: 0,
    groupsCleared: 0,
    bossesKilled: 0,
    pulses: 0,
    damageDealt: 0,
    damageByMode: Object.fromEntries([...COIL_MODES, 'dot'].map((m) => [m, 0])) as Record<CoilMode | 'dot', number>,
    damageByEnemy: {},
    damageTaken: 0,
    maxDps: 0,
    effectProcs: {},
    overheats: 0,
    resources: Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0])) as Resources,
    items: [],
    parts: 0,
    xp: 0,
  };
}

export interface CoilRuntime {
  timer: number;
  /** Сколько катушка простаивает без целей (для «первого импульса»). */
  idle: number;
  /** Причина ожидания, если катушка готова, но не стреляет. */
  blocked: 'energy' | 'heat' | 'jammed' | 'target' | null;
  jamT: number;
  /** Захваченная цель одиночного разряда: держится, пока жива и в радиусе. */
  lockId?: number | null;
  /** Фокус: сколько разрядов подряд ушло в одну цель. */
  focusId?: number | null;
  focus?: number;
}

export interface BunkerRuntime {
  hp: number;
  energy: number;
  heat: number;
  overheated: boolean;
  coils: CoilRuntime[];
  suppressT: number;
  suppressFactor: number;
  emergencyCd: number;
  hitFlash: number;
}

export interface RewardContext {
  /** Снижение наград за слабых противников (0..1). */
  decay: number;
}

const DPS_BUCKET = 0.25;
const DPS_BUCKETS = 16;
const FIRST_PULSE_IDLE = 3;

/**
 * Игровой движок боя на локации. Независим от React и Canvas:
 * роботы появляются группами без пауз, катушки работают сами,
 * босс вызывается по команде игрока.
 */
export class GameEngine {
  state: EngineState = 'running';
  mode: EngineMode = 'normal';
  readonly location: LocationDef;
  stats: BunkerStats;
  bunker: BunkerRuntime;
  enemies: Enemy[] = [];
  visuals = new Visuals();
  run: RunStats = emptyRunStats();
  recentDrops: Item[] = [];
  view = { hw: gameConfig.viewWidth / 2, hh: 360 };
  /** Рост угрозы на локации за эту сессию. */
  threat = 0;
  bossId: string | null = null;

  private groupTimer: number = balanceConfig.spawn.firstGroupDelay;
  private nextGroupId = 1;
  private groupsSpawned = 0;
  private groupAlive = new Map<number, number>();
  private auraTimer = 0;
  private resumeTimer = 0;
  private dpsBuckets: number[] = new Array(DPS_BUCKETS).fill(0);
  private dpsBucketTime = 0;
  private listeners: ((e: GameEvent) => void)[] = [];

  constructor(
    location: LocationDef,
    private statsProvider: () => BunkerStats,
    private rewardProvider: () => RewardContext = () => ({ decay: 1 }),
  ) {
    this.location = location;
    this.stats = statsProvider();
    this.bunker = {
      hp: this.stats.maxHp,
      energy: this.stats.capacity,
      heat: 0,
      overheated: false,
      coils: [0, 1].map(() => ({ timer: 0, idle: FIRST_PULSE_IDLE, blocked: null, jamT: 0 })),
      suppressT: 0,
      suppressFactor: 1,
      emergencyCd: 0,
      hitFlash: 0,
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

  /** Пересчёт характеристик после смены оборудования, технологий или уровня. */
  refreshStats(): void {
    const prevMax = this.stats.maxHp;
    this.stats = this.statsProvider();
    if (prevMax > 0 && this.stats.maxHp !== prevMax) {
      this.bunker.hp = Math.min(this.stats.maxHp, (this.bunker.hp / prevMax) * this.stats.maxHp);
    }
    this.bunker.energy = Math.min(this.bunker.energy, this.stats.capacity);
  }

  get currentDps(): number {
    return this.dpsBuckets.reduce((a, b) => a + b, 0) / (DPS_BUCKET * DPS_BUCKETS);
  }

  get aliveCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  get boss(): Enemy | undefined {
    return this.enemies.find((e) => e.alive && e.isBoss);
  }

  /** Катушка в слоте i (0 — №1, 1 — №2) или null. */
  coilAt(i: number): CoilStats | null {
    const slot = i === 0 ? 'coil1' : 'coil2';
    return this.stats.coils.find((c) => c.slot === slot) ?? null;
  }

  // ───────────────────────── Главный шаг ─────────────────────────

  update(dt: number): void {
    this.visuals.update(dt);
    if (this.state !== 'running') return;
    this.run.time += dt;

    this.updateEnergyAndHeat(dt);
    this.updateBunker(dt);
    if (this.mode === 'normal') this.updateSpawner(dt);
    this.updateAuras(dt);
    for (const e of this.enemies) if (e.alive) this.updateEnemy(e, dt);
    this.updateCoils(dt);
    this.updateDps(dt);

    if (this.enemies.length - this.aliveCount > 32) this.enemies = this.enemies.filter((e) => e.alive);
  }

  // ───────────────────────── Энергия и тепло ─────────────────────────

  private updateEnergyAndHeat(dt: number): void {
    const s = this.stats;
    const b = this.bunker;
    const free = Math.max(0, s.usablePower - s.passiveDrain);
    b.energy = Math.min(s.capacity, b.energy + Math.min(free, s.chargeRate) * dt);
    b.heat = Math.max(0, b.heat - s.coolRate * dt);
    if (!b.overheated && b.heat >= s.heatCap) {
      b.overheated = true;
      this.run.overheats++;
      this.emit({ type: 'overheat' });
    } else if (b.overheated && b.heat <= s.heatCap * gameConfig.overheatRecover) {
      b.overheated = false;
    }
  }

  private updateBunker(dt: number): void {
    const b = this.bunker;
    const s = this.stats;
    b.hp = Math.min(s.maxHp, b.hp + s.regen * dt);
    if (b.suppressT > 0 && (b.suppressT -= dt) <= 0) b.suppressFactor = 1;
    if (b.hitFlash > 0) b.hitFlash -= dt;
    if (b.emergencyCd > 0) b.emergencyCd -= dt;
    for (const c of b.coils) if (c.jamT > 0) c.jamT -= dt;
    // Аварийный ремонт при критическом уроне.
    if (s.emergencyRepair > 0 && b.emergencyCd <= 0 && b.hp < s.maxHp * 0.3) {
      b.hp = Math.min(s.maxHp, b.hp + s.maxHp * s.emergencyRepair);
      b.emergencyCd = 30;
      this.visuals.blast(0, 0, 60, '#5fd16a', 0.6);
      this.emit({ type: 'emergencyRepair' });
    }
  }

  damageBunker(amount: number, type: AttackType, attacker?: Enemy): void {
    if (this.state !== 'running') return;
    const s = this.stats;
    const dmg = mitigateBunkerDamage(amount, type, s.resist, s.damageReduction);
    this.bunker.hp -= dmg;
    this.bunker.hitFlash = 0.15;
    this.run.damageTaken += dmg;
    this.emit({ type: 'bunkerHit', amount: dmg });
    // Отражение урона (уникальный защитный контур).
    if (attacker && attacker.alive && s.reflect > 0 && type !== 'explosive') {
      const r = applyCoilHit(attacker, amount * s.reflect, 'dot');
      this.recordDamage(attacker, r.dealt, 'dot');
      if (r.killed) this.killEnemy(attacker);
    }
    if (this.bunker.hp <= 0) {
      this.bunker.hp = 0;
      this.state = 'defeat';
      this.visuals.blast(0, 0, 90, '#ff6a3d', 0.8);
      this.visuals.burst(0, 0, '#ff8a4a', 60, 160, 3, 1);
      this.emit({ type: 'defeat', duringBoss: this.mode === 'boss' });
    }
  }

  // ───────────────────────── Появление роботов ─────────────────────────

  private maxAlive(): number {
    const sp = balanceConfig.spawn;
    return sp.maxAliveBase + sp.maxAlivePerTier * (this.location.tier - 1) + Math.floor(this.threat * 6);
  }

  private updateSpawner(dt: number): void {
    if (this.resumeTimer > 0) {
      this.resumeTimer -= dt;
      return;
    }
    this.groupTimer -= dt;
    if (this.groupTimer > 0 || this.aliveCount >= this.maxAlive()) return;
    const sp = balanceConfig.spawn;
    this.groupTimer = sp.groupInterval * (0.75 + random() * 0.5);
    this.spawnGroup();
  }

  /** Группа роботов приходит с одного направления. */
  spawnGroup(): number {
    const sp = balanceConfig.spawn;
    const loc = this.location;
    const id = this.nextGroupId++;
    this.groupsSpawned++;
    const size = randInt(sp.groupSizeMin, sp.groupSizeMax) + Math.floor(this.threat * 3);
    const eliteChance = Math.min(0.4, sp.eliteBase + sp.elitePerThreat * this.threat);
    const angle = random() * Math.PI * 2;
    const kinds: { kind: EnemyKind; elite: boolean }[] = [];
    for (let i = 0; i < size; i++) {
      const u = pickWeighted(loc.enemies, (e) => e.weight);
      kinds.push({ kind: u.kind, elite: chance(eliteChance) });
    }
    if (this.groupsSpawned % loc.minibossEvery === 0) kinds.push({ kind: 'miniboss', elite: false });
    this.groupAlive.set(id, kinds.length);
    kinds.forEach((k, i) => {
      const a = angle + (random() - 0.5) * 0.5;
      const p = this.edgePoint(a, i * 14);
      this.spawnEnemy(k.kind, k.elite, p.x, p.y, id);
    });
    return id;
  }

  private edgePoint(a: number, extra = 0): { x: number; y: number } {
    const hw = this.view.hw + gameConfig.spawnMargin + extra;
    const hh = this.view.hh + gameConfig.spawnMargin + extra;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const t = Math.min(hw / Math.max(1e-6, Math.abs(c)), hh / Math.max(1e-6, Math.abs(s)));
    return { x: c * t, y: s * t };
  }

  spawnEnemy(kind: EnemyKind, elite: boolean, x: number, y: number, groupId = 0): Enemy {
    const e = createEnemy(kind, { tier: this.location.tier, threat: this.threat }, elite, x, y, groupId);
    this.enemies.push(e);
    if (e.isMiniboss) this.emit({ type: 'minibossSpawn', name: e.def.name });
    return e;
  }

  // ───────────────────────── Босс ─────────────────────────

  /** Вызов босса: обычные роботы отступают, появляется босс. */
  summonBoss(): boolean {
    if (this.mode === 'boss' || this.state !== 'running') return false;
    const id = this.location.boss;
    if (!bossesConfig[id]) return false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.alive = false;
      this.visuals.burst(e.x, e.y, '#6b7680', 6, 50, 2, 0.5);
    }
    this.groupAlive.clear();
    this.mode = 'boss';
    this.bossId = id;
    const p = this.edgePoint(-Math.PI / 2, 10);
    const boss = this.spawnEnemy(`boss:${id}`, false, p.x, p.y);
    this.emit({ type: 'bossSpawn', name: boss.def.name });
    return true;
  }

  private onBossKilled(boss: Enemy): void {
    for (const o of this.enemies) {
      if (!o.alive) continue;
      o.alive = false;
      this.visuals.burst(o.x, o.y, '#6b7680', 8, 60, 2, 0.6);
    }
    this.run.bossesKilled++;
    this.visuals.blast(boss.x, boss.y, boss.size * 3, '#ffb347', 1);
    this.mode = 'normal';
    this.resumeTimer = 4;
    this.groupTimer = 0;
    const id = this.bossId!;
    this.bossId = null;
    this.emit({ type: 'bossKilled', bossId: id });
  }

  // ───────────────────────── Роботы ─────────────────────────

  private updateAuras(dt: number): void {
    this.auraTimer -= dt;
    if (this.auraTimer > 0) return;
    this.auraTimer = 0.25;
    for (const e of this.enemies) e.auraArmor = 0;
    for (const s of this.enemies) {
      if (!s.alive || s.status.jamT > 0) continue;
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
    if (st.stunT > 0) st.stunT -= dt;
    if (st.slowT > 0) st.slowT -= dt;
    if (st.jamT > 0) st.jamT -= dt;
    if (st.shieldBreakT > 0) st.shieldBreakT -= dt;
    if (st.armorBreakT > 0) st.armorBreakT -= dt;
    if (st.armorUpT > 0) st.armorUpT -= dt;
    if (st.burnT > 0) {
      st.burnT -= dt;
      const r = applyCoilHit(e, st.burnDps * dt, 'dot', { identifiedBonus: this.stats.markBonus });
      this.recordDamage(e, r.dealt, 'dot');
      if (r.killed) {
        this.killEnemy(e);
        return;
      }
    }

    const d = Math.hypot(e.x, e.y);
    // Сенсоры опознают цели в зоне обнаружения.
    if (!e.identified && this.stats.detectRange > 0 && d <= this.stats.detectRange) {
      e.scanT += dt;
      if (e.scanT >= this.stats.identifyTime) e.identified = true;
    }

    // Щит восстанавливается после паузы, если не перегружен.
    if (e.maxShield > 0 && st.shieldBreakT <= 0) {
      const sh = e.abilities.find((a) => a.type === 'shield');
      if (sh && sh.type === 'shield') {
        e.shieldDelay += dt;
        if (e.shieldDelay >= sh.regenDelay && e.shield < e.maxShield) {
          e.shield = Math.min(e.maxShield, e.shield + e.maxShield * sh.regenRate * dt);
        }
      }
    }

    const disabled = st.stunT > 0;
    if (!disabled && st.jamT <= 0) this.updateAbilities(e, dt);
    else if (!disabled && e.isBoss) this.updateAbilities(e, dt);

    const body = gameConfig.bunkerBodyRadius + e.size;
    let stopDist = body + e.range;
    if (e.kind === 'support') stopDist = Math.max(stopDist, body + 70);

    if (d > stopDist + 0.5) {
      e.attacking = false;
      if (disabled) return;
      const slow = st.slowT > 0 ? 1 - st.slowP : 1;
      const step = Math.min(d - stopDist, e.speed * slow * dt);
      const bend = d > stopDist + 80 ? e.laneOffset * 0.35 : 0;
      const ang = Math.atan2(-e.y, -e.x) + bend;
      e.x += Math.cos(ang) * step;
      e.y += Math.sin(ang) * step;
      return;
    }

    e.attacking = true;
    if (disabled) return;
    if (e.abilities.some((a) => a.type === 'explode')) {
      e.alive = false;
      this.visuals.blast(e.x, e.y, 34, '#ff7a2a', 0.45);
      this.visuals.burst(e.x, e.y, '#ffb347', 18, 140, 2.5, 0.5);
      this.onEnemyGone(e);
      this.damageBunker(e.damage, e.attack);
      return;
    }
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = e.def.attackInterval;
      const jam = st.jamT > 0 ? 1 - effectConfig.jam.power : 1;
      this.damageBunker(e.damage * jam, e.attack, e.range > 0 ? undefined : e);
      if (e.range > 0) this.visuals.beam(e.x, e.y, 0, 0, '#ff5a4a', 2, false, 0.12);
      else {
        const a = Math.atan2(e.y, e.x);
        const R = gameConfig.bunkerBodyRadius;
        this.visuals.burst(Math.cos(a) * R, Math.sin(a) * R, '#ffcc66', 4, 60, 2, 0.25);
      }
    }
  }

  private updateAbilities(e: Enemy, dt: number): void {
    for (let i = 0; i < e.abilities.length; i++) {
      const ab = e.abilities[i];
      if (!('interval' in ab) && ab.type !== 'selfRepair') continue;
      if ('interval' in ab) {
        e.abilityTimers[i] -= dt;
        if (e.abilityTimers[i] > 0) continue;
        e.abilityTimers[i] = ab.interval;
      }
      switch (ab.type) {
        case 'heal': {
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
        case 'summon':
          for (let k = 0; k < ab.count; k++) {
            const a = random() * Math.PI * 2;
            this.spawnEnemy(ab.kind, false, e.x + Math.cos(a) * (e.size + 12), e.y + Math.sin(a) * (e.size + 12), 0);
          }
          this.visuals.blast(e.x, e.y, e.size * 2, '#ff4040', 0.5);
          break;
        case 'blast':
          this.damageBunker(ab.damage, ab.attack);
          this.visuals.beam(e.x, e.y, 0, 0, '#ff3355', 5, false, 0.3);
          this.visuals.blast(0, 0, gameConfig.bunkerBodyRadius + 10, '#ff3355', 0.35);
          break;
        case 'suppress':
          this.bunker.suppressT = ab.duration;
          this.bunker.suppressFactor = ab.rateFactor;
          this.visuals.blast(0, 0, 160, '#b04dff', 0.7);
          break;
        case 'jamCoil': {
          const installed = [0, 1].filter((k) => this.coilAt(k));
          if (installed.length) {
            const k = installed[Math.floor(random() * installed.length)];
            this.bunker.coils[k].jamT = ab.duration;
            this.visuals.beam(e.x, e.y, 0, 0, '#5fe08a', 3, true, 0.4);
          }
          break;
        }
        case 'heatWave':
          this.bunker.heat += ab.heat;
          this.visuals.blast(0, 0, 120, '#ff8a3d', 0.6);
          break;
        case 'armorUp':
          e.status.armorUpT = ab.duration;
          e.status.armorUpP = ab.armor;
          this.visuals.blast(e.x, e.y, e.size * 1.6, '#c9c2b6', 0.5);
          break;
        case 'selfRepair':
          if (e.hp < e.maxHp * ab.belowHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * ab.percentPerSec * dt);
          break;
        default:
          break;
      }
    }
  }

  // ───────────────────────── Катушки ─────────────────────────

  private updateCoils(dt: number): void {
    const b = this.bunker;
    const s = this.stats;
    const cool = b.heat < s.heatCap * gameConfig.overdriveBelow;
    const rateMult = b.suppressFactor * (cool ? 1 + s.overdrive : 1);
    for (let i = 0; i < 2; i++) {
      const c = this.coilAt(i);
      const rt = b.coils[i];
      if (!c) {
        rt.blocked = null;
        continue;
      }
      if (rt.timer < c.interval) rt.timer += dt * rateMult;
      if (rt.timer < c.interval) {
        rt.blocked = null;
        continue;
      }
      if (rt.jamT > 0) {
        rt.blocked = 'jammed';
        continue;
      }
      const targets = this.findTargets(c, i);
      if (targets.length === 0) {
        rt.blocked = 'target';
        rt.idle += dt;
        continue;
      }
      if (b.overheated) {
        rt.blocked = 'heat';
        continue;
      }
      if (b.energy < c.energyPerPulse) {
        rt.blocked = 'energy';
        continue;
      }
      rt.blocked = null;
      this.fireCoil(i, c, targets);
      rt.timer -= c.interval;
      if (rt.timer > c.interval) rt.timer = 0;
      rt.idle = 0;
    }
  }

  private findTargets(c: CoilStats, index: number): Enemy[] {
    const out: Enemy[] = [];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x, e.y) - e.size <= c.radius) out.push(e);
    }
    if (modeConfig[c.mode].area) return out;
    const rt = this.bunker.coils[index];
    if (!out.length) {
      rt.lockId = null;
      return out;
    }
    // Одиночный разряд не меняет цель, пока она жива и в радиусе.
    const locked = rt.lockId != null ? out.find((e) => e.id === rt.lockId) : undefined;
    if (locked) return [locked];
    // Новая цель: сначала те, кто уже бьёт бункер, среди них — самая прочная.
    let best = out[0];
    const score = (e: Enemy) => (e.attacking ? 1e12 : 0) + e.hp + e.shield;
    for (const e of out) if (score(e) > score(best)) best = e;
    rt.lockId = best.id;
    return [best];
  }

  private fireCoil(index: number, c: CoilStats, targets: Enemy[]): void {
    const s = this.stats;
    const b = this.bunker;
    const rt = b.coils[index];
    const charge = s.capacity > 0 ? b.energy / s.capacity : 0;
    let power = c.power * (1 + s.dischargeBonus * charge);
    if (s.firstPulseBonus > 0 && rt.idle >= FIRST_PULSE_IDLE) power *= 1 + s.firstPulseBonus;
    const crit = chance(s.critChance);
    if (crit) power *= s.critMultiplier;
    const md = modeConfig[c.mode];
    if (md.area) {
      // Импульс по площади рассеивается: чем больше целей, тем слабее по каждой.
      power *= Math.max(gameConfig.areaSpreadMin, 1 - gameConfig.areaSpreadPerTarget * (targets.length - 1));
    } else if (targets[0]) {
      // Точечный разряд набирает фокус на одной цели.
      rt.focus = rt.focusId === targets[0].id ? Math.min(gameConfig.focusMaxStacks, (rt.focus ?? 0) + 1) : 0;
      rt.focusId = targets[0].id;
      power *= 1 + gameConfig.focusPerStack * rt.focus;
    }
    b.energy -= c.energyPerPulse;
    b.heat += c.heatPerPulse;
    this.run.pulses++;
    const mode = modeConfig[c.mode];

    if (mode.area) this.visuals.ring(c.radius, crit, false, mode.color);
    else this.visuals.beam(0, 0, targets[0].x, targets[0].y, mode.color, 4, true, 0.22);
    this.emit({ type: 'pulse', coil: index, crit });

    const opts = {
      identifiedBonus: s.identifiedBonus + s.markBonus,
      electronicsBonus: c.unique?.kind === 'electronics' ? c.unique.value : 0,
      shieldStrip: c.unique?.kind === 'shieldStrip' ? c.unique.value : 0,
    };
    for (const e of targets) {
      if (!e.alive) continue;
      const r = applyCoilHit(e, power, c.mode, opts);
      this.recordDamage(e, r.dealt, c.mode);
      e.pendingDamage = r.dealt;
      e.pendingCrit = crit;
      this.showNumber(e, crit ? '#ffd24a' : mode.color);
      if (r.killed) {
        this.killEnemy(e);
        continue;
      }
      this.applyEffects(e, c, power, opts);
    }
  }

  private applyEffects(e: Enemy, c: CoilStats, power: number, opts: { identifiedBonus: number }): void {
    const st = e.status;
    for (const f of c.effects) {
      if (!e.alive) return;
      if (f.electronicOnly && !e.electronic) continue;
      if (!chance(f.chance)) continue;
      const cfg = effectConfig[f.kind];
      switch (f.kind) {
        case 'stun':
          if (e.isBoss) continue;
          st.stunT = cfg.duration;
          break;
        case 'slow':
          st.slowT = cfg.duration;
          st.slowP = e.isBoss ? cfg.power * 0.4 : cfg.power;
          break;
        case 'burn': {
          const dps = power * cfg.power;
          st.burnDps = st.burnT > 0 ? Math.max(st.burnDps, dps) : dps;
          st.burnT = cfg.duration;
          break;
        }
        case 'jam':
          st.jamT = e.isBoss ? cfg.duration * 0.4 : cfg.duration;
          break;
        case 'shieldBreak':
          st.shieldBreakT = cfg.duration;
          break;
        case 'armorBreak':
          st.armorBreakT = cfg.duration;
          st.armorBreakP = cfg.power;
          break;
        case 'chain':
          this.chain(e, power * cfg.power, c.mode, opts);
          break;
      }
      this.run.effectProcs[f.kind] = (this.run.effectProcs[f.kind] ?? 0) + 1;
    }
  }

  private chain(from: Enemy, dmg: number, mode: CoilMode, opts: { identifiedBonus: number }): void {
    const hit = new Set<number>([from.id]);
    let cur = from;
    const r2 = chainConfig.jumpRange * chainConfig.jumpRange;
    for (let j = 0; j < chainConfig.jumps; j++) {
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const o of this.enemies) {
        if (!o.alive || hit.has(o.id)) continue;
        const d2 = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2;
        if (d2 < r2 && d2 < bestD) {
          best = o;
          bestD = d2;
        }
      }
      if (!best) return;
      hit.add(best.id);
      this.visuals.beam(cur.x, cur.y, best.x, best.y, '#9fe8ff', 2, true, 0.2);
      const r = applyCoilHit(best, dmg, mode, opts);
      this.recordDamage(best, r.dealt, mode);
      best.pendingDamage = r.dealt;
      best.pendingCrit = false;
      this.showNumber(best, '#9fe8ff');
      if (r.killed) this.killEnemy(best);
      cur = best;
    }
  }

  private showNumber(e: Enemy, color: string): void {
    if (e.pendingDamage < 0.5) return;
    this.visuals.number(e.x, e.y - e.size - 4, Math.round(e.pendingDamage), e.pendingCrit, color);
    e.pendingDamage = 0;
  }

  private recordDamage(e: Enemy, dealt: number, mode: CoilMode | 'dot'): void {
    if (dealt <= 0) return;
    this.run.damageDealt += dealt;
    this.run.damageByMode[mode] += dealt;
    this.run.damageByEnemy[e.kind] = (this.run.damageByEnemy[e.kind] ?? 0) + dealt;
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

  /** Робот покинул поле (уничтожен или подорвался) — учёт группы. */
  private onEnemyGone(e: Enemy): void {
    if (!e.groupId) return;
    const left = (this.groupAlive.get(e.groupId) ?? 1) - 1;
    if (left > 0) {
      this.groupAlive.set(e.groupId, left);
      return;
    }
    this.groupAlive.delete(e.groupId);
    this.run.groupsCleared++;
    const sp = balanceConfig.spawn;
    this.threat = Math.min(sp.threatMax, this.threat + sp.threatPerGroup);
    this.bunker.hp = Math.min(this.stats.maxHp, this.bunker.hp + this.stats.maxHp * balanceConfig.groupRepair);
    this.emit({ type: 'groupCleared', groupId: e.groupId });
  }

  private killEnemy(e: Enemy): void {
    e.alive = false;
    e.hp = 0;
    const r = this.run;
    const s = this.stats;
    r.kills++;
    r.killsByKind[e.kind] = (r.killsByKind[e.kind] ?? 0) + 1;
    if (e.elite) r.eliteKills++;
    if (e.isMiniboss) r.minibossKills++;

    const big = e.isBoss || e.isMiniboss;
    this.visuals.burst(e.x, e.y, e.elite ? '#ffd24a' : '#9aa4ad', big ? 50 : 10, big ? 180 : 90, big ? 4 : 2.5, big ? 1 : 0.5);
    this.visuals.burst(e.x, e.y, '#ff9a3c', big ? 30 : 5, big ? 120 : 60, 2, 0.4);

    if (s.killEnergy > 0) this.bunker.energy = Math.min(s.capacity, this.bunker.energy + s.killEnergy);
    if (s.coolOnKill > 0) this.bunker.heat = Math.max(0, this.bunker.heat - s.coolOnKill);

    if (e.isBoss) {
      this.onBossKilled(e);
      return;
    }

    const { decay } = this.rewardProvider();
    const loot = rollEnemyLoot(e, {
      location: this.location,
      decay,
      dropChanceMult: s.dropChanceMult,
      coinMult: s.coinMult,
    });
    this.addLoot(loot, e.x, e.y);
    const xp = e.xp * decay * s.xpMult;
    r.xp += xp;
    this.emit({ type: 'kill', enemy: e, loot, xp });
    this.onEnemyGone(e);
  }

  /** Учёт награды в статистике боя и визуализация выпадения. */
  addLoot(loot: Loot, x = 0, y = 0): void {
    for (const k of RESOURCE_KEYS) this.run.resources[k] += loot.resources[k] ?? 0;
    this.run.parts += loot.parts.length;
    for (const it of loot.items) {
      this.run.items.push(it);
      this.recentDrops.unshift(it);
      this.visuals.lootFly(x, y, it.rarity);
    }
    if (this.recentDrops.length > 5) this.recentDrops.length = 5;
  }

  /** Выйти из боя с боссом: босс уходит, обычный бой продолжается. */
  retreatFromBoss(): boolean {
    if (this.mode !== 'boss' || this.state !== 'running') return false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.alive = false;
      this.visuals.burst(e.x, e.y, '#6b7680', 6, 50, 2, 0.5);
    }
    this.groupAlive.clear();
    this.mode = 'normal';
    this.bossId = null;
    this.resumeTimer = 3;
    this.groupTimer = 0;
    this.emit({ type: 'bossRetreat' });
    return true;
  }

  /** Сдаться (завершить попытку вручную). */
  surrender(): void {
    if (this.state !== 'running') return;
    this.bunker.hp = 0;
    this.state = 'defeat';
    this.emit({ type: 'defeat', duringBoss: this.mode === 'boss' });
  }
}
