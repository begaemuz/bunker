import { getTech, techConfig, type TechMetaKey, type TechNode } from '../config/techConfig';
import { canAfford, spend, type Profile } from '../profile/Profile';
import { RESOURCE_KEYS, type Resources, type StatKey, type StatMod } from '../types';

export function techLevel(p: Profile, id: string): number {
  return p.techs[id] ?? 0;
}

/** Стоимость исследования следующего уровня. */
export function researchCost(node: TechNode, currentLevel: number): Partial<Resources> {
  const m = Math.pow(node.growth, currentLevel);
  const out: Partial<Resources> = {};
  for (const k of RESOURCE_KEYS) {
    const v = node.cost[k];
    if (v) out[k] = Math.ceil(v * m);
  }
  return out;
}

/** Уровень бункера, нужный для следующего уровня технологии. */
export function requiredBunkerLevel(node: TechNode, currentLevel: number): number {
  return node.levelReq + node.levelStep * currentLevel;
}

export type ResearchBlock = 'max' | 'level' | 'requires' | 'resources' | null;

export function researchBlock(p: Profile, node: TechNode): ResearchBlock {
  const lvl = techLevel(p, node.id);
  if (lvl >= node.maxLevel) return 'max';
  if (p.bunker.level < requiredBunkerLevel(node, lvl)) return 'level';
  if (node.requires.some((r) => techLevel(p, r.id) < r.level)) return 'requires';
  if (!canAfford(p, researchCost(node, lvl))) return 'resources';
  return null;
}

export function research(p: Profile, id: string): { profile: Profile; error?: ResearchBlock | 'not_found' } {
  const node = getTech(id);
  if (!node) return { profile: p, error: 'not_found' };
  const block = researchBlock(p, node);
  if (block) return { profile: p, error: block };
  const paid = spend(p, researchCost(node, techLevel(p, id)));
  if (!paid) return { profile: p, error: 'resources' };
  return {
    profile: {
      ...paid,
      techs: { ...paid.techs, [id]: techLevel(p, id) + 1 },
      stats: { ...paid.stats, techsResearched: paid.stats.techsResearched + 1 },
    },
  };
}

function isMeta(k: string): k is TechMetaKey {
  return k === 'maxItemLevel' || k === 'upgradeChance' || k === 'upgradeCost';
}

/** Модификаторы характеристик комплекса от изученных технологий. */
export function techStatMods(p: Profile): StatMod[] {
  const out: StatMod[] = [];
  for (const node of techConfig) {
    const lvl = techLevel(p, node.id);
    if (lvl <= 0) continue;
    for (const e of node.effects) {
      if (isMeta(e.key)) continue;
      out.push({ stat: e.key as StatKey, value: e.perLevel * lvl });
    }
  }
  return out;
}

/** Неигровые бонусы технологий (улучшение оборудования). */
export function techMeta(p: Profile, key: TechMetaKey): number {
  let sum = 0;
  for (const node of techConfig) {
    const lvl = techLevel(p, node.id);
    if (lvl <= 0) continue;
    for (const e of node.effects) if (e.key === key) sum += e.perLevel * lvl;
  }
  return sum;
}
