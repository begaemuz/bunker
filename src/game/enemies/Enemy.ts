import { balanceConfig } from '../config/balanceConfig';
import { eliteConfig, enemiesConfig, type EnemyAbility, type EnemyDef, type EnemyKind } from '../config/enemiesConfig';
import type { DamageType } from '../types';
import { random } from '../rng';

export interface EnemyStatus {
  slowT: number;
  slowP: number;
  freezeT: number;
  stunT: number;
  burnT: number;
  burnDps: number;
  shockT: number;
  shockP: number;
  corrosionT: number;
  corrosionP: number;
  armorBreakT: number;
  armorBreakP: number;
}

export interface Enemy {
  id: number;
  alive: boolean;
  def: EnemyDef;
  kind: EnemyKind;
  elite: boolean;
  isBoss: boolean;
  isMiniboss: boolean;
  wave: number;
  x: number;
  y: number;
  /** Смещение траектории, чтобы роботы не шли одной линией. */
  laneOffset: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldDelay: number;
  armor: number;
  /** Бонус брони от аур поддержки (пересчитывается). */
  auraArmor: number;
  speed: number;
  damage: number;
  attackTimer: number;
  range: number;
  damageType: DamageType;
  resist: Partial<Record<DamageType, number>>;
  size: number;
  xp: number;
  dropMult: number;
  coinMult: number;
  abilities: EnemyAbility[];
  abilityTimers: number[];
  status: EnemyStatus;
  /** Визуальное: вспышка попадания, фаза анимации. */
  hitFlash: number;
  anim: number;
  attacking: boolean;
  /** Урон за текущий импульс (для одного числа над роботом). */
  pendingDamage: number;
  pendingCrit: boolean;
}

export function emptyStatus(): EnemyStatus {
  return {
    slowT: 0,
    slowP: 0,
    freezeT: 0,
    stunT: 0,
    burnT: 0,
    burnDps: 0,
    shockT: 0,
    shockP: 0,
    corrosionT: 0,
    corrosionP: 0,
    armorBreakT: 0,
    armorBreakP: 0,
  };
}

export interface ScalingContext {
  wave: number;
  mapDifficulty: number;
}

export function waveHpMult(wave: number): number {
  const w = balanceConfig.waves;
  const n = wave - 1;
  return 1 + w.hpLinear * n + w.hpQuad * n * n;
}

export function waveRewardMult(wave: number): number {
  return 1 + balanceConfig.waves.rewardPerWave * (wave - 1);
}

let nextId = 1;

/** Создаёт робота с учётом волны, карты и элитности. */
export function createEnemy(kind: EnemyKind, ctx: ScalingContext, elite: boolean, x: number, y: number): Enemy {
  const def = enemiesConfig[kind];
  const w = balanceConfig.waves;
  const n = ctx.wave - 1;
  const d = ctx.mapDifficulty;
  const isBoss = kind === 'boss';
  const isMiniboss = kind === 'miniboss';
  // Боссы масштабируются мягче — их базовые значения уже рассчитаны на свою волну.
  const hpMult = (isBoss ? 1 : waveHpMult(ctx.wave)) * d * (elite ? eliteConfig.hpMult : 1);
  const dmgMult = (isBoss ? 1 : 1 + w.damagePerWave * n) * d * (elite ? eliteConfig.damageMult : 1);
  const armor = def.armor + (isBoss ? 0 : w.armorPerWave * n) + (elite ? eliteConfig.armorAdd : 0);
  const speedMult = (isBoss ? 1 : 1 + w.speedPerWave * n) * (elite ? eliteConfig.speedMult : 1);

  const abilities = [...def.abilities];
  if (elite) abilities.push(eliteConfig.shield);

  const maxHp = Math.round(def.hp * hpMult);
  const shieldAb = abilities.find((a) => a.type === 'shield');
  const maxShield = shieldAb && shieldAb.type === 'shield' ? Math.round(maxHp * shieldAb.percent) : 0;

  return {
    id: nextId++,
    alive: true,
    def,
    kind,
    elite,
    isBoss,
    isMiniboss,
    wave: ctx.wave,
    x,
    y,
    laneOffset: (random() - 0.5) * 2,
    hp: maxHp,
    maxHp,
    shield: maxShield,
    maxShield,
    shieldDelay: 0,
    armor,
    auraArmor: 0,
    speed: def.speed * speedMult,
    damage: def.damage * dmgMult,
    attackTimer: def.attackInterval * random(),
    range: def.range,
    damageType: def.damageType,
    resist: def.resist,
    size: def.size * (elite ? 1.2 : 1),
    xp: def.xp * (elite ? eliteConfig.xpMult : 1) * waveRewardMult(ctx.wave),
    dropMult: elite ? eliteConfig.dropMult : 1,
    coinMult: (elite ? eliteConfig.coinMult : 1) * waveRewardMult(ctx.wave) * d,
    abilities,
    abilityTimers: abilities.map((a) => ('interval' in a ? a.interval * (0.5 + random() * 0.5) : 0)),
    status: emptyStatus(),
    hitFlash: 0,
    anim: random() * 10,
    attacking: false,
    pendingDamage: 0,
    pendingCrit: false,
  };
}
