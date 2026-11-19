import { RARITIES, type Rarity } from '../types';
import { pickWeighted } from '../rng';

export function rollRarity(table: Record<Rarity, number>, luck = 0): Rarity {
  // luck сдвигает вероятность в сторону более редких предметов.
  return pickWeighted(RARITIES, (r) => {
    const idx = RARITIES.indexOf(r);
    return table[r] * (idx > 0 ? 1 + luck * idx : 1);
  });
}

export function rarityIndex(r: Rarity): number {
  return RARITIES.indexOf(r);
}

export function isAtLeast(r: Rarity, min: Rarity): boolean {
  return rarityIndex(r) >= rarityIndex(min);
}

/** Проверка, что таблица вероятностей суммируется до 1. */
export function validateRarityTable(table: Record<Rarity, number>): boolean {
  const sum = RARITIES.reduce((s, r) => s + table[r], 0);
  return Math.abs(sum - 1) < 1e-6;
}
