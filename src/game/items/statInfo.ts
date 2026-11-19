import type { StatKey } from '../types';

export type StatFormat = 'flat' | 'pct' | 'perSec' | 'abs';

const PCT_KEYS = new Set<string>([
  'genPowerPct',
  'capacityPct',
  'dischargeBonus',
  'drainPct',
  'coilPowerPct',
  'coilRadiusPct',
  'coilRatePct',
  'pulseCostPct',
  'coolRatePct',
  'heatPct',
  'overdrive',
  'identifySpeed',
  'identifiedBonus',
  'critChance',
  'critDamage',
  'hullPct',
  'damageReduction',
  'emergencyRepair',
  'moduleBonus',
  'coinPct',
  'dropChancePct',
  'xpPct',
]);

/** Как показывать значение характеристики. */
export function statFormat(stat: StatKey): StatFormat {
  if (stat.startsWith('resist:') || stat.startsWith('mode:') || stat.startsWith('chance:')) return 'pct';
  if (stat === 'conversion') return 'abs';
  if (PCT_KEYS.has(stat)) return 'pct';
  if (stat === 'genPower' || stat === 'chargeRate' || stat === 'coolRate' || stat === 'regen') return 'perSec';
  return 'flat';
}

/**
 * «Плоские» характеристики растут с редкостью и уровнем полностью,
 * процентные — мягче, чтобы не уходить в бесконечность.
 */
export function isFlatScaling(stat: StatKey): boolean {
  return (
    stat === 'genPower' ||
    stat === 'capacity' ||
    stat === 'chargeRate' ||
    stat === 'coolRate' ||
    stat === 'heatCap' ||
    stat === 'hullHp' ||
    stat === 'regen'
  );
}

/** Отрицательное значение — это хорошо (меньше расход/нагрев). */
export function lowerIsBetter(stat: StatKey): boolean {
  return stat === 'pulseCostPct' || stat === 'drainPct' || stat === 'heatPct';
}

/** Недостаток предмета: не усиливается редкостью и уровнем. */
export function isDrawback(stat: StatKey, value: number): boolean {
  return lowerIsBetter(stat) ? value > 0 : value < 0;
}

export function formatStatValue(stat: StatKey, value: number): string {
  const f = statFormat(stat);
  const sign = value >= 0 ? '+' : '−';
  const abs = Math.abs(value);
  switch (f) {
    case 'abs':
      return `${(value * 100).toFixed(1)}%`;
    case 'pct':
      return `${sign}${(abs * 100).toFixed(abs * 100 < 10 ? 1 : 0)}%`;
    case 'perSec':
      return `${sign}${abs.toFixed(1)}/с`;
    default:
      return `${sign}${abs >= 10 ? Math.round(abs) : abs.toFixed(1)}`;
  }
}
