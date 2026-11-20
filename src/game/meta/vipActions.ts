import { generateItem } from '../items/ItemGenerator';
import { addParts, generatePart } from '../items/Parts';
import { addItems, addResources, type Profile } from '../profile/Profile';
import type { Item, Part } from '../types';
import { dayKey, playerTier } from './Meta';
import { VIP_GIFTS, vipChest, vipLevel } from './vip';

export function canClaimVipChest(p: Profile): boolean {
  return vipLevel(p.vip.points) >= 1 && p.vip.chestDay !== dayKey();
}

export function claimVipChest(p: Profile): Profile | null {
  if (!canClaimVipChest(p)) return null;
  return { ...addResources(p, vipChest(vipLevel(p.vip.points))), vip: { ...p.vip, chestDay: dayKey() } };
}

export function giftClaimable(p: Profile, level: number): boolean {
  return vipLevel(p.vip.points) >= level && !(p.vip.gifts ?? []).includes(level) && !!VIP_GIFTS[level];
}

/** Забрать подарок уровня VIP: ресурсы, модификации, вещи, эксклюзивы. */
export function claimVipGift(p: Profile, level: number): { profile: Profile; items: Item[]; parts: Part[] } | null {
  if (!giftClaimable(p, level)) return null;
  const tier = playerTier(p);
  let q = p;
  const items: Item[] = [];
  const parts: Part[] = [];
  for (const g of VIP_GIFTS[level]) {
    if (g.kind === 'res') q = addResources(q, g.res);
    if (g.kind === 'parts') for (let i = 0; i < g.count; i++) parts.push(generatePart(g.rarity));
    if (g.kind === 'item') items.push(generateItem({ rarity: g.rarity, category: g.category, tier, source: { kind: 'drop', location: Math.max(...p.locations.unlocked), enemy: `подарок VIP ${level}` } }));
    if (g.kind === 'unique') items.push(generateItem({ templateId: g.templateId, rarity: 'legendary', tier, source: { kind: 'drop', location: Math.max(...p.locations.unlocked), enemy: `подарок VIP ${level}` } }));
  }
  if (items.length) q = addItems(q, items).profile;
  if (parts.length) q = addParts(q, parts);
  return { profile: { ...q, vip: { ...q.vip, gifts: [...(q.vip.gifts ?? []), level] } }, items, parts };
}
