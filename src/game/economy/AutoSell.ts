import { betterSlotFor, complexScore } from '../bunker/compare';
import { computeBunkerStats } from '../bunker/BunkerStats';
import { rarityIndex } from '../items/ItemRarity';
import { sellPrice } from '../items/ItemGenerator';
import { pushHistory, type Profile } from '../profile/Profile';
import type { Item } from '../types';

/**
 * Автопродажа: новое оборудование до выбранной редкости продаётся сразу.
 * Никогда не продаются уникальные предметы и предметы лучше установленных.
 */
export function applyAutoSell(p: Profile, items: Item[]): { profile: Profile; keep: Item[]; sold: Item[]; coins: number } {
  const max = p.autoSell.maxRarity;
  if (!max || !items.length) return { profile: p, keep: items, sold: [], coins: 0 };
  const base = complexScore(computeBunkerStats(p));
  const keep: Item[] = [];
  const sold: Item[] = [];
  let coins = 0;
  let history = p.history;
  for (const it of items) {
    const eligible = it.rarity !== 'unique' && it.rarity !== 'mythic' && rarityIndex(it.rarity) <= rarityIndex(max);
    if (!eligible || betterSlotFor({ ...p, items: { ...p.items, [it.id]: it } }, it, base)) {
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
