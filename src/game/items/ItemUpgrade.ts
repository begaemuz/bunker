import { vipLevel, vipPerks } from '../meta/vip';
import { balanceConfig } from '../config/balanceConfig';
import { canAfford, pushHistory, spend, unequipItem, type Profile } from '../profile/Profile';
import { techMeta } from '../progression/TechnologyTree';
import { chance } from '../rng';
import { dropItemParts } from './Parts';
import { RESOURCE_KEYS, type Item, type Resources } from '../types';

/** Максимальный уровень с учётом технологий. */
export function effectiveMaxLevel(p: Profile, item: Item): number {
  return item.maxLevel + techMeta(p, 'maxItemLevel');
}

/** Ограничение уровнем бункера: оборудование не выше уровня бункера + N. */
export function bunkerLevelCap(p: Profile): number {
  return p.bunker.level + balanceConfig.item.levelOverBunker;
}

export function upgradeCost(p: Profile, item: Item): Partial<Resources> {
  const u = balanceConfig.upgrade;
  const mult =
    Math.pow(1 + item.level, u.exponent) *
    u.rarityMult[item.rarity] *
    (1 + 0.5 * (item.tier - 1)) *
    Math.max(0.3, 1 + techMeta(p, 'upgradeCost'));
  const out: Partial<Resources> = {};
  for (const k of RESOURCE_KEYS) {
    const b = u.base[k];
    if (b) out[k] = Math.ceil(b * mult);
  }
  if (item.level + 1 >= u.coresFromLevel) out.energyCores = u.coresPerLevel * (item.level + 2 - u.coresFromLevel);
  return out;
}

export function upgradeChance(p: Profile, item: Item): number {
  const u = balanceConfig.upgrade;
  const base = u.successChance[item.level - 1] ?? u.minChance;
  const vip = vipPerks(vipLevel(p.vip?.points ?? 0)).upgradeChance;
  return Math.min(0.99, Math.max(u.minChance, base + techMeta(p, 'upgradeChance') + vip));
}

export type UpgradeBlock = 'max' | 'bunker' | 'resources' | 'stabilizer' | null;

export function upgradeBlock(p: Profile, item: Item, useStabilizer: boolean): UpgradeBlock {
  if (item.level >= effectiveMaxLevel(p, item)) return 'max';
  if (item.level >= bunkerLevelCap(p)) return 'bunker';
  if (!canAfford(p, upgradeCost(p, item))) return 'resources';
  if (useStabilizer && p.resources.stabilizers < 1) return 'stabilizer';
  return null;
}

export type UpgradeOutcome = 'success' | 'failed_protected' | 'destroyed';

/**
 * Попытка улучшения. Ресурсы списываются всегда. При неудаче без
 * стабилизатора предмет уничтожается вместе с установленными модификациями.
 */
export function tryUpgrade(
  p: Profile,
  itemId: string,
  useStabilizer: boolean,
): { profile: Profile; outcome?: UpgradeOutcome; error?: UpgradeBlock | 'not_found' } {
  const item = p.items[itemId];
  if (!item) return { profile: p, error: 'not_found' };
  const block = upgradeBlock(p, item, useStabilizer);
  if (block) return { profile: p, error: block };

  let q = spend(p, upgradeCost(p, item))!;
  if (useStabilizer) q = { ...q, resources: { ...q.resources, stabilizers: q.resources.stabilizers - 1 } };

  if (chance(upgradeChance(p, item))) {
    const upgraded: Item = { ...item, level: item.level + 1 };
    return {
      profile: {
        ...q,
        items: { ...q.items, [itemId]: upgraded },
        stats: { ...q.stats, upgradesSucceeded: q.stats.upgradesSucceeded + 1 },
        history: pushHistory(q, { at: Date.now(), itemName: item.name, rarity: item.rarity, action: 'upgraded', detail: `уровень ${upgraded.level}` }),
      },
      outcome: 'success',
    };
  }
  if (useStabilizer) {
    return {
      profile: { ...q, stats: { ...q.stats, upgradesFailed: q.stats.upgradesFailed + 1 } },
      outcome: 'failed_protected',
    };
  }
  q = dropItemParts(unequipItem(q, itemId), itemId);
  const items = { ...q.items };
  delete items[itemId];
  return {
    profile: {
      ...q,
      items,
      stats: {
        ...q.stats,
        upgradesFailed: q.stats.upgradesFailed + 1,
        itemsDestroyed: q.stats.itemsDestroyed + 1,
      },
      history: pushHistory(q, { at: Date.now(), itemName: item.name, rarity: item.rarity, action: 'destroyed', detail: `неудачное улучшение до ${item.level + 1}` }),
    },
    outcome: 'destroyed',
  };
}
