import type { StatKey } from '../types';

export type StatFormat = 'flat' | 'pct' | 'perSec' | 'int';

/** Как показывать значение характеристики. */
export function statFormat(stat: StatKey): StatFormat {
  if (stat.startsWith('resist:') || stat.startsWith('extra:') || stat.startsWith('chance:')) return 'pct';
  switch (stat) {
    case 'hpPct':
    case 'radiusPct':
    case 'damagePct':
    case 'ratePct':
    case 'energyUsePct':
    case 'critChance':
    case 'critDamage':
    case 'effectPower':
    case 'dropChancePct':
    case 'coinPct':
      return 'pct';
    case 'regenFlat':
    case 'energyGen':
      return 'perSec';
    case 'effectSlots':
      return 'int';
    default:
      return 'flat';
  }
}

export function isIntegerStat(stat: StatKey): boolean {
  return stat === 'effectSlots' || stat === 'hpFlat' || stat === 'batteryCap';
}

/** true, если отрицательное значение — это хорошо (снижение расхода). */
export function lowerIsBetter(stat: StatKey): boolean {
  return stat === 'energyUsePct';
}

export function formatStatValue(stat: StatKey, value: number): string {
  const f = statFormat(stat);
  const sign = value >= 0 ? '+' : '−';
  const abs = Math.abs(value);
  switch (f) {
    case 'pct':
      return `${sign}${(abs * 100).toFixed(abs * 100 < 10 ? 1 : 0)}%`;
    case 'perSec':
      return `${sign}${abs.toFixed(1)}/с`;
    case 'int':
      return `${sign}${Math.round(abs)}`;
    default:
      return `${sign}${abs >= 10 ? Math.round(abs) : abs.toFixed(1)}`;
  }
}
