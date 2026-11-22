// Логика инженера: характеристики за уровни, снаряжение и мастерская.
import { itemQuality } from '../items/ItemGenerator';
import { dropItemParts } from '../items/Parts';
import { rarityIndex } from '../items/ItemRarity';
import { isEquipped, pushHistory, spend, type Profile } from '../profile/Profile';
import { random, uid } from '../rng';
import { RARITIES, type EquipCategory, type Item, type Rarity, type ResourceKey } from '../types';
import { emptyEngineer, ENG_STATS, GEAR_SLOTS, type EngStat, type Gear, type GearKind, type GearSlot, type GearStatKey } from './types';

/** Базовое значение каждой характеристики и очки за каждый новый уровень. */
export const STAT_BASE = 5;
export const POINTS_PER_LEVEL = 5;

/** Уровень инженера — общий уровень игрока (растёт от опыта в боях). */
export function engineerLevel(p: Profile): number {
  return p.bunker.level;
}

export function statPointsTotal(p: Profile): number {
  return Math.max(0, engineerLevel(p) - 1) * POINTS_PER_LEVEL;
}

export function statPointsSpent(p: Profile): number {
  return ENG_STATS.reduce((s, k) => s + p.engineer.points[k], 0);
}

export function statPointsFree(p: Profile): number {
  return statPointsTotal(p) - statPointsSpent(p);
}

export function addStatPoints(p: Profile, stat: EngStat, n = 1): Profile | null {
  const add = Math.min(n, statPointsFree(p));
  if (add <= 0) return null;
  return { ...p, engineer: { ...p.engineer, points: { ...p.engineer.points, [stat]: p.engineer.points[stat] + add } } };
}

/** Сброс характеристик: тратит предмет, все очки возвращаются. */
export function resetStatPoints(p: Profile): Profile | null {
  if (p.resources.statResets < 1 || statPointsSpent(p) === 0) return null;
  return {
    ...p,
    resources: { ...p.resources, statResets: p.resources.statResets - 1 },
    engineer: { ...p.engineer, points: emptyEngineer().points },
  };
}

// ───────────── Снаряжение ─────────────

/** Множитель свойств по редкости. */
const RARITY_MULT = [1, 1.25, 1.55, 1.95, 2.5, 3.2, 4];
/** Рост «плоских» свойств (урон, жизни, броня) с тех. уровнем. */
const TIER_GROWTH = 1.45;

/** Свойства, которые растут с тех. уровнем полностью. */
const FLAT: GearStatKey[] = ['damage', 'hp', 'armor'];
/** Свойства в процентах. */
export const PERCENT_STATS: GearStatKey[] = ['crit', 'dodge'];

export interface GearDef {
  name: string;
  scroll: ResourceKey;
  /** Цена свитка в кристаллах. */
  scrollPrice: number;
  /** Какие вещи бункера нужны и сколько. */
  inputs: Partial<Record<EquipCategory, number>>;
  /** Свойства на 1-м тех. уровне, обычная редкость: [при 0% качества, при 100%]. */
  stats: { key: GearStatKey; range: [number, number] }[];
}

export const GEAR_DEFS: Record<GearKind, GearDef> = {
  weapon: {
    name: 'Плазменный бластер',
    scroll: 'scrollWeapon',
    scrollPrice: 60,
    inputs: { coil: 2, capacitor: 1 },
    stats: [
      { key: 'damage', range: [10, 18] },
      { key: 'crit', range: [1, 4] },
    ],
  },
  helmet: {
    name: 'Шлем',
    scroll: 'scrollHelmet',
    scrollPrice: 40,
    inputs: { sensor: 1, cooling: 1 },
    stats: [
      { key: 'armor', range: [3, 6] },
      { key: 'hp', range: [20, 40] },
    ],
  },
  armor: {
    name: 'Бронежилет',
    scroll: 'scrollArmor',
    scrollPrice: 40,
    inputs: { shield: 1, generator: 1 },
    stats: [
      { key: 'armor', range: [8, 14] },
      { key: 'hp', range: [40, 80] },
    ],
  },
  pants: {
    name: 'Штаны',
    scroll: 'scrollPants',
    scrollPrice: 40,
    inputs: { shield: 1, cooling: 1 },
    stats: [
      { key: 'armor', range: [4, 8] },
      { key: 'hp', range: [25, 50] },
    ],
  },
  boots: {
    name: 'Ботинки',
    scroll: 'scrollBoots',
    scrollPrice: 40,
    inputs: { converter: 1, cooling: 1 },
    stats: [
      { key: 'armor', range: [2, 5] },
      { key: 'dodge', range: [1, 4] },
    ],
  },
  amulet: {
    name: 'Амулет',
    scroll: 'scrollAmulet',
    scrollPrice: 40,
    inputs: { sensor: 1, converter: 1 },
    stats: [
      { key: 'hp', range: [20, 40] },
      { key: 'int', range: [1, 4] },
    ],
  },
  ring: {
    name: 'Кольцо',
    scroll: 'scrollRing',
    scrollPrice: 40,
    inputs: { capacitor: 1, converter: 1 },
    stats: [
      { key: 'str', range: [1, 4] },
      { key: 'agi', range: [1, 4] },
    ],
  },
};

