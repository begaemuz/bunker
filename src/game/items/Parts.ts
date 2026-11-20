import { fusionConfig, partRarityMult, partTemplates, type PartTemplate } from '../config/partsConfig';
import { pushHistory, type Profile } from '../profile/Profile';
import { chance, pickWeighted, randFloat, uid } from '../rng';
import { RARITIES, type Part, type Rarity, type StatMod } from '../types';
import { rarityIndex } from './ItemRarity';

export function getPartTemplate(id: string): PartTemplate {
  return partTemplates.find((t) => t.id === id) ?? partTemplates[0];
}

function rollStat(t: PartTemplate, rarity: Rarity): StatMod {
  const v = randFloat(t.range[0], t.range[1]) * partRarityMult[rarity];
  return { stat: t.stat, value: Math.round(v * 1000) / 1000 };
}

/** Диапазон свойства модификации при её редкости. */
export function partStatRoll(rarity: Rarity, stat: StatMod): { min: number; max: number; quality: number } | null {
  const t = partTemplates.find((x) => x.stat === stat.stat);
  if (!t) return null;
  const m = partRarityMult[rarity];
  const a = t.range[0] * m;
  const b = t.range[1] * m;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  let q = hi - lo > 1e-9 ? (stat.value - lo) / (hi - lo) : 1;
  if (t.range[1] < t.range[0]) q = 1 - q;
  return { min: lo, max: hi, quality: Math.max(0, Math.min(1, q)) };
}

export function generatePart(rarity: Rarity, templateId?: string): Part {
  const t = templateId ? getPartTemplate(templateId) : pickWeighted(partTemplates, (x) => x.weight);
  return { id: uid(), templateId: t.id, name: t.name, rarity, stats: [rollStat(t, rarity)], installedIn: null, obtainedAt: Date.now() };
}

/** Характеристики всех деталей, установленных в предмет. */
export function partMods(p: Profile, itemId: string): StatMod[] {
  const item = p.items[itemId];
  if (!item) return [];
  const out: StatMod[] = [];
  for (const s of item.slots) {
    const part = s.partId ? p.parts[s.partId] : null;
    if (part) out.push(...part.stats);
  }
  return out;
}

export function addParts(p: Profile, parts: Part[]): Profile {
  if (!parts.length) return p;
  const all = { ...p.parts };
  for (const x of parts) all[x.id] = x;
  return { ...p, parts: all };
}

export type InstallError = 'not_found' | 'slot' | 'locked' | 'busy' | 'fits' | 'installed';

/** Устанавливает деталь в слот предмета. Навсегда: снять нельзя. */
export function installPart(p: Profile, partId: string, itemId: string, slotIndex: number): { profile: Profile; error?: InstallError } {
  const part = p.parts[partId];
  const item = p.items[itemId];
  if (!part || !item) return { profile: p, error: 'not_found' };
  if (part.installedIn) return { profile: p, error: 'installed' };
  const slot = item.slots[slotIndex];
  if (!slot) return { profile: p, error: 'slot' };
  if (slot.locked) return { profile: p, error: 'locked' };
  if (slot.partId) return { profile: p, error: 'busy' };
  if (!getPartTemplate(part.templateId).fits.includes(item.category)) return { profile: p, error: 'fits' };
  const slots = item.slots.map((s, i) => (i === slotIndex ? { ...s, partId } : s));
  return {
    profile: {
      ...p,
      items: { ...p.items, [itemId]: { ...item, slots } },
      parts: { ...p.parts, [partId]: { ...part, installedIn: itemId } },
    },
  };
}

/** Открывает заблокированный слот ключом расширения. */
export function unlockSlot(p: Profile, itemId: string, slotIndex: number): Profile | null {
  const item = p.items[itemId];
  if (!item || !item.slots[slotIndex]?.locked || p.resources.expansionKeys < 1) return null;
  const slots = item.slots.map((s, i) => (i === slotIndex ? { ...s, locked: false } : s));
  return {
    ...p,
    resources: { ...p.resources, expansionKeys: p.resources.expansionKeys - 1 },
    items: { ...p.items, [itemId]: { ...item, slots } },
  };
}

/** Удаляет детали, установленные в предмет (при уничтожении или продаже). */
export function dropItemParts(p: Profile, itemId: string): Profile {
  const item = p.items[itemId];
  if (!item) return p;
  const ids = item.slots.map((s) => s.partId).filter((x): x is string => !!x);
  if (!ids.length) return p;
  const parts = { ...p.parts };
  for (const id of ids) delete parts[id];
  return { ...p, parts };
}

