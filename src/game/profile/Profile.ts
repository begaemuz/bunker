import { balanceConfig } from '../config/balanceConfig';
import { starterKit } from '../config/itemsConfig';
import { getLocation, locationsConfig } from '../config/locationsConfig';
import { generateItem, sellPrice } from '../items/ItemGenerator';
import { isAtLeast } from '../items/ItemRarity';
import { dropItemParts } from '../items/Parts';
import type { DailyState, ExchangeState, QuestState, ShopState } from '../meta/Meta';
import {
  RESOURCE_KEYS,
  SLOT_CATEGORY,
  SLOT_IDS,
  type EquipmentLayout,
  type Item,
  type Part,
  type Rarity,
  type Resources,
  type SlotId,
} from '../types';

export const SAVE_VERSION = 6;

export interface GlobalStats {
  robotsKilled: number;
  groupsKilled: number;
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
  uniquesFound: number;
  itemsSold: number;
  upgradesSucceeded: number;
  upgradesFailed: number;
  itemsDestroyed: number;
  techsResearched: number;
  bossPassesUsed: number;
}

export interface HistoryEntry {
  at: number;
  itemName: string;
  rarity: Rarity;
  action: 'obtained' | 'sold' | 'scrapped' | 'upgraded' | 'destroyed';
  detail?: string;
}

export interface LocationProgress {
  /** Группы, уничтоженные с последнего вызова босса. */
  groups: number;
  bossKills: number;
  totalGroups: number;
}

/** Средние темпы добычи за последний бой — для начисления офлайн-прогресса. */
export interface OfflineRates {
  location: number;
  /** Всё — в единицах за секунду боя. */
  resources: Partial<Resources>;
  xp: number;
  kills: number;
  groups: number;
  items: number;
  parts: number;
}

export interface Profile {
  version: number;
  createdAt: number;
  updatedAt: number;
  bunker: { level: number; xp: number };
  resources: Resources;
  items: Record<string, Item>;
  equipment: EquipmentLayout;
  techs: Record<string, number>;
  locations: {
    current: number;
    unlocked: number[];
    progress: Record<number, LocationProgress>;
  };
  stats: GlobalStats;
  history: HistoryEntry[];
  parts: Record<string, Part>;
  /** Автопродажа нового оборудования до указанной редкости включительно. */
  autoSell: { maxRarity: Rarity | null };
  offline: { lastSeen: number; rates: OfflineRates | null };
  /** Игрок Telegram, к которому привязан прогресс. */
  tgUserId: number | null;
  shop: ShopState;
  exchange: ExchangeState;
  daily: DailyState;
  quests: QuestState;
  /** Карточка игрока: ник, аватар инженера, рамка. */
  player: { nick: string; avatar: number; frame: string };
  /** Очки VIP (за покупку кристаллов за реальные деньги). */
  vip: { points: number };
}

export function emptyMeta(): Pick<Profile, 'shop' | 'exchange' | 'daily' | 'quests'> {
  return {
    shop: { refreshedAt: 0, refreshDay: '', refreshes: 0, regular: [], rare: [] },
    exchange: { day: '', used: {} },
    daily: { lastDay: null, cycle: 0 },
    quests: { day: '', list: [], bonusClaimed: false },
  };
}

export function emptyResources(): Resources {
  return Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0])) as Resources;
}

export function emptyStats(): GlobalStats {
  return {
    robotsKilled: 0,
    groupsKilled: 0,
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
    uniquesFound: 0,
    itemsSold: 0,
    upgradesSucceeded: 0,
    upgradesFailed: 0,
    itemsDestroyed: 0,
    techsResearched: 0,
    bossPassesUsed: 0,
  };
}

export function emptyEquipment(): EquipmentLayout {
  return Object.fromEntries(SLOT_IDS.map((s) => [s, null])) as EquipmentLayout;
}

export function emptyLocationProgress(): LocationProgress {
  return { groups: 0, bossKills: 0, totalGroups: 0 };
}

export function createNewProfile(): Profile {
  const items: Record<string, Item> = {};
  const equipment = emptyEquipment();
  for (const k of starterKit) {
    const item = generateItem({ templateId: k.template, rarity: 'common', tier: 1, source: { kind: 'start' } });
    items[item.id] = item;
    equipment[k.slot] = item.id;
  }
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    bunker: { level: 1, xp: 0 },
    resources: { ...emptyResources(), coins: 80, stabilizers: 1 },
    items,
    equipment,
    techs: {},
    locations: { current: 1, unlocked: [1], progress: { 1: emptyLocationProgress() } },
    stats: emptyStats(),
    history: [],
    parts: {},
    autoSell: { maxRarity: null },
    offline: { lastSeen: now, rates: null },
    tgUserId: null,
    ...emptyMeta(),
    player: { nick: '', avatar: 0, frame: 'steel' },
    vip: { points: 0 },
  };
}

// ───────────── Чистые операции над профилем ─────────────

const HISTORY_LIMIT = 150;

