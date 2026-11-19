import { equipItem, type Profile } from '../profile/Profile';
import { SLOT_CATEGORY, SLOT_IDS, type Item, type SlotId } from '../types';
import { computeBunkerStats, type BunkerStats } from './BunkerStats';

/**
 * Общая оценка комплекса: устойчивый урон с учётом сенсоров
 * и живучесть (прочность, снижение урона, ремонт).
 */
export function complexScore(s: BunkerStats): number {
  const dps = s.sustainedDps * (1 + (s.identifiedBonus + s.markBonus) * 0.7) + 1;
  const ehp = (s.maxHp / Math.max(0.2, 1 - s.damageReduction) + s.regen * 60) * (1 + s.emergencyRepair);
  // Запас энергии и охлаждения тоже ценен: он позволит поставить катушки мощнее.
  const coilEnergy = s.coils.reduce((a, c) => a + c.energyPerSec, 0);
  const coilHeat = s.coils.reduce((a, c) => a + c.heatPerSec, 0);
  const energyRoom = Math.min(2, Math.max(0, (s.usablePower - s.passiveDrain - coilEnergy) / Math.max(1, coilEnergy)));
  const heatRoom = Math.min(2, Math.max(0, (s.coolRate - coilHeat) / Math.max(1, coilHeat)));
  const capRoom = Math.min(1, s.capacity / 200);
  return dps * Math.sqrt(ehp / 1000) * (0.5 + 0.5 * s.passiveEfficiency) * (1 + 0.08 * energyRoom + 0.06 * heatRoom + 0.05 * capRoom);
}

export interface UpgradeHint {
  slot: SlotId;
  /** Относительный прирост оценки комплекса (0.1 = +10%). */
  gain: number;
}

/** Лучше ли предмет установленного: в какой слот и насколько. */
export function betterSlotFor(p: Profile, item: Item, baseScore?: number): UpgradeHint | null {
  const base = baseScore ?? complexScore(computeBunkerStats(p));
  // Установленные предметы не сравниваем (не предлагаем переставлять катушки).
  if (SLOT_IDS.some((s) => p.equipment[s] === item.id)) return null;
  let best: UpgradeHint | null = null;
  for (const slot of SLOT_IDS) {
    if (SLOT_CATEGORY[slot] !== item.category) continue;
    if (!p.equipment[slot]) return { slot, gain: 1 };
    const r = equipItem(p, item.id, slot);
    if (r.error) continue;
    const gain = complexScore(computeBunkerStats(r.profile)) / base - 1;
    if (gain > 0.01 && (!best || gain > best.gain)) best = { slot, gain };
  }
  return best;
}

/** Подсказки для всех неустановленных предметов. */
export function upgradeHints(p: Profile): Map<string, UpgradeHint> {
  const base = complexScore(computeBunkerStats(p));
  const out = new Map<string, UpgradeHint>();
  for (const it of Object.values(p.items)) {
    const h = betterSlotFor(p, it, base);
    if (h) out.set(it.id, h);
  }
  return out;
}

/** Боевая мощь комплекса — одно число для оценки силы бункера. */
export function combatPower(s: BunkerStats): number {
  return Math.round(complexScore(s) * 10);
}
