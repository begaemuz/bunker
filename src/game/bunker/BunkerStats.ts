import { gameConfig, modeConfig } from '../config/gameConfig';
import { coilProps, itemModifiers } from '../items/ItemGenerator';
import { equippedItems, type Profile } from '../profile/Profile';
import { techStatMods } from '../progression/TechnologyTree';
import {
  ATTACK_TYPES,
  EFFECT_KINDS,
  type AttackType,
  type CoilMode,
  type EffectKind,
  type EquipmentLayout,
  type Item,
  type SlotId,
  type StatKey,
  type UniqueEffect,
} from '../types';

export interface CoilStats {
  slot: 'coil1' | 'coil2';
  itemId: string;
  name: string;
  mode: CoilMode;
  power: number;
  radius: number;
  interval: number;
  energyPerPulse: number;
  heatPerPulse: number;
  /** Шансы эффектов этой катушки (встроенный эффект режима + общие). */
  effects: { kind: EffectKind; chance: number; electronicOnly?: boolean }[];
  unique?: UniqueEffect;
  /** Энергия и тепло в секунду при непрерывной работе. */
  energyPerSec: number;
  heatPerSec: number;
  /** Урон по одной цели в секунду без учёта ограничений. */
  rawDps: number;
}

export type Warning =
  | { kind: 'no_generator' }
  | { kind: 'no_coil' }
  | { kind: 'passive_deficit'; efficiency: number }
  | { kind: 'energy_limit'; factor: number }
  | { kind: 'heat_limit'; factor: number }
  | { kind: 'no_sensor' }
  | { kind: 'second_coil_free' };

export interface BunkerStats {
  // энергия
  generation: number;
  conversion: number;
  usablePower: number;
  passiveDrain: number;
  /** Эффективность пассивных модулей при нехватке энергии. */
  passiveEfficiency: number;
  capacity: number;
  chargeRate: number;
  dischargeBonus: number;
  // катушки
  coils: CoilStats[];
  // тепло
  coolRate: number;
  heatCap: number;
  overdrive: number;
  // сенсоры
  detectRange: number;
  identifyTime: number;
  identifiedBonus: number;
  critChance: number;
  critMultiplier: number;
  markBonus: number;
  // защита
  maxHp: number;
  regen: number;
  damageReduction: number;
  resist: Record<AttackType, number>;
  emergencyRepair: number;
  reflect: number;
  // уникальные свойства комплекса
  firstPulseBonus: number;
  killEnergy: number;
  coolOnKill: number;
  // прочее
  coinMult: number;
  dropChanceMult: number;
  xpMult: number;
  // оценки синергии
  energyFactor: number;
  heatFactor: number;
  /** Устойчивый DPS по одной цели с учётом энергии и нагрева. */
  sustainedDps: number;
  warnings: Warning[];
  level: number;
}

function uniqueValue(items: Item[], kind: UniqueEffect['kind']): number {
  let v = 0;
  for (const it of items) if (it.unique?.kind === kind) v += it.unique.value;
  return v;
}

/**
 * Единая функция расчёта характеристик комплекса. Всё считается из
 * оборудования, его уровней, модификаций и изученных технологий.
 * Ничего из итоговых значений не хранится в сохранении.
 */
