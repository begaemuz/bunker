import { exchangeConfig, dailyRewards, questAllBonus, questPool, questsPerDay, shopConfig, type QuestKind } from '../config/metaConfig';
import { getLocation } from '../config/locationsConfig';
import { generateItem, sellPrice } from '../items/ItemGenerator';
import { rollRarity } from '../items/ItemRarity';
import { generatePart } from '../items/Parts';
import { addItems, addResources, canAfford, spend, type Profile } from '../profile/Profile';
import { addParts } from '../items/Parts';
import { random, uid } from '../rng';
import { RESOURCE_KEYS, type Item, type Part, type Resources } from '../types';

// ───────────── Время ─────────────

/** Календарный день по локальному времени устройства. */
export function dayKey(t = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Тех. уровень игрока = уровень самой дальней открытой локации. */
export function playerTier(p: Profile): number {
  return Math.max(...p.locations.unlocked.map((id) => getLocation(id).tier));
}

function scaleRes(r: Partial<Resources>, m: number): Partial<Resources> {
  const out: Partial<Resources> = {};
  for (const k of RESOURCE_KEYS) if (r[k]) out[k] = Math.ceil(r[k]! * m);
  return out;
}

// ───────────── Магазин ─────────────

export interface Offer {
  id: string;
  kind: 'item' | 'part' | 'resource' | 'key';
  item?: Item;
  part?: Part;
  give?: Partial<Resources>;
  price: Partial<Resources>;
  sold: boolean;
}

export interface ShopState {
  refreshedAt: number;
  refreshDay: string;
  refreshes: number;
  regular: Offer[];
  rare: Offer[];
}

export function emptyShop(): ShopState {
  return { refreshedAt: 0, refreshDay: '', refreshes: 0, regular: [], rare: [] };
}

function genShop(p: Profile): Pick<ShopState, 'regular' | 'rare'> {
  const tier = playerTier(p);
  const loc = Math.max(...p.locations.unlocked);
  const c = shopConfig.regular;
  const regular: Offer[] = [];
  for (let i = 0; i < c.equipment; i++) {
    const item = generateItem({ rarity: rollRarity(c.rarity), tier, source: { kind: 'drop', location: loc, enemy: 'магазин' } });
    regular.push({ id: uid(), kind: 'item', item, price: { coins: sellPrice(item) * c.priceMult }, sold: false });
  }
  for (let i = 0; i < c.parts; i++) {
    const part = generatePart(rollRarity({ common: 0.5, uncommon: 0.35, rare: 0.15, epic: 0, legendary: 0, unique: 0 }));
    regular.push({ id: uid(), kind: 'part', part, price: { coins: 250 * tier * (1 + ['common', 'uncommon', 'rare'].indexOf(part.rarity)) }, sold: false });
  }
  const packs = [...shopConfig.resourcePacks].sort(() => random() - 0.5).slice(0, c.resources);
  for (const pk of packs) regular.push({ id: uid(), kind: 'resource', give: scaleRes(pk.give, 1 + 0.5 * (tier - 1)), price: scaleRes(pk.price, tier), sold: false });

  const r = shopConfig.rare;
  const rare: Offer[] = [];
  for (let i = 0; i < r.parts; i++) {
    const part = generatePart(rollRarity(r.rarity));
    const mult = { rare: 1, epic: 2.5, legendary: 6 }[part.rarity as 'rare' | 'epic' | 'legendary'] ?? 1;
    rare.push({ id: uid(), kind: 'part', part, price: { coins: Math.ceil(900 * tier * mult), blueprints: Math.ceil(2 * mult) }, sold: false });
  }
  rare.push({ id: uid(), kind: 'key', give: { expansionKeys: 1 }, price: scaleRes(r.keyPrice, tier), sold: false });
  return { regular, rare };
}

/** Автоматическое обновление ассортимента по реальному времени. */
export function ensureShop(p: Profile, now = Date.now()): Profile {
  const s = p.shop;
  const due = now - s.refreshedAt >= shopConfig.refreshHours * 3600_000 || s.regular.length === 0;
  const day = dayKey(now);
  let next = s;
  if (s.refreshDay !== day) next = { ...next, refreshDay: day, refreshes: 0 };
  if (due) next = { ...next, ...genShop(p), refreshedAt: now };
  return next === s ? p : { ...p, shop: next };
}

export function shopRefreshCost(p: Profile): Partial<Resources> {
  return { coins: shopConfig.refreshBase * playerTier(p) * (1 + p.shop.refreshes) };
}

export function refreshShop(p: Profile): Profile | null {
  const paid = spend(p, shopRefreshCost(p));
  if (!paid) return null;
  return { ...paid, shop: { ...paid.shop, ...genShop(paid), refreshedAt: Date.now(), refreshes: paid.shop.refreshes + 1 } };
}

export function nextShopRefresh(p: Profile): number {
  return p.shop.refreshedAt + shopConfig.refreshHours * 3600_000;
}

export function buyOffer(p: Profile, section: 'regular' | 'rare', offerId: string): { profile: Profile; error?: 'sold' | 'resources' | 'not_found' } {
  const list = p.shop[section];
  const o = list.find((x) => x.id === offerId);
  if (!o) return { profile: p, error: 'not_found' };
  if (o.sold) return { profile: p, error: 'sold' };
  const paid = spend(p, o.price);
  if (!paid) return { profile: p, error: 'resources' };
  let q = paid;
  if (o.item) q = addItems(q, [{ ...o.item, id: uid(), obtainedAt: Date.now() }]).profile;
  if (o.part) q = addParts(q, [{ ...o.part, id: uid(), obtainedAt: Date.now() }]);
  if (o.give) q = addResources(q, o.give);
  return { profile: { ...q, shop: { ...q.shop, [section]: list.map((x) => (x.id === offerId ? { ...x, sold: true } : x)) } } };
}

export function buySpecial(p: Profile, id: string): { profile: Profile; got?: string; error?: 'resources' | 'not_found' } {
  const o = shopConfig.special.find((x) => x.id === id);
  if (!o) return { profile: p, error: 'not_found' };
  const paid = spend(p, o.price);
  if (!paid) return { profile: p, error: 'resources' };
  const tier = playerTier(p);
  switch (o.kind) {
    case 'legendary': {
      const it = generateItem({ rarity: 'legendary', tier, source: { kind: 'drop', location: Math.max(...p.locations.unlocked), enemy: 'спецмагазин' } });
      return { profile: addItems(paid, [it]).profile, got: it.name };
    }
    case 'epicPart': {
      const part = generatePart('epic');
      return { profile: addParts(paid, [part]), got: part.name };
    }
    case 'pass':
      return { profile: addResources(paid, { bossPasses: 1 }), got: 'Пропуск вызова босса' };
    case 'stabilizers':
      return { profile: addResources(paid, { stabilizers: 3 }), got: 'Стабилизаторы ×3' };
    case 'key':
      return { profile: addResources(paid, { expansionKeys: 1 }), got: 'Ключ расширения' };
  }
}

// ───────────── Обмен ─────────────

export interface ExchangeState {
  day: string;
  used: Record<string, number>;
}

export function exchangeUsed(p: Profile, id: string): number {
  return p.exchange.day === dayKey() ? (p.exchange.used[id] ?? 0) : 0;
}

export function doExchange(p: Profile, id: string): { profile: Profile; error?: 'limit' | 'resources' | 'not_found' } {
  const r = exchangeConfig.find((x) => x.id === id);
  if (!r) return { profile: p, error: 'not_found' };
  const used = exchangeUsed(p, id);
  if (used >= r.dailyLimit) return { profile: p, error: 'limit' };
  const paid = spend(p, { [r.from]: r.give });
  if (!paid) return { profile: p, error: 'resources' };
  const day = dayKey();
  const base = p.exchange.day === day ? p.exchange.used : {};
  return { profile: { ...addResources(paid, { [r.to]: r.get }), exchange: { day, used: { ...base, [id]: used + 1 } } } };
}

// ───────────── Награды за вход ─────────────

export interface DailyState {
  lastDay: string | null;
  /** Номер следующей награды в 7-дневном круге. */
  cycle: number;
}

export function canClaimDaily(p: Profile): boolean {
  return p.daily.lastDay !== dayKey();
}

export function dailyReward(p: Profile, index = p.daily.cycle): Partial<Resources> {
  return scaleRes(dailyRewards[index % dailyRewards.length], 1 + 0.5 * (playerTier(p) - 1));
}

export function claimDaily(p: Profile): { profile: Profile; reward?: Partial<Resources> } {
  if (!canClaimDaily(p)) return { profile: p };
  const reward = dailyReward(p);
  return {
    profile: { ...addResources(p, reward), daily: { lastDay: dayKey(), cycle: (p.daily.cycle + 1) % dailyRewards.length } },
    reward,
  };
}

// ───────────── Ежедневные задания ─────────────

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  target: number;
  progress: number;
  reward: Partial<Resources>;
  claimed: boolean;
}

