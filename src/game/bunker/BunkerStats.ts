import { balanceConfig } from '../config/balanceConfig';
import { gameConfig } from '../config/gameConfig';
import { itemModifiers } from '../items/ItemGenerator';
import { equippedItems, type Profile } from '../profile/Profile';
import {
  DAMAGE_TYPES,
  EFFECT_KINDS,
  type DamageType,
  type EffectKind,
  type Item,
  type StatKey,
} from '../types';

export interface DamageComponent {
  type: DamageType;
  /** Доля от урона импульса. Основной компонент = 1. */
  mult: number;
}

export interface ActiveEffect {
  kind: EffectKind;
  chance: number;
}

export interface EnergyInfo {
  generation: number;
  consumption: number;
  batteryCap: number;
  /** Баланс (выработка − потребление). */
  balance: number;
}

export interface BunkerStats {
  maxHp: number;
  regen: number;
  radius: number;
  damage: number;
  pulseRate: number;
  critChance: number;
  critMultiplier: number;
  effectPower: number;
  effectSlots: number;
  components: DamageComponent[];
  effects: ActiveEffect[];
  /** Эффекты, не поместившиеся в лимит слотов эффектов. */
  inactiveEffects: ActiveEffect[];
  resist: Record<DamageType, number>;
  energy: EnergyInfo;
  /** Эффективность модулей с учётом энергии (0..1). */
  efficiency: number;
  dropChanceMult: number;
  coinMult: number;
  level: number;
  /** DPS по одной цели (без эффектов и крита). */
  singleTargetDps: number;
}

type Sums = Map<StatKey, number>;

function sumMods(items: Item[], factor: number): Sums {
  const sums: Sums = new Map();
  for (const it of items) {
    for (const m of itemModifiers(it)) {
      // Энергетические показатели не зависят от эффективности (иначе — замкнутый круг).
      const energyStat = m.stat === 'energyGen' || m.stat === 'energyUsePct' || m.stat === 'batteryCap';
      const v = energyStat ? m.value : m.value * factor;
      sums.set(m.stat, (sums.get(m.stat) ?? 0) + v);
    }
  }
  return sums;
}

export function computeEnergy(items: Item[]): EnergyInfo {
  const b = gameConfig.bunkerBase;
  let gen = b.energyGen;
  let usePct = 0;
  let cost = 0;
  let battery = b.batteryCap;
  for (const it of items) {
    cost += it.energyCost;
    for (const m of itemModifiers(it)) {
      if (m.stat === 'energyGen') gen += m.value;
      else if (m.stat === 'energyUsePct') usePct += m.value;
      else if (m.stat === 'batteryCap') battery += m.value;
    }
  }
  const consumption = (b.energyUse + cost) * Math.max(0.3, 1 + usePct);
  return {
    generation: round1(gen),
    consumption: round1(consumption),
    batteryCap: Math.round(battery),
    balance: round1(gen - consumption),
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Рассчитывает итоговые характеристики бункера.
 * @param efficiency эффективность модулей (0..1). При дефиците энергии
 *   снижаются только бонусы оборудования — ядро бункера работает всегда.
 */
export function computeBunkerStats(profile: Profile, efficiency = 1, itemsOverride?: Item[]): BunkerStats {
  const b = gameConfig.bunkerBase;
  const items = itemsOverride ?? equippedItems(profile);
  const s = sumMods(items, efficiency);
  const g = (k: StatKey) => s.get(k) ?? 0;

  const lvl = profile.bunker.level;
  const lvlBonus = balanceConfig.xp.perLevel;
  const levelDmg = lvlBonus.damagePct * (lvl - 1);
  const levelHp = lvlBonus.hpPct * (lvl - 1);

  const maxHp = Math.round((b.maxHp + g('hpFlat')) * (1 + g('hpPct') + levelHp));
  const damage = (b.damage + g('damageFlat')) * (1 + g('damagePct') + levelDmg);
  const radius = Math.min(gameConfig.maxRadius, (b.radius + g('radiusFlat')) * (1 + g('radiusPct')));
  const pulseRate = Math.min(gameConfig.maxPulseRate, b.pulseRate * (1 + g('ratePct')));

  const components: DamageComponent[] = [{ type: b.primaryDamageType, mult: 1 }];
  for (const t of DAMAGE_TYPES) {
    const v = g(`extra:${t}`);
    if (v > 0) {
      const existing = components.find((c) => c.type === t);
      if (existing) existing.mult += v;
      else components.push({ type: t, mult: v });
    }
  }

  const effectSlots = Math.max(0, Math.round(b.effectSlots + g('effectSlots')));
  const allEffects: ActiveEffect[] = EFFECT_KINDS.map((k) => ({ kind: k, chance: Math.min(1, g(`chance:${k}`)) }))
    .filter((e) => e.chance > 0)
    .sort((a, b2) => b2.chance - a.chance);

  const resist = Object.fromEntries(
    DAMAGE_TYPES.map((t) => [t, Math.min(gameConfig.maxResist, (b.resist[t] ?? 0) + g(`resist:${t}`))]),
  ) as Record<DamageType, number>;

  const totalMult = components.reduce((a, c) => a + c.mult, 0);

  return {
    maxHp,
    regen: b.regen + g('regenFlat'),
    radius,
    damage,
    pulseRate,
    critChance: Math.min(0.75, b.critChance + g('critChance')),
    critMultiplier: b.critMultiplier + g('critDamage'),
    effectPower: 1 + g('effectPower'),
    effectSlots,
    components,
    effects: allEffects.slice(0, effectSlots),
    inactiveEffects: allEffects.slice(effectSlots),
    resist,
    energy: computeEnergy(items),
    efficiency,
    dropChanceMult: 1 + g('dropChancePct'),
    coinMult: 1 + g('coinPct'),
    level: lvl,
    singleTargetDps: damage * totalMult * pulseRate,
  };
}