export function computeBunkerStats(profile: Profile, layoutOverride?: EquipmentLayout): BunkerStats {
  const b = gameConfig.bunkerBase;
  const p = layoutOverride ? { ...profile, equipment: layoutOverride } : profile;
  const eq = equippedItems(p);
  const items = eq.map((e) => e.item);
  const bySlot = new Map<SlotId, Item>(eq.map((e) => [e.slot, e.item]));

  // Сумма модификаторов предметов (кроме КПД — он не суммируется) и технологий.
  const sums = new Map<StatKey, number>();
  const add = (k: StatKey, v: number) => sums.set(k, (sums.get(k) ?? 0) + v);
  let itemConversion = 0;
  for (const it of items) {
    for (const m of itemModifiers(it)) {
      if (m.stat === 'conversion') itemConversion = Math.max(itemConversion, m.value);
      else add(m.stat, m.value);
    }
  }
  for (const m of techStatMods(profile)) add(m.stat, m.value);
  const g = (k: StatKey) => sums.get(k) ?? 0;

  // ── Энергия ──
  const generation = g('genPower') * (1 + g('genPowerPct'));
  const conversion = Math.min(gameConfig.maxConversion, (itemConversion || b.conversion) + g('conversion'));
  const usablePower = generation * conversion;
  const passiveDrain = items.reduce((s, it) => s + it.energyCost, 0) * Math.max(0.3, 1 + g('drainPct'));
  const passiveEfficiency = passiveDrain > 0 ? Math.min(1, usablePower / passiveDrain) : 1;
  const mb = (1 + g('moduleBonus')) * passiveEfficiency;

  const capacity = (b.capacity + g('capacity')) * (1 + g('capacityPct'));
  const chargeRate = b.chargeRate + g('chargeRate');
  const dischargeBonus = g('dischargeBonus');

  // ── Катушки ──
  const bothCoils = bySlot.has('coil1') && bySlot.has('coil2');
  const dual = bothCoils ? uniqueValue(items, 'dualCoil') : 0;
  const heatMult = Math.max(0.2, 1 + g('heatPct'));
  const coils: CoilStats[] = [];
  for (const slot of ['coil1', 'coil2'] as const) {
    const it = bySlot.get(slot);
    const cp = it ? coilProps(it) : null;
    if (!it || !cp) continue;
    const mode = modeConfig[cp.mode];
    const power = cp.power * (1 + g('coilPowerPct') + g(`mode:${cp.mode}`) + dual);
    const radius = Math.min(gameConfig.maxCoilRadius, cp.radius * (1 + g('coilRadiusPct')));
    const interval = Math.max(gameConfig.minCoilInterval, cp.interval / (1 + g('coilRatePct')));
    const energyPerPulse = cp.energyPerPulse * Math.max(0.3, 1 + g('pulseCostPct'));
    const heatPerPulse = cp.heatPerPulse * heatMult;
    const effects: CoilStats['effects'] = [];
    if (mode.effect) effects.push({ ...mode.effect });
    for (const k of EFFECT_KINDS) {
      const extra = g(`chance:${k}`);
      if (extra <= 0) continue;
      const ex = effects.find((e) => e.kind === k);
      if (ex) ex.chance = Math.min(1, ex.chance + extra);
      else effects.push({ kind: k, chance: Math.min(1, extra) });
    }
    if (it.unique?.kind === 'electronics') {
      const st = effects.find((e) => e.kind === 'stun');
      if (st) st.chance = Math.min(1, st.chance + 0.1);
      else effects.push({ kind: 'stun', chance: 0.1, electronicOnly: true });
    }
    coils.push({
      slot,
      itemId: it.id,
      name: it.name,
      mode: cp.mode,
      power,
      radius,
      interval,
      energyPerPulse,
      heatPerPulse,
      effects,
      unique: it.unique,
      energyPerSec: energyPerPulse / interval,
      heatPerSec: heatPerPulse / interval,
      rawDps: power / interval,
    });
  }

  // ── Тепло ──
  const coolRate = (b.coolRate + g('coolRate')) * (1 + g('coolRatePct')) * mb;
  const heatCap = b.heatCap + g('heatCap');
  const overdrive = g('overdrive');

  // ── Сенсоры ──
  const detectRange = g('detectRange') * passiveEfficiency;
  const identifyTime = b.identifyTime / (1 + g('identifySpeed'));
  const identifiedBonus = g('identifiedBonus') * mb;
  const critChance = Math.min(0.6, g('critChance'));
  const critMultiplier = b.critMultiplier + g('critDamage');
  const markBonus = uniqueValue(items, 'markTargets');

  // ── Защита ──
  const maxHp = Math.round((b.hullHp + g('hullHp') * mb) * (1 + g('hullPct')));
  const regen = b.regen + g('regen') * mb;
  const damageReduction = Math.min(gameConfig.maxDamageReduction, g('damageReduction') * mb);
  const resist = Object.fromEntries(
    ATTACK_TYPES.map((t) => [t, Math.min(gameConfig.maxResist, g(`resist:${t}`) * mb)]),
  ) as Record<AttackType, number>;

  // ── Синергия: хватает ли энергии и охлаждения на катушки ──
  const coilEnergy = coils.reduce((s, c) => s + c.energyPerSec, 0);
  const coilHeat = coils.reduce((s, c) => s + c.heatPerSec, 0);
  const freePower = Math.max(0, usablePower - passiveDrain);
  const chargeLimit = Math.min(freePower, chargeRate);
  const energyFactor = coilEnergy > 0 ? Math.min(1, chargeLimit / coilEnergy) : 1;
  const heatFactor = coilHeat > 0 ? Math.min(1, coolRate / coilHeat) : 1;
  const rawDps = coils.reduce((s, c) => s + c.rawDps, 0);
  const sustainedDps = rawDps * Math.min(energyFactor, heatFactor) * (1 + dischargeBonus * 0.5) * (1 + critChance * (critMultiplier - 1));

  const warnings: Warning[] = [];
  if (generation <= 0) warnings.push({ kind: 'no_generator' });
  if (coils.length === 0) warnings.push({ kind: 'no_coil' });
  if (passiveEfficiency < 1) warnings.push({ kind: 'passive_deficit', efficiency: passiveEfficiency });
  if (coils.length > 0 && energyFactor < 0.98) warnings.push({ kind: 'energy_limit', factor: energyFactor });
  if (coils.length > 0 && heatFactor < 0.98) warnings.push({ kind: 'heat_limit', factor: heatFactor });
  if (!bySlot.has('sensor')) warnings.push({ kind: 'no_sensor' });
  if (coils.length === 1) warnings.push({ kind: 'second_coil_free' });

  return {
    generation,
    conversion,
    usablePower,
    passiveDrain,
    passiveEfficiency,
    capacity,
    chargeRate,
    dischargeBonus,
    coils,
    coolRate,
    heatCap,
    overdrive,
    detectRange,
    identifyTime,
    identifiedBonus,
    critChance,
    critMultiplier,
    markBonus,
    maxHp,
    regen,
    damageReduction,
    resist,
    emergencyRepair: g('emergencyRepair') * mb,
    reflect: uniqueValue(items, 'reflect'),
    firstPulseBonus: uniqueValue(items, 'firstPulse'),
    killEnergy: uniqueValue(items, 'killEnergy'),
    coolOnKill: uniqueValue(items, 'coolOnKill'),
    coinMult: 1 + g('coinPct'),
    dropChanceMult: 1 + g('dropChancePct'),
    xpMult: 1 + g('xpPct'),
    energyFactor,
    heatFactor,
    sustainedDps,
    warnings,
    level: profile.bunker.level,
  };
}