export interface QuestState {
  day: string;
  list: Quest[];
  bonusClaimed: boolean;
}

function genQuests(p: Profile): Quest[] {
  const tier = playerTier(p);
  const pool = [...questPool].sort(() => random() - 0.5).slice(0, questsPerDay);
  return pool.map((q) => ({
    id: uid(),
    kind: q.kind,
    title: q.title,
    target: q.scale ? q.target * tier : q.target,
    progress: 0,
    reward: scaleRes(q.reward, 1 + 0.5 * (tier - 1)),
    claimed: false,
  }));
}

/** Новый набор заданий каждый календарный день. */
export function ensureQuests(p: Profile): Profile {
  const day = dayKey();
  if (p.quests.day === day && p.quests.list.length) return p;
  return { ...p, quests: { day, list: genQuests(p), bonusClaimed: false } };
}

export function questProgress(p: Profile, kind: QuestKind, amount = 1): Profile {
  if (amount <= 0 || !p.quests.list.some((q) => q.kind === kind && q.progress < q.target)) return p;
  const list = p.quests.list.map((q) => (q.kind === kind && q.progress < q.target ? { ...q, progress: Math.min(q.target, q.progress + amount) } : q));
  return { ...p, quests: { ...p.quests, list } };
}

export function claimQuest(p: Profile, id: string): Profile | null {
  const q = p.quests.list.find((x) => x.id === id);
  if (!q || q.claimed || q.progress < q.target) return null;
  const list = p.quests.list.map((x) => (x.id === id ? { ...x, claimed: true } : x));
  return { ...addResources(p, q.reward), quests: { ...p.quests, list } };
}

export function canClaimQuestBonus(p: Profile): boolean {
  return !p.quests.bonusClaimed && p.quests.list.length > 0 && p.quests.list.every((q) => q.claimed);
}

export function claimQuestBonus(p: Profile): Profile | null {
  if (!canClaimQuestBonus(p)) return null;
  return { ...addResources(p, questAllBonus), quests: { ...p.quests, bonusClaimed: true } };
}

export { canAfford };
