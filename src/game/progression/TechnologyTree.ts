import { getTech, techConfig, type TechEffect, type TechMetaKey, type TechNode } from '../config/techConfig';
import { canAfford, spend, type Profile } from '../profile/Profile';
import { RESOURCE_KEYS, type Resources, type StatKey, type StatMod } from '../types';

export function techLevel(p: Profile, id: string): number {
  return p.techs[id] ?? 0;
}

/** Значение эффекта на уровне lvl (с учётом предела для ограниченных эффектов). */
export function effectValue(e: TechEffect, lvl: number): number {
  if (lvl <= 0) return 0;
  if (e.cap === undefined) return e.perLevel * lvl;
  const ratio = Math.min(0.999, e.perLevel / e.cap);
  return e.cap * (1 - Math.pow(1 - ratio, lvl));
}

/** Стоимость следующего уровня: геометрическая прогрессия. */
export function researchCost(node: TechNode, currentLevel: number): Partial<Resources> {
  const m = Math.pow(node.growth, currentLevel);
  const out: Partial<Resources> = {};
  for (const k of RESOURCE_KEYS) {
    const v = node.cost[k];
    if (v) out[k] = Math.ceil(v * m);
  }
  return out;
}

export type ResearchBlock = 'level' | 'requires' | 'points' | 'resources' | null;

/** Очки навыков: 1 за каждый уровень бункера, 1 очко = 1 уровень навыка. */
export function skillPointsTotal(p: Profile): number {
  return p.bunker.level;
}

export function skillPointsSpent(p: Profile): number {
  return Object.values(p.techs).reduce((s, v) => s + (v ?? 0), 0);
}

export function skillPointsFree(p: Profile): number {
  return skillPointsTotal(p) - skillPointsSpent(p);
}

/** Сброс навыков: все очки и потраченные ресурсы возвращаются. */
/** Применяет предмет «Сброс навыков»: тратит 1 штуку и обнуляет навыки. */
export function applySkillReset(p: Profile): Profile | null {
  if (p.resources.skillResets < 1 || skillPointsSpent(p) === 0) return null;
  const q = resetSkills(p);
  return { ...q, resources: { ...q.resources, skillResets: q.resources.skillResets - 1 } };
}

export function resetSkills(p: Profile): Profile {
  const refund: Partial<Resources> = {};
  for (const node of techConfig) {
    const lvl = techLevel(p, node.id);
    for (let i = 0; i < lvl; i++) {
      const c = researchCost(node, i);
      for (const k of RESOURCE_KEYS) if (c[k]) refund[k] = (refund[k] ?? 0) + c[k]!;
    }
  }
  const resources = { ...p.resources };
  for (const k of RESOURCE_KEYS) if (refund[k]) resources[k] += refund[k]!;
  return { ...p, techs: {}, resources };
}

export function researchBlock(p: Profile, node: TechNode): ResearchBlock {
  const lvl = techLevel(p, node.id);
  if (lvl === 0 && p.bunker.level < node.levelReq) return 'level';
  if (node.requires.some((r) => techLevel(p, r.id) < r.level)) return 'requires';
  if (skillPointsFree(p) <= 0) return 'points';
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

/** Модификаторы характеристик комплекса от изученных навыков. */
export function techStatMods(p: Profile): StatMod[] {
  const out: StatMod[] = [];
  for (const node of techConfig) {
    const lvl = techLevel(p, node.id);
    if (lvl <= 0) continue;
    for (const e of node.effects) if (!isMeta(e.key)) out.push({ stat: e.key as StatKey, value: effectValue(e, lvl) });
  }
  return out;
}

export function techMeta(p: Profile, key: TechMetaKey): number {
  let sum = 0;
  for (const node of techConfig) {
    const lvl = techLevel(p, node.id);
    if (lvl <= 0) continue;
    for (const e of node.effects) if (e.key === key) sum += effectValue(e, lvl);
  }
  return key === 'maxItemLevel' ? Math.floor(sum) : sum;
}

/** Очки, вложенные в ветку. */
export function branchPoints(p: Profile, branch: string): number {
  return techConfig.filter((t) => t.branch === branch).reduce((s, t) => s + techLevel(p, t.id), 0);
}
