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
