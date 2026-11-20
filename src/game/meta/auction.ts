// Аукцион за кристаллы: что уходит на сервер при выставлении лота
// и как посылки с сервера (кристаллы, выигранные вещи) попадают в профиль.
import { itemQuality } from '../items/ItemGenerator';
import { addParts, dropItemParts, partQuality } from '../items/Parts';
import { addResources, isEquipped, type Profile } from '../profile/Profile';
import type { EquipCategory, Item, Part, Rarity } from '../types';
import { ru } from '../../i18n/ru';

export const AUCTION_FEE = 0.1;
export const AUCTION_DURATIONS = [12, 24, 48];
export const AUCTION_MAX_LOTS = 5;

/** Содержимое лота: вещь вместе с установленными в неё модификациями или одна модификация. */
export type LotPayload = { item: Item; parts: Part[] } | { part: Part } | { res: TradableRes; amount: number };

/** Расходники, которые можно продавать на аукционе. */
export const TRADABLE_RES = ['skillResets', 'boost1', 'boost2', 'boost3'] as const;
export type TradableRes = (typeof TRADABLE_RES)[number];
export type LotKind = 'item' | 'part' | 'res';

export type TakeError = 'not_found' | 'equipped' | 'installed';

/** Убирает вещь со склада под лот. */
export function takeForLot(
  p: Profile,
  kind: LotKind,
  id: string,
): { profile: Profile; payload: LotPayload; quality: number } | { error: TakeError } {
  if (kind === 'res') {
    const res = TRADABLE_RES.find((r) => r === id);
    if (!res || p.resources[res] < 1) return { error: 'not_found' };
    return { profile: addResources(p, { [res]: -1 }), payload: { res, amount: 1 }, quality: 1 };
  }
  if (kind === 'item') {
    const item = p.items[id];
    if (!item) return { error: 'not_found' };
    if (isEquipped(p, id)) return { error: 'equipped' };
    const parts = item.slots.map((s) => (s.partId ? p.parts[s.partId] : null)).filter((x): x is Part => !!x);
    const base = dropItemParts(p, id);
    const items = { ...base.items };
    delete items[id];
    return { profile: { ...base, items }, payload: { item, parts }, quality: itemQuality(item) };
  }
  const part = p.parts[id];
  if (!part) return { error: 'not_found' };
  if (part.installedIn) return { error: 'installed' };
  const parts = { ...p.parts };
  delete parts[id];
  return { profile: { ...p, parts }, payload: { part }, quality: partQuality(part) };
}

/** Возвращает содержимое лота на склад (выигрыш, возврат, снятие с торгов). */
export function putLot(p: Profile, payload: LotPayload): Profile {
  if ('res' in payload) return TRADABLE_RES.includes(payload.res) ? addResources(p, { [payload.res]: Math.max(0, Math.floor(payload.amount)) }) : p;
  if ('part' in payload) return addParts(p, [{ ...payload.part, installedIn: null }]);
  // Склад полон — вещь всё равно кладём: она куплена за кристаллы.
  const items = { ...p.items, [payload.item.id]: payload.item };
  return addParts({ ...p, items }, payload.parts);
}

export interface Delivery {
  id: number;
  kind: 'crystals' | 'lot';
  amount: number;
  payload: LotPayload | null;
  note: string;
}

/** Применяет посылки с сервера. */
export function applyDeliveries(p: Profile, list: Delivery[]): Profile {
  let q = p;
  for (const d of list) {
    if (d.kind === 'crystals' && d.amount > 0) q = addResources(q, { crystals: d.amount });
    else if (d.kind === 'lot' && d.payload) q = putLot(q, d.payload);
  }
  return q;
}

/** Минимальная следующая ставка. */
export function minBid(start: number, bid: number | null): number {
  return bid == null ? start : bid + Math.max(1, Math.ceil(bid * 0.05));
}

/** Название, редкость и качество содержимого лота. */
export function lotInfo(payload: LotPayload): { name: string; rarity: Rarity; quality: number | null; category: EquipCategory | null } {
  if ('res' in payload) return { name: `${ru.resource[payload.res]}${payload.amount > 1 ? ` ×${payload.amount}` : ''}`, rarity: 'legendary', quality: null, category: null };
  if ('part' in payload) return { name: payload.part.name, rarity: payload.part.rarity, quality: partQuality(payload.part), category: null };
  return { name: payload.item.name, rarity: payload.item.rarity, quality: itemQuality(payload.item), category: payload.item.category };
}
