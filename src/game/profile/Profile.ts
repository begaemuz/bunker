import { balanceConfig } from '../config/balanceConfig';
import { startSlots, starterTemplates } from '../config/itemsConfig';
import { generateItem, sellPrice } from '../items/ItemGenerator';
import { isAtLeast } from '../items/ItemRarity';
import {
  EQUIP_CATEGORIES,
  RESOURCE_KEYS,
  type EquipCategory,
  type EquipmentLayout,
  type Item,
  type Rarity,
  type Resources,
} from '../types';

export const SAVE_VERSION = 2;

export interface GlobalStats {
  robotsKilled: number;
  bossesKilled: number;
  minibossesKilled: number;
  wavesCompleted: number;
  mapsCompleted: number;
  runs: number;
  defeats: number;
  playTime: number;
  damageDealt: number;
  damageTaken: number;
  itemsFound: number;
  legendaryFound: number;
  itemsSold: number;
  upgradesSucceeded: number;
  itemsDestroyed: number;
}

export interface HistoryEntry {
  at: number;
  itemName: string;
  rarity: Rarity;
  action: 'obtained' | 'sold' | 'scrapped';
  detail?: string;
}

export interface Profile {
  version: number;
  createdAt: number;
  updatedAt: number;
  bunker: { level: number; xp: number };
  resources: Resources;
  items: Record<string, Item>;
  equipment: EquipmentLayout;
  maps: {
    unlocked: number[];
    selected: number;
    bestWave: Record<number, number>;
    bossKills: Record<number, number>;
  };
  stats: GlobalStats;
  history: HistoryEntry[];
}

export function emptyResources(): Resources {
  return Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0])) as Resources;
}

export function emptyStats(): GlobalStats {
  return {
    robotsKilled: 0,
    bossesKilled: 0,
    minibossesKilled: 0,
    wavesCompleted: 0,
    mapsCompleted: 0,
    runs: 0,
    defeats: 0,
    playTime: 0,
    damageDealt: 0,
    damageTaken: 0,
    itemsFound: 0,
    legendaryFound: 0,
    itemsSold: 0,
    upgradesSucceeded: 0,
    itemsDestroyed: 0,
  };
}

export function createNewProfile(): Profile {
  const items: Record<string, Item> = {};
  const equipment = emptyEquipment();
  for (const tplId of starterTemplates) {
    const item = generateItem({ templateId: tplId, rarity: 'common', source: { kind: 'start' } });
    items[item.id] = item;
    equipment[item.category][0] = item.id;
  }
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    bunker: { level: 1, xp: 0 },
    resources: { ...emptyResources(), coins: 50, stabilizers: 1 },
    items,
    equipment,
    maps: { unlocked: [1], selected: 1, bestWave: {}, bossKills: {} },
    stats: emptyStats(),
    history: [],
  };
}

export function emptyEquipment(): EquipmentLayout {
  return Object.fromEntries(
    EQUIP_CATEGORIES.map((c) => [c, Array.from({ length: startSlots[c] }, () => null)]),
  ) as EquipmentLayout;
}

// ───────────── Чистые операции над профилем ─────────────

const HISTORY_LIMIT = 150;

function pushHistory(p: Profile, e: HistoryEntry): HistoryEntry[] {
  const h = [e, ...p.history];
  if (h.length > HISTORY_LIMIT) h.length = HISTORY_LIMIT;
  return h;
}

export function isEquipped(p: Profile, itemId: string): boolean {
  return EQUIP_CATEGORIES.some((c) => p.equipment[c].includes(itemId));
}

export function equippedItems(p: Profile): Item[] {
  const out: Item[] = [];
  for (const c of EQUIP_CATEGORIES) {
    for (const id of p.equipment[c]) {
      if (id && p.items[id]) out.push(p.items[id]);
    }
  }
  return out;
}

export function addResources(p: Profile, delta: Partial<Resources>): Profile {
  const resources = { ...p.resources };
  for (const k of RESOURCE_KEYS) {
    const d = delta[k];
    if (d) resources[k] = Math.max(0, resources[k] + d);
  }
  return { ...p, resources };
}

export function canAfford(p: Profile, cost: Partial<Resources>): boolean {
  return RESOURCE_KEYS.every((k) => (cost[k] ?? 0) <= p.resources[k]);
}

export function equipmentCount(p: Profile): number {
  return Object.keys(p.items).length;
}

