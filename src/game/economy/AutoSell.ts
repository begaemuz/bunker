import { betterSlotFor, complexScore } from '../bunker/compare';
import { computeBunkerStats } from '../bunker/BunkerStats';
import { rarityIndex } from '../items/ItemRarity';
import { itemQuality, sellPrice } from '../items/ItemGenerator';
import { pushHistory, type Profile } from '../profile/Profile';
import type { Item } from '../types';

/** Подходит ли вещь под правила автопродажи (без проверки «лучше установленного»). */
export function autoSellMatches(p: Profile, it: Item): boolean {
  if (it.rarity === 'unique' || it.rarity === 'mythic') return false;
  const { maxRarity, minQuality } = p.autoSell;
  if (maxRarity && rarityIndex(it.rarity) <= rarityIndex(maxRarity)) return true;
  // Сравниваем в целых процентах, как качество показано игроку.
  if (minQuality != null && Math.round(itemQuality(it) * 100) < minQuality) return true;
  return false;
}

/**
 * Автопродажа: новое оборудование продаётся сразу, если подходит по редкости
 * (до выбранной включительно) или по качеству (ниже порога).
 * Никогда не продаются уникальные и мифические предметы и предметы лучше установленных.
 */
export function applyAutoSell(p: Profile, items: Item[]): { profile: Profile; keep: Item[]; sold: Item[]; coins: number } {
  const { maxRarity, minQuality } = p.autoSell;
  if ((!maxRarity && minQuality == null) || !items.length) return { profile: p, keep: items, sold: [], coins: 0 };
  const base = complexScore(computeBunkerStats(p));
  const keep: Item[] = [];
  const sold: Item[] = [];
  let coins = 0;
  let history = p.history;
  for (const it of items) {
    if (!autoSellMatches(p, it) || betterSlotFor({ ...p, items: { ...p.items, [it.id]: it } }, it, base)) {
      keep.push(it);
      continue;
    }
    const price = sellPrice(it);
    coins += price;
    sold.push(it);
    history = pushHistory({ ...p, history }, { at: Date.now(), itemName: it.name, rarity: it.rarity, action: 'sold', detail: `автопродажа +${price}` });
  }
  return {
    profile: {
      ...p,
      history,
      resources: { ...p.resources, coins: p.resources.coins + coins },
      stats: { ...p.stats, itemsSold: p.stats.itemsSold + sold.length, itemsFound: p.stats.itemsFound + sold.length },
    },
    keep,
    sold,
    coins,
  };
}
