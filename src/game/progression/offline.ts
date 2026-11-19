import { getLocation } from '../config/locationsConfig';
import { partDrops } from '../config/partsConfig';
import type { RunStats } from '../engine/GameEngine';
import { generateItem } from '../items/ItemGenerator';
import { rollRarity } from '../items/ItemRarity';
import { generatePart } from '../items/Parts';
import type { OfflineRates, Profile } from '../profile/Profile';
import { vipLevel, vipPerks } from '../meta/vip';
import { RESOURCE_KEYS, type Item, type Part, type Resources } from '../types';

export const offlineConfig = {
  /** Офлайн бункер работает менее эффективно, чем под присмотром. */
  efficiency: 0.5,
  maxSeconds: 8 * 3600,
  minSeconds: 60,
  maxItems: 25,
  maxParts: 10,
};

/** Темпы добычи по статистике текущего захода. */
export function ratesFromRun(run: RunStats, location: number): OfflineRates | null {
  if (run.time < 60) return null;
  const t = run.time;
  const resources: Partial<Resources> = {};
  for (const k of RESOURCE_KEYS) if (run.resources[k] > 0) resources[k] = run.resources[k] / t;
  return {
    location,
    resources,
    xp: run.xp / t,
    kills: run.kills / t,
    groups: run.groupsCleared / t,
    items: run.items.length / t,
    parts: run.parts / t,
  };
}

export interface OfflineReward {
  seconds: number;
  location: number;
  resources: Partial<Resources>;
  xp: number;
  kills: number;
  groups: number;
  items: Item[];
  parts: Part[];
}

/** Награда за время отсутствия по темпам последнего боя. */
export function computeOfflineReward(p: Profile, now = Date.now()): OfflineReward | null {
  const r = p.offline.rates;
  const perks = vipPerks(vipLevel(p.vip?.points ?? 0));
  const away = Math.min(offlineConfig.maxSeconds + perks.offlineHours * 3600, (now - p.offline.lastSeen) / 1000);
  if (!r || away < offlineConfig.minSeconds) return null;
  const t = away * (offlineConfig.efficiency + perks.offlineEff);
  const loc = getLocation(r.location);
  const resources: Partial<Resources> = {};
  for (const k of RESOURCE_KEYS) {
    const v = Math.floor((r.resources[k] ?? 0) * t);
    // Пропуски и ключи офлайн не начисляются.
    if (v > 0 && k !== 'bossPasses' && k !== 'expansionKeys') resources[k] = v;
  }
  const nItems = Math.min(offlineConfig.maxItems, Math.floor(r.items * t));
  const items: Item[] = [];
  for (let i = 0; i < nItems; i++) {
    items.push(generateItem({ rarity: rollRarity(loc.rarity), tier: loc.tier, source: { kind: 'drop', location: loc.id, enemy: 'офлайн-оборона' } }));
  }
  const nParts = Math.min(offlineConfig.maxParts, Math.floor(r.parts * t));
  const parts: Part[] = [];
  for (let i = 0; i < nParts; i++) parts.push(generatePart(rollRarity(partDrops.rarity)));
  return {
    seconds: away,
    location: loc.id,
    resources,
    xp: Math.floor(r.xp * t),
    kills: Math.floor(r.kills * t),
    groups: Math.floor(r.groups * t),
    items,
    parts,
  };
}
