import { gameNow, serverDate, SERVER_TZ_OFFSET } from './clock';
import { exchangeConfig, loginCalendar, questConfig, shopConfig, type QuestKind, type QuestPeriod } from '../config/metaConfig';
import { getLocation } from '../config/locationsConfig';
import { generateItem, itemQuality, sellPrice } from '../items/ItemGenerator';
import { rollRarity } from '../items/ItemRarity';
import { generatePart } from '../items/Parts';
import { addItems, addResources, canAfford, spend, type Profile } from '../profile/Profile';
import { addParts } from '../items/Parts';
import { random, uid } from '../rng';
import { vipLevel, vipPerks } from './vip';
import { RESOURCE_KEYS, type Item, type Part, type Resources } from '../types';

// ───────────── Время ─────────────

/** Календарный день по времени сервера (МСК). */
export function dayKey(t = gameNow()): string {
  const d = serverDate(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Неделя: ключ — дата понедельника. */
export function weekKey(t = gameNow()): string {
  const shift = (serverDate(t).getUTCDay() + 6) % 7;
  return dayKey(t - shift * 86400_000);
}

export function monthKey(t = gameNow()): string {
  const d = serverDate(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function periodKey(period: QuestPeriod, t = gameNow()): string {
  return period === 'day' ? dayKey(t) : period === 'week' ? weekKey(t) : monthKey(t);
}

/** Когда обновится период (полночь по времени сервера), UTC мс. */
export function periodEnds(period: QuestPeriod, t = gameNow()): number {
  const d = serverDate(t);
  d.setUTCHours(0, 0, 0, 0);
  if (period === 'day') d.setUTCDate(d.getUTCDate() + 1);
  else if (period === 'week') d.setUTCDate(d.getUTCDate() + (7 - ((d.getUTCDay() + 6) % 7)));
  else {
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d.getTime() - SERVER_TZ_OFFSET;
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

/** Масштабирует только обычные ресурсы; кристаллы, ключи и пропуски — как есть. */
const SCALABLE = new Set(['coins', 'scrap', 'techParts', 'blueprints']);
function scaleSoft(r: Partial<Resources>, m: number): Partial<Resources> {
  const out: Partial<Resources> = {};
  for (const k of RESOURCE_KEYS) if (r[k]) out[k] = SCALABLE.has(k) ? Math.ceil(r[k]! * m) : r[k];
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
  /** Начало текущего окна ручных обновлений (лимит на 8 часов). */
  refreshWindow?: number;
  /** Версия цен: при смене цен ассортимент пересоздаётся. */
  priceV?: number;
  regular: Offer[];
  rare: Offer[];
}

export function emptyShop(): ShopState {
  return { refreshedAt: 0, refreshDay: '', refreshes: 0, regular: [], rare: [] };
}

/** Цены магазина растут с Т так же, как доход с роботов. */
function tierPrice(tier: number): number {
  return Math.pow(1.45, tier - 1);
}

/** Цена вещи в магазине: по редкости, Т и качеству. */
const ITEM_PRICE: Partial<Record<string, number>> = { common: 600, uncommon: 2000, rare: 7000, epic: 25000, legendary: 90000 };

function genShop(p: Profile): Pick<ShopState, 'regular' | 'rare'> {
  const tier = playerTier(p);
  const tp = tierPrice(tier);
  const loc = Math.max(...p.locations.unlocked);
  const c = shopConfig.regular;
  const regular: Offer[] = [];
  for (let i = 0; i < c.equipment; i++) {
    const item = generateItem({ rarity: rollRarity(c.rarity), tier, source: { kind: 'drop', location: loc, enemy: 'магазин' } });
    const base = (ITEM_PRICE[item.rarity] ?? 600) * tp * (0.8 + 0.5 * itemQuality(item));
    regular.push({ id: uid(), kind: 'item', item, price: { coins: Math.max(sellPrice(item) * c.priceMult, Math.round(base / 10) * 10) }, sold: false });
  }
  for (let i = 0; i < c.parts; i++) {
    const part = generatePart(rollRarity({ common: 0.5, uncommon: 0.35, rare: 0.15, epic: 0, legendary: 0, unique: 0, mythic: 0 }));
    regular.push({ id: uid(), kind: 'part', part, price: { coins: Math.round((800 * tp * [1, 3, 9][Math.max(0, ['common', 'uncommon', 'rare'].indexOf(part.rarity))]) / 10) * 10 }, sold: false });
  }
  const packs = [...shopConfig.resourcePacks].sort(() => random() - 0.5).slice(0, c.resources);
  for (const pk of packs) regular.push({ id: uid(), kind: 'resource', give: scaleRes(pk.give, 1 + 0.5 * (tier - 1)), price: scaleRes(pk.price, 2 * tp), sold: false });

  const r = shopConfig.rare;
  const rare: Offer[] = [];
  for (let i = 0; i < r.parts; i++) {
    const part = generatePart(rollRarity(r.rarity));
    const mult = { rare: 1, epic: 2.5, legendary: 6 }[part.rarity as 'rare' | 'epic' | 'legendary'] ?? 1;
    rare.push({ id: uid(), kind: 'part', part, price: { coins: Math.ceil(3000 * tp * mult), blueprints: Math.ceil(2 * mult) }, sold: false });
  }
  rare.push({ id: uid(), kind: 'key', give: { expansionKeys: 1 }, price: scaleRes(r.keyPrice, tier), sold: false });
  return { regular, rare };
}

/** Автоматическое обновление ассортимента по реальному времени. */
export function ensureShop(p: Profile, now = Date.now()): Profile {
  const s = p.shop;
  const due = now - s.refreshedAt >= shopConfig.refreshHours * 3600_000 || s.regular.length === 0 || (s.priceV ?? 1) < SHOP_PRICE_V;
  let next = s;
  // Лимит ручных обновлений: 5 штук, потом ждать до конца 8-часового окна.
  if (s.refreshes > 0 && now - (s.refreshWindow ?? 0) >= SHOP_WINDOW_MS) next = { ...next, refreshes: 0, refreshWindow: 0 };
  if (due) next = { ...next, ...genShop(p), refreshedAt: now, priceV: SHOP_PRICE_V };
  return next === s ? p : { ...p, shop: next };
}

export const SHOP_REFRESH_LIMIT = 5;
const SHOP_PRICE_V = 2;
export const SHOP_WINDOW_MS = 8 * 3600_000;

/** Сколько ручных обновлений осталось и когда лимит восстановится. */
export function shopRefreshState(p: Profile, now = Date.now()): { left: number; resetIn: number } {
  const s = p.shop;
  const expired = s.refreshes > 0 && now - (s.refreshWindow ?? 0) >= SHOP_WINDOW_MS;
  const used = expired ? 0 : s.refreshes;
  return { left: Math.max(0, SHOP_REFRESH_LIMIT - used), resetIn: used > 0 ? Math.max(0, (s.refreshWindow ?? 0) + SHOP_WINDOW_MS - now) : 0 };
}

export function shopRefreshCost(p: Profile): Partial<Resources> {
  const used = SHOP_REFRESH_LIMIT - shopRefreshState(p).left;
  return { coins: Math.round((shopConfig.refreshBase * 4 * tierPrice(playerTier(p)) * (1 + used)) / 10) * 10 };
}

export function refreshShop(p: Profile): Profile | null {
  const st = shopRefreshState(p);
  if (st.left <= 0) return null;
  const paid = spend(p, shopRefreshCost(p));
  if (!paid) return null;
  const now = Date.now();
  const fresh = st.left === SHOP_REFRESH_LIMIT;
  const refreshes = fresh ? 1 : paid.shop.refreshes + 1;
  return { ...paid, shop: { ...paid.shop, ...genShop(paid), refreshedAt: now, refreshes, refreshWindow: fresh ? now : paid.shop.refreshWindow } };
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

/** Сколько ещё можно купить в этом месяце (null — без лимита). */
export function specialLeft(p: Profile, id: string): number | null {
  const o = shopConfig.special.find((x) => x.id === id) as { monthlyLimit?: number } | undefined;
  if (!o?.monthlyLimit) return null;
  const used = p.limits?.month === monthKey() ? (p.limits.used[id] ?? 0) : 0;
  return Math.max(0, o.monthlyLimit - used);
}

export function buySpecial(p: Profile, id: string): { profile: Profile; got?: string; error?: 'resources' | 'not_found' | 'limit' } {
  const o = shopConfig.special.find((x) => x.id === id);
  if (!o) return { profile: p, error: 'not_found' };
  const left = specialLeft(p, id);
  if (left === 0) return { profile: p, error: 'limit' };
  let paid = spend(p, o.price);
  if (!paid) return { profile: p, error: 'resources' };
  if (left !== null) {
    const mk = monthKey();
    const used = paid.limits?.month === mk ? paid.limits.used : {};
    paid = { ...paid, limits: { month: mk, used: { ...used, [id]: (used[id] ?? 0) + 1 } } };
  }
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
    case 'boost1':
    case 'boost2':
    case 'boost3':
      return { profile: addResources(paid, { [o.kind]: 1 }), got: o.title };
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
  if (used >= exchangeLimit(p, r.dailyLimit)) return { profile: p, error: 'limit' };
  const paid = spend(p, { [r.from]: r.give });
  if (!paid) return { profile: p, error: 'resources' };
  const day = dayKey();
  const base = p.exchange.day === day ? p.exchange.used : {};
  return { profile: { ...addResources(paid, { [r.to]: r.get }), exchange: { day, used: { ...base, [id]: used + 1 } } } };
}

// ───────────── Награды за вход (30 дней) ─────────────

export interface DailyState {
  lastDay: string | null;
  /** Номер следующей награды в 30-дневном календаре. */
  cycle: number;
}

export const LOGIN_DAYS = loginCalendar.length;

export function canClaimDaily(p: Profile): boolean {
  return p.daily.lastDay !== dayKey();
}

export function dailyReward(p: Profile, index = p.daily.cycle): Partial<Resources> {
  const base = scaleSoft(loginCalendar[index % LOGIN_DAYS].reward, 1 + 0.5 * (playerTier(p) - 1));
  const m = vipPerks(vipLevel(p.vip?.points ?? 0)).loginMult;
  return m > 1 ? scaleRes(base, m) : base;
}

/** Дневной лимит обмена с учётом VIP. */
export function exchangeLimit(p: Profile, base: number): number {
  return Math.floor(base * vipPerks(vipLevel(p.vip?.points ?? 0)).exchangeMult);
}

export function claimDaily(p: Profile): { profile: Profile; reward?: Partial<Resources> } {
  if (!canClaimDaily(p)) return { profile: p };
  const reward = dailyReward(p);
  const q = { ...addResources(p, reward), daily: { lastDay: dayKey(), cycle: (p.daily.cycle + 1) % LOGIN_DAYS } };
  return { profile: questProgress(q, 'login'), reward };
}

// ───────────── Задания: день, неделя, месяц ─────────────

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  target: number;
  progress: number;
  reward: Partial<Resources>;
  claimed: boolean;
}

export interface QuestSet {
  key: string;
  list: Quest[];
  bonusClaimed: boolean;
}

export type QuestState = Record<QuestPeriod, QuestSet>;

export const QUEST_PERIODS: QuestPeriod[] = ['day', 'week', 'month'];

export function emptyQuests(): QuestState {
  return { day: { key: '', list: [], bonusClaimed: false }, week: { key: '', list: [], bonusClaimed: false }, month: { key: '', list: [], bonusClaimed: false } };
}

/**
 * Цель задания. Монеты растут с тех. уровнем. Счётчики боя (роботы, группы)
 * на первых локациях мягче: там роботы слабее и идут реже.
 */
export function questTarget(target: number, scale: boolean, kind: string, tier: number): number {
  if (scale) return target * tier;
  const combat = kind === 'kill' || kind === 'killHeavy' || kind === 'groups' || kind === 'miniboss' || kind === 'items' || kind === 'dismantle';
  const k = combat ? Math.min(1, 0.6 + 0.1 * (tier - 1)) : 1;
  const v = target * k;
  return v >= 100 ? Math.round(v / 50) * 50 : Math.max(1, Math.round(v));
}

function genQuests(p: Profile, period: QuestPeriod): Quest[] {
  const tier = playerTier(p);
  const cfg = questConfig[period];
  const pool = [...cfg.pool].sort(() => random() - 0.5).slice(0, cfg.count);
  return pool.map((q) => ({
    id: uid(),
    kind: q.kind,
    title: q.title,
    target: questTarget(q.target, q.scale, q.kind, tier),
    progress: 0,
    reward: scaleSoft(q.reward, 1 + 0.5 * (tier - 1)),
    claimed: false,
  }));
}

export function questBonus(period: QuestPeriod): Partial<Resources> {
  return questConfig[period].bonus;
}

/** Новый набор заданий при смене дня, недели или месяца. */
export function ensureQuests(p: Profile): Profile {
  let q = p.quests;
  let changed = false;
  for (const period of QUEST_PERIODS) {
    const key = periodKey(period);
    const cur = q[period];
    // Если задание убрали из списка (например, «улучшить» из ежедневных) — пересоздаём период.
    const valid = cur?.list.every((x) => questConfig[period].pool.some((d) => d.kind === x.kind));
    if (cur && cur.key === key && cur.list.length && valid) continue;
    q = { ...q, [period]: { key, list: genQuests(p, period), bonusClaimed: false } };
    changed = true;
  }
  return changed ? { ...p, quests: q } : p;
}

export function questProgress(p: Profile, kind: QuestKind, amount = 1): Profile {
  if (amount <= 0) return p;
  let q = p.quests;
  let changed = false;
  for (const period of QUEST_PERIODS) {
    const set = q[period];
    if (!set?.list.some((x) => x.kind === kind && x.progress < x.target)) continue;
    const list = set.list.map((x) => (x.kind === kind && x.progress < x.target ? { ...x, progress: Math.min(x.target, x.progress + amount) } : x));
    q = { ...q, [period]: { ...set, list } };
    changed = true;
  }
  return changed ? { ...p, quests: q } : p;
}

export function claimQuest(p: Profile, id: string): Profile | null {
  for (const period of QUEST_PERIODS) {
    const set = p.quests[period];
    const x = set.list.find((y) => y.id === id);
    if (!x) continue;
    if (x.claimed || x.progress < x.target) return null;
    const list = set.list.map((y) => (y.id === id ? { ...y, claimed: true } : y));
    return { ...addResources(p, x.reward), quests: { ...p.quests, [period]: { ...set, list } } };
  }
  return null;
}

export function canClaimQuestBonus(p: Profile, period: QuestPeriod): boolean {
  const set = p.quests[period];
  return !set.bonusClaimed && set.list.length > 0 && set.list.every((q) => q.claimed);
}

export function claimQuestBonus(p: Profile, period: QuestPeriod): Profile | null {
  if (!canClaimQuestBonus(p, period)) return null;
  const set = p.quests[period];
  let q: Profile = { ...addResources(p, questBonus(period)), quests: { ...p.quests, [period]: { ...set, bonusClaimed: true } } };
  if (period === 'day') q = questProgress(q, 'dailyAll');
  return q;
}

/** Сколько наград можно забрать в периоде (задания + бонус). */
export function questClaimable(p: Profile, period: QuestPeriod): number {
  const set = p.quests[period];
  return set.list.filter((q) => !q.claimed && q.progress >= q.target).length + (canClaimQuestBonus(p, period) ? 1 : 0);
}

export { canAfford };
