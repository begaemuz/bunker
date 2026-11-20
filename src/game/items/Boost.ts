// Бустеры: разовое случайное изменение основных характеристик вещи.
// Результат может быть и в плюс, и в минус. После буста вещь нельзя
// ни бустить снова, ни улучшать — поэтому сначала точим до максимума.
import { pushHistory, type Profile } from '../profile/Profile';
import { chance, randFloat } from '../rng';
import type { Item } from '../types';

export const BOOSTERS = ['boost1', 'boost2', 'boost3'] as const;
export type BoosterKey = (typeof BOOSTERS)[number];

/** Разброс бустеров: доля изменения характеристик. */
export const BOOST_RANGE: Record<BoosterKey, [number, number]> = {
  boost1: [0, 0.1],
  boost2: [0.1, 0.2],
  boost3: [0.15, 0.3],
};

export const BOOST_NAME: Record<BoosterKey, string> = {
  boost1: 'Бустер I',
  boost2: 'Бустер II',
  boost3: 'Бустер III',
};

/** Множитель основных характеристик от буста. */
export function boostMult(item: Item): number {
  return 1 + (item.boost ?? 0);
}

export type BoostError = 'not_found' | 'boosted' | 'no_booster';

/** Применяет бустер к вещи. */
export function boostItem(p: Profile, itemId: string, key: BoosterKey): { profile: Profile; boost?: number; error?: BoostError } {
  const item = p.items[itemId];
  if (!item) return { profile: p, error: 'not_found' };
  if (item.boost != null) return { profile: p, error: 'boosted' };
  if (p.resources[key] < 1) return { profile: p, error: 'no_booster' };
  const [lo, hi] = BOOST_RANGE[key];
  // Величина — случайная в диапазоне, знак — 50 на 50.
  const size = Math.round(randFloat(lo, hi) * 1000) / 1000;
  const boost = chance(0.5) ? size : -size;
  const boosted: Item = { ...item, boost, boostedWith: key };
  const sign = boost >= 0 ? '+' : '−';
  return {
    profile: {
      ...p,
      items: { ...p.items, [itemId]: boosted },
      resources: { ...p.resources, [key]: p.resources[key] - 1 },
      history: pushHistory(p, { at: Date.now(), itemName: item.name, rarity: item.rarity, action: 'upgraded', detail: `буст ${sign}${Math.round(Math.abs(boost) * 1000) / 10}%` }),
    },
    boost,
  };
}
