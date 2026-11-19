import { balanceConfig } from '../config/balanceConfig';
import { bossesConfig } from '../config/bossesConfig';
import { eliteConfig, robotsConfig, type EnemyAbility, type EnemyDef, type EnemyKind } from '../config/enemiesConfig';
import type { AttackType, CoilMode } from '../types';
import { random } from '../rng';

export interface EnemyStatus {
  stunT: number;
  slowT: number;
  slowP: number;
  burnT: number;
  burnDps: number;
  jamT: number;
  shieldBreakT: number;
  armorBreakT: number;
  armorBreakP: number;
  armorUpT: number;
  armorUpP: number;
}

export interface Enemy {
  id: number;
  alive: boolean;
  def: EnemyDef;
  kind: EnemyKind;
  elite: boolean;
  isBoss: boolean;
  isMiniboss: boolean;
  /** Группа, с которой робот пришёл (для прогресса до босса). */
  groupId: number;
  x: number;
  y: number;
  laneOffset: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldDelay: number;
  armor: number;
  auraArmor: number;
  speed: number;
  damage: number;
  attackTimer: number;
  range: number;
  attack: AttackType;
  resist: Partial<Record<CoilMode, number>>;
  electronic: boolean;
  heavyFrame: boolean;
  size: number;
  xp: number;
  dropMult: number;
  coinMult: number;
  abilities: EnemyAbility[];
  abilityTimers: number[];
  status: EnemyStatus;
  /** Время в зоне обнаружения сенсоров; цель опознана, когда превысит порог. */
  scanT: number;
  identified: boolean;
  hitFlash: number;
  anim: number;
  attacking: boolean;
  pendingDamage: number;
  pendingCrit: boolean;
}

export function emptyStatus(): EnemyStatus {
  return {
    stunT: 0,
    slowT: 0,
    slowP: 0,
    burnT: 0,
    burnDps: 0,
    jamT: 0,
    shieldBreakT: 0,
    armorBreakT: 0,
    armorBreakP: 0,
    armorUpT: 0,
    armorUpP: 0,
  };
}

export interface ScalingContext {
  tier: number;
  /** Рост угрозы на локации (0..threatMax). */
  threat: number;
}

export function tierHpMult(tier: number): number {
  return Math.pow(balanceConfig.scaling.hpPerTier, tier - 1);
}

export function getEnemyDef(kind: EnemyKind): EnemyDef {
  if (kind.startsWith('boss:')) return bossesConfig[kind.slice(5)];
  return robotsConfig[kind as keyof typeof robotsConfig];
}

let nextId = 1;

/** Создаёт противника с учётом уровня локации, угрозы и элитности. */
export function createEnemy(kind: EnemyKind, ctx: ScalingContext, elite: boolean, x: number, y: number, groupId = 0): Enemy {
  const def = getEnemyDef(kind);
  const s = balanceConfig.scaling;
  const isBoss = kind.startsWith('boss:');
  const isMiniboss = kind === 'miniboss';
  const t = ctx.tier - 1;
  // Боссы заданы под свою локацию и не масштабируются.
  const hpMult = isBoss ? 1 : tierHpMult(ctx.tier) * (1 + s.threatHp * ctx.threat) * (elite ? eliteConfig.hpMult : 1);
  const dmgMult = isBoss ? 1 : Math.pow(s.damagePerTier, t) * (1 + s.threatDamage * ctx.threat) * (elite ? eliteConfig.damageMult : 1);
  const armor = def.armor + (isBoss ? 0 : s.armorPerTier * t) + (elite ? eliteConfig.armorAdd : 0);
  const rewardMult = isBoss ? 1 : Math.pow(s.rewardPerTier, t) * (1 + ctx.threat * 0.5);

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
    groupId,
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
    speed: def.speed * (elite ? eliteConfig.speedMult : 1),
    damage: def.damage * dmgMult,
    attackTimer: def.attackInterval * random(),
    range: def.range,
    attack: def.attack,
    resist: def.resist,
    electronic: def.electronic,
    heavyFrame: def.heavyFrame,
    size: def.size * (elite ? 1.2 : 1),
    xp: def.xp * (elite ? eliteConfig.xpMult : 1) * rewardMult,
    dropMult: elite ? eliteConfig.dropMult : 1,
    coinMult: (elite ? eliteConfig.coinMult : 1) * rewardMult,
    abilities,
    abilityTimers: abilities.map((a) => ('interval' in a ? a.interval * (0.5 + random() * 0.5) : 0)),
    status: emptyStatus(),
    scanT: 0,
    identified: false,
    hitFlash: 0,
    anim: random() * 10,
    attacking: false,
    pendingDamage: 0,
    pendingCrit: false,
  };
}
