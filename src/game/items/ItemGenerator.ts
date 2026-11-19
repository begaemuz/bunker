import { balanceConfig } from '../config/balanceConfig';
import { gameConfig } from '../config/gameConfig';
import { extraStatPools, itemTemplates, type ItemTemplate, type StatRange } from '../config/itemsConfig';
import { pickWeighted, randFloat, randInt, chance, uid, random } from '../rng';
import type { CoilProps, EquipCategory, Item, ItemSlot, ItemSource, Rarity, StatKey, StatMod } from '../types';
import { rarityIndex } from './ItemRarity';
import { isDrawback, isFlatScaling } from './statInfo';

export function getTemplate(id: string): ItemTemplate {
  const t = itemTemplates.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown item template ${id}`);
  return t;
}

function round(stat: StatKey, v: number): number {
  if (stat === 'conversion') return Math.round(v * 1000) / 1000;
  if (Math.abs(v) < 2) return Math.round(v * 1000) / 1000;
  return Math.round(v * 10) / 10;
}

/** Масштабирование характеристики по редкости и технологическому уровню. */
function scaleStat(stat: StatKey, raw: number, rarity: Rarity, tier: number): number {
  const idx = rarityIndex(rarity);
  if (stat === 'conversion') {
    return Math.min(0.97, raw + (0.95 - raw) * 0.2 * idx + 0.01 * (tier - 1));
  }
  if (isDrawback(stat, raw)) return raw;
  if (isFlatScaling(stat)) {
    return raw * balanceConfig.rarityStatMult[rarity] * (1 + balanceConfig.tier.statPerTier * (tier - 1));
  }
  if (stat === 'detectRange') return raw * (1 + 0.05 * idx);
  return raw * (1 + 0.15 * idx) * (1 + 0.05 * (tier - 1));
}

function rollRange(r: StatRange, rarity: Rarity, tier: number): StatMod {
  return { stat: r.stat, value: round(r.stat, scaleStat(r.stat, randFloat(r.min, r.max), rarity, tier)) };
}

export interface GenerateOptions {
  templateId?: string;
  category?: EquipCategory;
  rarity: Rarity;
  tier: number;
  source: ItemSource;
}

/** Создаёт уникальный экземпляр предмета со случайными характеристиками. */
export function generateItem(opts: GenerateOptions): Item {
  const pool = itemTemplates.filter((t) => t.weight > 0 && (!opts.category || t.category === opts.category));
  const tpl = opts.templateId ? getTemplate(opts.templateId) : pickWeighted(pool, (t) => t.weight);
  const rarity = tpl.unique ? 'unique' : opts.rarity;
  const tier = Math.max(1, opts.tier);
  const idx = rarityIndex(rarity);
  const costMult = balanceConfig.rarityCostMult[rarity] * (1 + balanceConfig.tier.costPerTier * (tier - 1));

  const baseStats = tpl.base.map((r) => rollRange(r, rarity, tier));

  let coil: CoilProps | undefined;
  if (tpl.coil) {
    const c = tpl.coil;
    const pMult = balanceConfig.rarityStatMult[rarity] * (1 + balanceConfig.tier.coilPowerPerTier * (tier - 1));
    coil = {
      mode: c.mode,
      power: Math.round(randFloat(c.power[0], c.power[1]) * pMult * 10) / 10,
      radius: Math.round(randFloat(c.radius[0], c.radius[1]) * (1 + 0.05 * idx)),
      interval: Math.round(randFloat(c.interval[0], c.interval[1]) * (1 - 0.035 * idx) * 100) / 100,
      energyPerPulse: Math.round(randFloat(c.energy[0], c.energy[1]) * costMult * 10) / 10,
      heatPerPulse: Math.round(randFloat(c.heat[0], c.heat[1]) * balanceConfig.rarityCostMult[rarity] * 10) / 10,
    };
  }

  const [minExtra, maxExtra] = balanceConfig.rarityExtraCount[rarity];
  const extraCount = randInt(minExtra, maxExtra);
  const used = new Set(baseStats.map((s) => s.stat));
  const candidates = extraStatPools[tpl.category].filter((r) => !used.has(r.stat));
  const extraStats: StatMod[] = [];
  for (let i = 0; i < extraCount && candidates.length > 0; i++) {
    const k = Math.floor(random() * candidates.length);
    extraStats.push(rollRange(candidates.splice(k, 1)[0], rarity, tier));
  }

  const [minSlots, maxSlots] = balanceConfig.raritySlots[rarity];
  const slotCount = randInt(minSlots, maxSlots);
  const slots: ItemSlot[] = [];
  for (let i = 0; i < slotCount; i++) {
    const canLock = !(i === 0 && idx >= 2);
    slots.push({ locked: canLock && chance(balanceConfig.lockedSlotChance), partId: null });
  }

  const [eMin, eMax] = tpl.energyCost;
  const energyCost = eMax > 0 ? Math.round(randFloat(eMin, eMax) * costMult * 10) / 10 : 0;

  return {
    id: uid(),
    templateId: tpl.id,
    name: tpl.name,
    category: tpl.category,
    rarity,
    tier,
    level: 1,
    maxLevel: balanceConfig.item.startMaxLevel,
    baseStats,
    extraStats,
    coil,
    unique: tpl.unique ? { ...tpl.unique } : undefined,
    slots,
    energyCost,
    description: tpl.description,
    obtainedAt: Date.now(),
    source: opts.source,
  };
}

function levelMult(stat: StatKey, value: number, level: number): number {
  const n = level - 1;
  if (n <= 0 || isDrawback(stat, value)) return value;
  if (stat === 'conversion') return Math.min(gameConfig.maxConversion, value + 0.005 * n);
  const per = balanceConfig.item.statPerLevel;
  return isFlatScaling(stat) ? value * (1 + per * n) : value * (1 + per * 0.5 * n);
}

/** Итоговые модификаторы предмета с учётом уровня улучшения. */
export function itemModifiers(item: Item): StatMod[] {
  const base = item.baseStats.map((s) => ({ stat: s.stat, value: levelMult(s.stat, s.value, item.level) }));
  return [...base, ...item.extraStats];
}

/** Параметры катушки с учётом уровня улучшения. */
export function coilProps(item: Item): CoilProps | null {
  if (!item.coil) return null;
  const n = item.level - 1;
  const c = item.coil;
  return {
    ...c,
    power: c.power * (1 + balanceConfig.item.statPerLevel * n),
    radius: c.radius * (1 + 0.01 * n),
    interval: c.interval * (1 - 0.01 * n),
  };
}

export function sellPrice(item: Item): number {
  const s = balanceConfig.sell;
  return Math.round(s.base * s.rarityMult[item.rarity] * (1 + s.perLevel * (item.level - 1)) * (1 + s.perTier * (item.tier - 1)));
}