/** Свободные детали того же шаблона и редкости. */
export function fusionGroup(p: Profile, part: Part): Part[] {
  return Object.values(p.parts).filter((x) => !x.installedIn && x.templateId === part.templateId && x.rarity === part.rarity);
}

export function fusionChance(rarity: Rarity): number {
  return fusionConfig.chance[rarity] ?? 0;
}

export function nextRarity(r: Rarity): Rarity | null {
  const i = rarityIndex(r);
  const n = RARITIES[i + 1];
  return n && n !== 'unique' ? n : null;
}

/**
 * Объединение трёх одинаковых деталей. Исходные детали уничтожаются
 * в любом случае; при успехе появляется деталь следующей редкости.
 */
export function fuseParts(p: Profile, partId: string): { profile: Profile; result?: Part; success?: boolean; error?: 'count' | 'max' } {
  const part = p.parts[partId];
  if (!part) return { profile: p, error: 'count' };
  const next = nextRarity(part.rarity);
  if (!next || !fusionConfig.chance[part.rarity]) return { profile: p, error: 'max' };
  const group = fusionGroup(p, part);
  if (group.length < fusionConfig.count) return { profile: p, error: 'count' };
  const use = [part, ...group.filter((x) => x.id !== part.id)].slice(0, fusionConfig.count);
  const parts = { ...p.parts };
  for (const x of use) delete parts[x.id];
  let q: Profile = { ...p, parts };
  if (!chance(fusionChance(part.rarity))) {
    q = { ...q, history: pushHistory(q, { at: Date.now(), itemName: part.name, rarity: part.rarity, action: 'destroyed', detail: 'неудачное объединение' }) };
    return { profile: q, success: false };
  }
  const res = generatePart(next, part.templateId);
  // Может появиться дополнительное свойство от другого шаблона.
  if (chance(fusionConfig.bonusStatChance)) {
    const other = pickWeighted(
      partTemplates.filter((t) => t.id !== part.templateId),
      (t) => t.weight,
    );
    res.stats.push(rollStat(other, part.rarity));
  }
  q = {
    ...q,
    parts: { ...q.parts, [res.id]: res },
    history: pushHistory(q, { at: Date.now(), itemName: res.name, rarity: res.rarity, action: 'obtained', detail: 'объединение' }),
  };
  return { profile: q, result: res, success: true };
}

/** Цена извлечения модификации: энергоядра по редкости. */
export function extractCost(part: Part): { energyCores: number } {
  return { energyCores: 1 + rarityIndex(part.rarity) * 2 };
}

/** Извлекает модификацию из оборудования обратно на склад (за редкий ресурс). */
export function extractPart(p: Profile, itemId: string, slotIndex: number): { profile: Profile; error?: 'not_found' | 'resources' } {
  const item = p.items[itemId];
  const partId = item?.slots[slotIndex]?.partId;
  const part = partId ? p.parts[partId] : null;
  if (!item || !part) return { profile: p, error: 'not_found' };
  const cost = extractCost(part);
  if (p.resources.energyCores < cost.energyCores) return { profile: p, error: 'resources' };
  const slots = item.slots.map((s, i) => (i === slotIndex ? { ...s, partId: null } : s));
  return {
    profile: {
      ...p,
      resources: { ...p.resources, energyCores: p.resources.energyCores - cost.energyCores },
      items: { ...p.items, [itemId]: { ...item, slots } },
      parts: { ...p.parts, [part.id]: { ...part, installedIn: null } },
    },
  };
}

/** Сколько объединений можно сделать среди свободных деталей этой редкости. */
export function fusableCount(p: Profile, rarity: Rarity): number {
  if (!fusionConfig.chance[rarity]) return 0;
  const groups = new Map<string, number>();
  for (const x of Object.values(p.parts)) {
    if (x.installedIn || x.rarity !== rarity) continue;
    groups.set(x.templateId, (groups.get(x.templateId) ?? 0) + 1);
  }
  let n = 0;
  for (const c of groups.values()) n += Math.floor(c / fusionConfig.count);
  return n;
}

/** Массовое объединение всех троек выбранной редкости. */
export function fuseAll(p: Profile, rarity: Rarity): { profile: Profile; success: number; failed: number; results: Part[] } {
  let q = p;
  let success = 0;
  let failed = 0;
  const results: Part[] = [];
  for (let guard = 0; guard < 500; guard++) {
    const first = Object.values(q.parts).find((x) => !x.installedIn && x.rarity === rarity && fusionGroup(q, x).length >= fusionConfig.count);
    if (!first) break;
    const r = fuseParts(q, first.id);
    if (r.error) break;
    q = r.profile;
    if (r.success && r.result) {
      success++;
      results.push(r.result);
    } else failed++;
  }
  return { profile: q, success, failed, results };
}