/** Какой вид снаряжения идёт в слот. */
export function slotKind(slot: GearSlot): GearKind {
  return slot === 'ring1' || slot === 'ring2' ? 'ring' : slot;
}

/** Значение свойства при данном качестве, редкости, тех. уровне и уровне вещей. */
function statValue(key: GearStatKey, range: [number, number], q: number, rarity: Rarity, tier: number, levelK: number): number {
  const base = range[0] + (range[1] - range[0]) * q;
  const rar = RARITY_MULT[rarityIndex(rarity)] ?? 1;
  if (FLAT.includes(key)) return Math.round(base * rar * Math.pow(TIER_GROWTH, tier - 1) * levelK);
  if (PERCENT_STATS.includes(key)) return Math.round(base * rar * levelK * 10) / 10;
  // Характеристики (+сила и т.п.): умеренный рост с тех. уровнем.
  return Math.max(1, Math.round(base * rar * (1 + 0.25 * (tier - 1)) * levelK));
}

/** Стоимость создания в монетах. */
export function craftCoins(tier: number): number {
  return 150 * tier;
}

export type CraftError = 'scroll' | 'coins' | 'inputs';

export interface CraftPreview {
  qMin: number;
  qMax: number;
  tier: number;
  rarity: Rarity;
  stats: { key: GearStatKey; min: number; max: number }[];
  cost: Partial<Record<ResourceKey, number>>;
}

/** Проверяет, что выбраны ровно нужные вещи со склада (не установленные в бункер). */
export function validInputs(p: Profile, kind: GearKind, ids: string[]): Item[] | null {
  const need = GEAR_DEFS[kind].inputs;
  if (new Set(ids).size !== ids.length) return null;
  const items = ids.map((id) => p.items[id]);
  if (items.some((it) => !it || isEquipped(p, it.id))) return null;
  for (const [cat, n] of Object.entries(need)) if (items.filter((it) => it.category === cat).length !== n) return null;
  if (items.length !== Object.values(need).reduce((s, n) => s + (n ?? 0), 0)) return null;
  return items;
}

/**
 * Что получится: качество — в диапазоне качества вложенных вещей,
 * тех. уровень и редкость — средние по вложенным (с округлением вниз).
 */
export function craftPreview(p: Profile, kind: GearKind, ids: string[]): CraftPreview | null {
  const items = validInputs(p, kind, ids);
  if (!items) return null;
  const qs = items.map(itemQuality);
  const qMin = Math.min(...qs);
  const qMax = Math.max(...qs);
  const tier = Math.max(1, Math.floor(items.reduce((s, it) => s + it.tier, 0) / items.length));
  const rarity = RARITIES[Math.floor(items.reduce((s, it) => s + rarityIndex(it.rarity), 0) / items.length)];
  const levelK = 1 + 0.04 * (items.reduce((s, it) => s + it.level, 0) / items.length - 1);
  const stats = GEAR_DEFS[kind].stats.map((s) => ({
    key: s.key,
    min: statValue(s.key, s.range, qMin, rarity, tier, levelK),
    max: statValue(s.key, s.range, qMax, rarity, tier, levelK),
  }));
  return { qMin, qMax, tier, rarity, stats, cost: { [GEAR_DEFS[kind].scroll]: 1, coins: craftCoins(tier) } };
}

/** Создать снаряжение: тратит свиток, монеты и вложенные вещи. */
export function craftGear(p: Profile, kind: GearKind, ids: string[]): { profile: Profile; gear?: Gear; error?: CraftError } {
  const items = validInputs(p, kind, ids);
  const pre = craftPreview(p, kind, ids);
  if (!items || !pre) return { profile: p, error: 'inputs' };
  const def = GEAR_DEFS[kind];
  if (p.resources[def.scroll] < 1) return { profile: p, error: 'scroll' };
  const paid = spend(p, pre.cost);
  if (!paid) return { profile: p, error: 'coins' };
  const q = pre.qMin + (pre.qMax - pre.qMin) * random();
  const levelK = 1 + 0.04 * (items.reduce((s, it) => s + it.level, 0) / items.length - 1);
  const gear: Gear = {
    id: uid(),
    kind,
    name: def.name,
    rarity: pre.rarity,
    tier: pre.tier,
    quality: q,
    stats: def.stats.map((s) => ({ key: s.key, value: statValue(s.key, s.range, q, pre.rarity, pre.tier, levelK) })),
    createdAt: Date.now(),
  };
  let next = paid;
  for (const it of items) next = dropItemParts(next, it.id);
  const left = { ...next.items };
  for (const it of items) delete left[it.id];
  next = {
    ...next,
    items: left,
    engineer: { ...next.engineer, gear: { ...next.engineer.gear, [gear.id]: gear } },
    history: pushHistory(next, { at: Date.now(), itemName: gear.name, rarity: gear.rarity, action: 'obtained', detail: `мастерская: ${items.map((x) => x.name).join(', ')}` }),
  };
  return { profile: next, gear };
}

