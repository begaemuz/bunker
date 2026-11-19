import { balanceConfig } from '../config/balanceConfig';
import { extraStatPools, itemTemplates, type ItemTemplate, type StatRange } from '../config/itemsConfig';
import { pickWeighted, randFloat, randInt, chance, uid, random } from '../rng';
import type { EquipCategory, Item, ItemSlot, ItemSource, Rarity, StatMod } from '../types';
import { isIntegerStat } from './statInfo';

export function getTemplate(id: string): ItemTemplate {
  const t = itemTemplates.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown item template ${id}`);
  return t;
}

function roundStat(stat: StatMod['stat'], v: number): number {
  if (isIntegerStat(stat)) return Math.round(v);
  if (Math.abs(v) < 2) return Math.round(v * 1000) / 1000;
  return Math.round(v * 10) / 10;
}

function rollRange(r: StatRange, mult: number): StatMod {
  // Для количества слотов эффектов не масштабируем по редкости.
  const m = r.stat === 'effectSlots' ? 1 : mult;
  return { stat: r.stat, value: roundStat(r.stat, randFloat(r.min, r.max) * m) };
}

export interface GenerateOptions {
  templateId?: string;
  category?: EquipCategory;
  rarity: Rarity;
  source: ItemSource;
}

/** Создаёт уникальный экземпляр предмета со случайными характеристиками. */
export function generateItem(opts: GenerateOptions): Item {
  const pool = opts.category ? itemTemplates.filter((t) => t.category === opts.category) : itemTemplates;
  const tpl = opts.templateId ? getTemplate(opts.templateId) : pickWeighted(pool, (t) => t.weight);
  const rarity = opts.rarity;
  const mult = balanceConfig.rarityStatMult[rarity] * randFloat(0.95, 1.05);

  const baseStats = tpl.base.map((r) => rollRange(r, mult));

  // Дополнительные свойства — без повторов и без дублирования базовых.
  const [minExtra, maxExtra] = balanceConfig.rarityExtraCount[rarity];
  const extraCount = randInt(minExtra, maxExtra);
  const used = new Set(baseStats.map((s) => s.stat));
  const candidates = extraStatPools[tpl.category].filter((r) => !used.has(r.stat));
  const extraStats: StatMod[] = [];
  for (let i = 0; i < extraCount && candidates.length > 0; i++) {
    const idx = Math.floor(random() * candidates.length);
    const r = candidates.splice(idx, 1)[0];
    extraStats.push(rollRange(r, Math.sqrt(mult)));
  }

  const [minSlots, maxSlots] = balanceConfig.raritySlots[rarity];
  const slotCount = randInt(minSlots, maxSlots);
  const slots: ItemSlot[] = [];
  for (let i = 0; i < slotCount; i++) {
    // Первый слот у редких и выше всегда открыт.
    const canLock = !(i === 0 && rarity !== 'common' && rarity !== 'uncommon');
    slots.push({ locked: canLock && chance(balanceConfig.lockedSlotChance), partId: null });
  }

  const [eMin, eMax] = tpl.energyCost;
  const energyCost =
    eMax > 0 ? Math.round(randFloat(eMin, eMax) * balanceConfig.rarityEnergyMult[rarity] * 10) / 10 : 0;

  return {
    id: uid(),
    templateId: tpl.id,
    name: tpl.name,
    category: tpl.category,
    rarity,
    level: 1,
    maxLevel: balanceConfig.item.startMaxLevel,
    baseStats,
    extraStats,
    slots,
    energyCost,
    obtainedAt: Date.now(),
    source: opts.source,
  };
}

/** Итоговые модификаторы предмета с учётом уровня. */
export function itemModifiers(item: Item): StatMod[] {
  const lvlMult = 1 + balanceConfig.item.statPerLevel * (item.level - 1);
  const base = item.baseStats.map((s) => ({
    stat: s.stat,
    value: s.stat === 'effectSlots' ? s.value : s.value * lvlMult,
  }));
  return [...base, ...item.extraStats];
}

export function sellPrice(item: Item): number {
  const s = balanceConfig.sell;
  return Math.round(s.base * s.rarityMult[item.rarity] * (1 + s.perLevel * (item.level - 1)));
}