export function pushHistory(p: Profile, e: HistoryEntry): HistoryEntry[] {
  const h = [e, ...p.history];
  if (h.length > HISTORY_LIMIT) h.length = HISTORY_LIMIT;
  return h;
}

export function slotOf(p: Profile, itemId: string): SlotId | null {
  for (const s of SLOT_IDS) if (p.equipment[s] === itemId) return s;
  return null;
}

export function isEquipped(p: Profile, itemId: string): boolean {
  return slotOf(p, itemId) !== null;
}

export function equippedItems(p: Profile): { slot: SlotId; item: Item }[] {
  const out: { slot: SlotId; item: Item }[] = [];
  for (const s of SLOT_IDS) {
    const id = p.equipment[s];
    if (id && p.items[id]) out.push({ slot: s, item: p.items[id] });
  }
  return out;
}

export function addResources(p: Profile, delta: Partial<Resources>): Profile {
  const resources = { ...p.resources };
  for (const k of RESOURCE_KEYS) {
    const d = delta[k];
    if (d) resources[k] = Math.max(0, Math.round((resources[k] + d) * 100) / 100);
  }
  return { ...p, resources };
}

export function canAfford(p: Profile, cost: Partial<Resources>): boolean {
  return RESOURCE_KEYS.every((k) => (cost[k] ?? 0) <= p.resources[k]);
}

export function spend(p: Profile, cost: Partial<Resources>): Profile | null {
  if (!canAfford(p, cost)) return null;
  const neg: Partial<Resources> = {};
  for (const k of RESOURCE_KEYS) if (cost[k]) neg[k] = -(cost[k] as number);
  return addResources(p, neg);
}

/** Добавляет предметы. При переполнении инвентаря предмет разбирается на металлолом. */
export function addItems(p: Profile, newItems: Item[]): { profile: Profile; scrapped: Item[] } {
  const items = { ...p.items };
  let count = Object.keys(items).length;
  let history = p.history;
  let scrap = 0;
  const scrapped: Item[] = [];
  let legendary = 0;
  let uniques = 0;
  for (const it of newItems) {
    if (it.rarity === 'legendary') legendary++;
    if (it.rarity === 'unique') uniques++;
    if (count >= balanceConfig.inventoryLimit && it.rarity !== 'unique') {
      scrapped.push(it);
      scrap += Math.max(1, Math.round(sellPrice(it) / 5));
      history = pushHistory({ ...p, history }, { at: Date.now(), itemName: it.name, rarity: it.rarity, action: 'scrapped', detail: 'Склад заполнен' });
      continue;
    }
    items[it.id] = it;
    count++;
    history = pushHistory({ ...p, history }, { at: it.obtainedAt, itemName: it.name, rarity: it.rarity, action: 'obtained' });
  }
  return {
    profile: {
      ...p,
      items,
      history,
      resources: { ...p.resources, scrap: p.resources.scrap + scrap },
      stats: {
        ...p.stats,
        itemsFound: p.stats.itemsFound + newItems.length,
        legendaryFound: p.stats.legendaryFound + legendary,
        uniquesFound: p.stats.uniquesFound + uniques,
      },
    },
    scrapped,
  };
}

export type EquipError = 'not_found' | 'wrong_category';

/**
 * Устанавливает предмет в слот. Если предмет стоял в другом слоте
 * (например, катушка №1 → №2), он переносится, а не дублируется.
 */
export function equipItem(p: Profile, itemId: string, slot: SlotId): { profile: Profile; error?: EquipError } {
  const item = p.items[itemId];
  if (!item) return { profile: p, error: 'not_found' };
  if (SLOT_CATEGORY[slot] !== item.category) return { profile: p, error: 'wrong_category' };
  const equipment = { ...p.equipment };
  for (const s of SLOT_IDS) if (equipment[s] === itemId) equipment[s] = null;
  equipment[slot] = itemId;
  return { profile: { ...p, equipment } };
}

/** Лучший слот для предмета: свободный подходящий или первый подходящий. */
export function defaultSlotFor(p: Profile, item: Item): SlotId {
  const fits = SLOT_IDS.filter((s) => SLOT_CATEGORY[s] === item.category);
  return fits.find((s) => p.equipment[s] === null) ?? fits[0];
}

export function unequipItem(p: Profile, itemId: string): Profile {
  const equipment = { ...p.equipment };
  for (const s of SLOT_IDS) if (equipment[s] === itemId) equipment[s] = null;
  return { ...p, equipment };
}

export type SellError = 'not_found' | 'equipped';

export function sellItem(p: Profile, itemId: string): { profile: Profile; coins: number; error?: SellError } {
  const item = p.items[itemId];
  if (!item) return { profile: p, coins: 0, error: 'not_found' };
  if (isEquipped(p, itemId)) return { profile: p, coins: 0, error: 'equipped' };
  const coins = sellPrice(item);
  const base = dropItemParts(p, itemId);
  const items = { ...base.items };
  delete items[itemId];
  return {
    profile: {
      ...base,
      items,
      resources: { ...p.resources, coins: p.resources.coins + coins },
      stats: { ...p.stats, itemsSold: p.stats.itemsSold + 1 },
      history: pushHistory(p, { at: Date.now(), itemName: item.name, rarity: item.rarity, action: 'sold', detail: `+${coins} монет` }),
    },
    coins,
  };
}