export function gearSlotOf(p: Profile, gearId: string): GearSlot | null {
  return GEAR_SLOTS.find((s) => p.engineer.equip[s] === gearId) ?? null;
}

/** Надеть: в свой слот; кольцо — в свободный, иначе вместо первого. */
export function equipGear(p: Profile, gearId: string, slot?: GearSlot): Profile | null {
  const g = p.engineer.gear[gearId];
  if (!g) return null;
  let target: GearSlot;
  if (slot) {
    if (slotKind(slot) !== g.kind) return null;
    target = slot;
  } else if (g.kind === 'ring') target = !p.engineer.equip.ring1 ? 'ring1' : !p.engineer.equip.ring2 ? 'ring2' : 'ring1';
  else target = g.kind;
  const equip = { ...p.engineer.equip };
  const from = gearSlotOf(p, gearId);
  if (from) equip[from] = null;
  equip[target] = gearId;
  return { ...p, engineer: { ...p.engineer, equip } };
}

export function unequipGear(p: Profile, slot: GearSlot): Profile {
  return { ...p, engineer: { ...p.engineer, equip: { ...p.engineer.equip, [slot]: null } } };
}

export function gearSellPrice(g: Gear): number {
  return Math.round(60 * g.tier * (RARITY_MULT[rarityIndex(g.rarity)] ?? 1) * (0.5 + g.quality));
}

export function sellGear(p: Profile, gearId: string): { profile: Profile; coins: number } | null {
  const g = p.engineer.gear[gearId];
  if (!g || gearSlotOf(p, gearId)) return null;
  const gear = { ...p.engineer.gear };
  delete gear[gearId];
  const coins = gearSellPrice(g);
  return {
    profile: {
      ...p,
      engineer: { ...p.engineer, gear },
      resources: { ...p.resources, coins: p.resources.coins + coins },
      history: pushHistory(p, { at: Date.now(), itemName: g.name, rarity: g.rarity, action: 'sold', detail: `+${coins} монет` }),
    },
    coins,
  };
}

/** Купить свиток за кристаллы. */
export function buyScroll(p: Profile, kind: GearKind): Profile | null {
  const def = GEAR_DEFS[kind];
  const paid = spend(p, { crystals: def.scrollPrice });
  return paid ? { ...paid, resources: { ...paid.resources, [def.scroll]: paid.resources[def.scroll] + 1 } } : null;
}

// ───────────── Итоговые характеристики ─────────────

export interface EngineerStats {
  attrs: Record<EngStat, number>;
  hp: number;
  damage: number;
  armor: number;
  /** Доли 0..1. */
  crit: number;
  dodge: number;
  /** Прибавка к силе навыков (доля). */
  skillPower: number;
}

export function equippedGear(p: Profile): Gear[] {
  return GEAR_SLOTS.map((s) => p.engineer.equip[s]).flatMap((id) => (id && p.engineer.gear[id] ? [p.engineer.gear[id]] : []));
}

export function engineerStats(p: Profile): EngineerStats {
  const sum: Record<GearStatKey, number> = { damage: 0, hp: 0, armor: 0, crit: 0, dodge: 0, str: 0, end: 0, agi: 0, int: 0 };
  for (const g of equippedGear(p)) for (const s of g.stats) sum[s.key] += s.value;
  const attrs = Object.fromEntries(ENG_STATS.map((k) => [k, STAT_BASE + p.engineer.points[k] + sum[k]])) as Record<EngStat, number>;
  const weapon = sum.damage || 3;
  return {
    attrs,
    hp: Math.round(100 + 20 * attrs.end + sum.hp),
    damage: Math.round(weapon * (1 + 0.03 * attrs.str)),
    armor: Math.round(sum.armor),
    crit: Math.min(0.6, 0.05 + 0.003 * attrs.agi + sum.crit / 100),
    dodge: Math.min(0.3, 0.002 * attrs.agi + sum.dodge / 100),
    skillPower: 0.01 * attrs.int,
  };
}