/**
 * Добавляет предметы в инвентарь. Если инвентарь полон,
 * предмет автоматически разбирается на металлолом.
 */
export function addItems(p: Profile, newItems: Item[]): { profile: Profile; scrapped: Item[] } {
  const items = { ...p.items };
  let count = Object.keys(items).length;
  let history = p.history;
  let scrap = 0;
  const scrapped: Item[] = [];
  let legendary = 0;
  for (const it of newItems) {
    if (it.rarity === 'legendary') legendary++;
    if (count >= balanceConfig.inventoryLimit) {
      scrapped.push(it);
      scrap += Math.max(1, Math.round(sellPrice(it) / 5));
      history = pushHistory({ ...p, history }, { at: Date.now(), itemName: it.name, rarity: it.rarity, action: 'scrapped', detail: 'Инвентарь заполнен' });
      continue;
    }
    items[it.id] = it;
    count++;
    history = pushHistory({ ...p, history }, { at: it.obtainedAt, itemName: it.name, rarity: it.rarity, action: 'obtained' });
  }
  const resources = { ...p.resources, scrap: p.resources.scrap + scrap };
  return {
    profile: {
      ...p,
      items,
      history,
      resources,
      stats: {
        ...p.stats,
        itemsFound: p.stats.itemsFound + newItems.length,
        legendaryFound: p.stats.legendaryFound + legendary,
      },
    },
    scrapped,
  };
}

export type EquipError = 'not_found' | 'wrong_category' | 'no_slot';

/** Устанавливает предмет в слот. Если slotIndex занят — предметы меняются местами. */
export function equipItem(
  p: Profile,
  itemId: string,
  category: EquipCategory,
  slotIndex?: number,
): { profile: Profile; error?: EquipError } {
  const item = p.items[itemId];
  if (!item) return { profile: p, error: 'not_found' };
  if (item.category !== category) return { profile: p, error: 'wrong_category' };
  const slots = [...p.equipment[category]];
  // Убрать предмет, если он уже установлен в другом слоте.
  const prev = slots.indexOf(itemId);
  if (prev >= 0) slots[prev] = null;
  let idx = slotIndex ?? slots.findIndex((s) => s === null);
  if (idx < 0) idx = 0; // все заняты — заменяем первый
  if (idx >= slots.length) return { profile: p, error: 'no_slot' };
  slots[idx] = itemId;
  return { profile: { ...p, equipment: { ...p.equipment, [category]: slots } } };
}

export function unequipItem(p: Profile, itemId: string): Profile {
  const equipment = { ...p.equipment };
  for (const c of EQUIP_CATEGORIES) {
    if (equipment[c].includes(itemId)) {
      equipment[c] = equipment[c].map((s) => (s === itemId ? null : s));
    }
  }
  return { ...p, equipment };
}

export type SellError = 'not_found' | 'equipped';

export function sellItem(p: Profile, itemId: string): { profile: Profile; coins: number; error?: SellError } {
  const item = p.items[itemId];
  if (!item) return { profile: p, coins: 0, error: 'not_found' };
  if (isEquipped(p, itemId)) return { profile: p, coins: 0, error: 'equipped' };
  const coins = sellPrice(item);
  const items = { ...p.items };
  delete items[itemId];
  return {
    profile: {
      ...p,
      items,
      resources: { ...p.resources, coins: p.resources.coins + coins },
      stats: { ...p.stats, itemsSold: p.stats.itemsSold + 1 },
      history: pushHistory(p, { at: Date.now(), itemName: item.name, rarity: item.rarity, action: 'sold', detail: `+${coins} монет` }),
    },
    coins,
  };
}

export function needsSellWarning(item: Item): boolean {
  return isAtLeast(item.rarity, balanceConfig.sell.warnFrom);
}

// ───────────── Опыт бункера ─────────────

export function xpForLevel(level: number): number {
  const x = balanceConfig.xp;
  return Math.round(x.base * Math.pow(level, x.exponent));
}

export function addXp(p: Profile, amount: number): { profile: Profile; levelsGained: number } {
  let { level, xp } = p.bunker;
  xp += amount;
  let gained = 0;
  while (level < balanceConfig.xp.maxLevel && xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
    gained++;
  }
  if (level >= balanceConfig.xp.maxLevel) xp = 0;
  return { profile: { ...p, bunker: { level, xp } }, levelsGained: gained };
}