/** Массовая продажа: установленное оборудование пропускается. */
export function sellMany(p: Profile, ids: string[]): { profile: Profile; coins: number; count: number } {
  let q = p;
  let coins = 0;
  let count = 0;
  for (const id of ids) {
    const r = sellItem(q, id);
    if (r.error) continue;
    q = r.profile;
    coins += r.coins;
    count++;
  }
  return { profile: q, coins, count };
}

export function needsSellWarning(item: Item): boolean {
  return isAtLeast(item.rarity, balanceConfig.sell.warnFrom);
}

/**
 * Защита от тупика: если у игрока не осталось ни одного генератора
 * или катушки (например, всё сломалось при улучшении), выдаём базовые.
 */
export function ensureMinimumKit(p: Profile): { profile: Profile; granted: Item[] } {
  const granted: Item[] = [];
  let q = p;
  const need: { cat: 'generator' | 'coil'; tpl: string; slot: SlotId }[] = [
    { cat: 'generator', tpl: 'gen_diesel', slot: 'generator' },
    { cat: 'coil', tpl: 'coil_emp', slot: 'coil1' },
  ];
  for (const n of need) {
    if (Object.values(q.items).some((i) => i.category === n.cat)) continue;
    const it = generateItem({ templateId: n.tpl, rarity: 'common', tier: 1, source: { kind: 'start' } });
    q = { ...q, items: { ...q.items, [it.id]: it } };
    if (!q.equipment[n.slot]) q = { ...q, equipment: { ...q.equipment, [n.slot]: it.id } };
    granted.push(it);
  }
  return { profile: q, granted };
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

// ───────────── Локации ─────────────

export function locationProgress(p: Profile, id: number): LocationProgress {
  return p.locations.progress[id] ?? emptyLocationProgress();
}

export function isLocationUnlocked(p: Profile, id: number): boolean {
  return p.locations.unlocked.includes(id);
}

function withProgress(p: Profile, id: number, fn: (lp: LocationProgress) => LocationProgress): Profile {
  return {
    ...p,
    locations: { ...p.locations, progress: { ...p.locations.progress, [id]: fn(locationProgress(p, id)) } },
  };
}

export function addGroupKill(p: Profile, locationId: number): Profile {
  const loc = getLocation(locationId);
  const next = withProgress(p, locationId, (lp) => ({
    ...lp,
    groups: Math.min(loc.groupsForBoss, lp.groups + 1),
    totalGroups: lp.totalGroups + 1,
  }));
  return { ...next, stats: { ...next.stats, groupsKilled: next.stats.groupsKilled + 1 } };
}

export function canSummonBoss(p: Profile, locationId: number): boolean {
  return locationProgress(p, locationId).groups >= getLocation(locationId).groupsForBoss;
}

/** Расходует условие вызова: прогресс групп или пропуск. */
export function consumeSummon(p: Profile, locationId: number, usePass: boolean): Profile | null {
  if (usePass) {
    if (p.resources.bossPasses < 1) return null;
    const q = addResources(p, { bossPasses: -1 });
    return { ...q, stats: { ...q.stats, bossPassesUsed: q.stats.bossPassesUsed + 1 } };
  }
  if (!canSummonBoss(p, locationId)) return null;
  return withProgress(p, locationId, (lp) => ({ ...lp, groups: 0 }));
}

/** Возврат условия вызова, если бой с боссом проигран. */
export function restoreSummon(p: Profile, locationId: number, usedPass: boolean): Profile {
  if (usedPass) return addResources(p, { bossPasses: 1 });
  const loc = getLocation(locationId);
  return withProgress(p, locationId, (lp) => ({ ...lp, groups: loc.groupsForBoss }));
}

/** Победа над боссом: счётчик и открытие следующей локации. */
export function registerBossKill(p: Profile, locationId: number): { profile: Profile; unlocked: number | null } {
  let q = withProgress(p, locationId, (lp) => ({ ...lp, bossKills: lp.bossKills + 1 }));
  q = { ...q, stats: { ...q.stats, bossesKilled: q.stats.bossesKilled + 1 } };
  const next = locationsConfig.find((l) => l.id === locationId + 1);
  if (next && !q.locations.unlocked.includes(next.id)) {
    q = {
      ...q,
      locations: {
        ...q.locations,
        unlocked: [...q.locations.unlocked, next.id],
        progress: { ...q.locations.progress, [next.id]: emptyLocationProgress() },
      },
      stats: { ...q.stats, mapsCompleted: q.stats.mapsCompleted + 1 },
    };
    return { profile: q, unlocked: next.id };
  }
  return { profile: q, unlocked: null };
}

export function setCurrentLocation(p: Profile, id: number): Profile {
  if (!isLocationUnlocked(p, id)) return p;
  return { ...p, locations: { ...p.locations, current: id } };
}
