import { balanceConfig } from '../config/balanceConfig';
import type { LocationDef } from '../config/locationsConfig';

/**
 * Снижение опыта и монет за слишком слабых противников:
 * выше «потолка» локации награды падают, но не до нуля.
 */
export function rewardDecay(bunkerLevel: number, loc: LocationDef): number {
  const over = bunkerLevel - loc.levelCap;
  if (over <= 0) return 1;
  const d = balanceConfig.rewardDecay;
  return Math.max(d.min, 1 - d.step * over);
}
