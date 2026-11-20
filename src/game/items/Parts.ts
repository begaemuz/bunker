import { vipLevel, vipPerks } from '../meta/vip';
import { dismantleYield, fusionConfig, fusionCost, partExtraMult, partRarityMult, partStatCount, partTemplates, type PartTemplate } from '../config/partsConfig';
import { pushHistory, type Profile } from '../profile/Profile';
import { chance, pickWeighted, randFloat, uid } from '../rng';
import { RARITIES, type Part, type Rarity, type StatKey, type StatMod } from '../types';
import { rarityIndex } from './ItemRarity';

export function getPartTemplate(id: string): PartTemplate {
  return partTemplates.find((t) => t.id === id) ?? partTemplates[0];
}

function rollStat(t: PartTemplate, rarity: Rarity, mult = 1, bias?: number): StatMod {
  // bias — качество исходных деталей при объединении: сдвигает бросок к лучшему краю
  const k = bias === undefined ? randFloat(0, 1) : fusionRoll(bias);
  const v = (t.range[0] + (t.range[1] - t.range[0]) * k) * partRarityMult[rarity] * mult;
  return { stat: t.stat, value: Math.round(v * 1000) / 1000 };
}

/** Шаблоны, чьи свойства могут попасть в модификацию как дополнительные. */
export function partExtraPool(t: PartTemplate): PartTemplate[] {
  return partTemplates.filter((x) => x.id !== t.id && x.stat !== t.stat);
}

/**
 * Основа качества при объединении: слабое звено тянет вниз.
 * 65% — от худшей детали, 35% — от среднего. Три сильные дают сильную,
 * а сильная вперемешку со слабой — почти никогда.
 */
export function fusionBase(parts: Part[]): number {
  if (!parts.length) return 0;
  const qs = parts.map(partQuality);
  const min = Math.min(...qs);
  const avg = qs.reduce((a, b) => a + b, 0) / qs.length;
  return 0.65 * min + 0.35 * avg;
}

/** Качество свойства после объединения: 70% — основа, 30% — случай, смещённый вниз. */
export function fusionRoll(base: number): number {
  return base * 0.7 + Math.pow(randFloat(0, 1), 1.5) * 0.3;
}

/** Возможный диапазон качества результата объединения. */
export function fusionQualityRange(parts: Part[]): [number, number] {
  const b = fusionBase(parts);
  return [b * 0.7, b * 0.7 + 0.3];
}

export function generatePart(rarity: Rarity, templateId?: string, bias?: number): Part {
  const t = templateId ? getPartTemplate(templateId) : pickWeighted(partTemplates, (x) => x.weight);
  const stats: StatMod[] = [rollStat(t, rarity, 1, bias)];
  const pool = [...partExtraPool(t)];
  const want = Math.min(partStatCount[rarity] - 1, pool.length);
  for (let i = 0; i < want; i++) {
    const pick = pickWeighted(pool, (x) => x.weight);
    pool.splice(pool.indexOf(pick), 1);
    stats.push(rollStat(pick, rarity, partExtraMult, bias));
  }
  return { id: uid(), templateId: t.id, name: t.name, rarity, stats, installedIn: null, obtainedAt: Date.now() };
}

/** Диапазон свойства модификации: первое — основное, остальные ослаблены. */
export function partStatRange(rarity: Rarity, stat: StatKey, primary: boolean): { min: number; max: number; better: 'high' | 'low' } | null {
  const t = partTemplates.find((x) => x.stat === stat);
  if (!t) return null;
  const m = partRarityMult[rarity] * (primary ? 1 : partExtraMult);
  const a = t.range[0] * m;
  const b = t.range[1] * m;
  return { min: Math.min(a, b), max: Math.max(a, b), better: t.range[1] < t.range[0] ? 'low' : 'high' };
}

/** Диапазон и качество конкретного свойства модификации. */
export function partStatRoll(part: Part, index: number): { min: number; max: number; quality: number } | null {
  const s = part.stats[index];
  const r = s ? partStatRange(part.rarity, s.stat, index === 0) : null;
  if (!r) return null;
  // старые модификации могли получить второе свойство в полную силу
  const hi = Math.max(r.max, r.better === 'high' ? s.value : r.max);
  const lo = Math.min(r.min, r.better === 'low' ? s.value : r.min);
  let q = hi - lo > 1e-9 ? (s.value - lo) / (hi - lo) : 1;
  if (r.better === 'low') q = 1 - q;
  return { min: lo, max: hi, quality: Math.max(0, Math.min(1, q)) };
}

/** Среднее качество всех свойств модификации, 0..1. */
export function partQuality(part: Part): number {
  const qs = part.stats.map((_, i) => partStatRoll(part, i)?.quality ?? 0.5);
  return qs.reduce((a, b) => a + b, 0) / Math.max(1, qs.length);
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

/**
 * Какие три детали уйдут в объединение: выбранная и две самые слабые
 * из того же шаблона и редкости — лучшие экземпляры не трогаются.
 */
export function fusionPick(p: Profile, part: Part): Part[] {
  const others = fusionGroup(p, part)
    .filter((x) => x.id !== part.id)
    .sort((a, b) => partQuality(a) - partQuality(b));
  return [part, ...others].slice(0, fusionConfig.count);
}

export function fusionChance(rarity: Rarity, p?: Profile): number {
  const base = fusionConfig.chance[rarity] ?? 0;
  if (!base || !p) return base;
  return Math.min(0.99, base + vipPerks(vipLevel(p.vip?.points ?? 0)).fusionChance);
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
export type FuseError = 'count' | 'max' | 'mismatch' | 'installed' | 'resources';

/**
 * Объединение трёх выбранных деталей одного шаблона и редкости.
 * Исходные детали уничтожаются в любом случае; при успехе появляется
 * деталь следующей редкости, качество которой зависит от качества исходных.
 * Если ids не переданы, берутся выбранная и две самые слабые.
 */
export function fuseParts(p: Profile, partId: string, ids?: string[]): { profile: Profile; result?: Part; success?: boolean; error?: FuseError } {
  const part = p.parts[partId];
  if (!part) return { profile: p, error: 'count' };
  const next = nextRarity(part.rarity);
  if (!next || !fusionConfig.chance[part.rarity]) return { profile: p, error: 'max' };
  let use: Part[];
  if (ids) {
    const uniq = [...new Set(ids)];
    use = uniq.map((id) => p.parts[id]).filter((x): x is Part => !!x);
    if (use.length !== fusionConfig.count) return { profile: p, error: 'count' };
    if (use.some((x) => x.installedIn)) return { profile: p, error: 'installed' };
    if (use.some((x) => x.templateId !== part.templateId || x.rarity !== part.rarity)) return { profile: p, error: 'mismatch' };
  } else {
    if (fusionGroup(p, part).length < fusionConfig.count) return { profile: p, error: 'count' };
    use = fusionPick(p, part);
  }
  const cost = fusionCost[part.rarity];
  if (cost && (p.resources.coins < cost.coins || p.resources.components < cost.components)) return { profile: p, error: 'resources' };
  const avgQ = fusionBase(use);
  const parts = { ...p.parts };
  for (const x of use) delete parts[x.id];
  let q: Profile = { ...p, parts };
  if (cost) q = { ...q, resources: { ...q.resources, coins: q.resources.coins - cost.coins, components: q.resources.components - cost.components } };
  if (!chance(fusionChance(part.rarity, p))) {
    q = { ...q, history: pushHistory(q, { at: Date.now(), itemName: part.name, rarity: part.rarity, action: 'destroyed', detail: 'неудачное объединение' }) };
    return { profile: q, success: false };
  }
  // Новая деталь следующей редкости: больше свойств, качество тянется за исходными.
  const res = generatePart(next, part.templateId, avgQ);
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

/** «Сила» модификации для умной сортировки: редкость важнее процента. */
export function partPowerScore(part: Part): number {
  return partRarityMult[part.rarity] * (0.6 + 0.4 * partQuality(part));
}

/** Сколько компонентов даст разбор модификации. */
export function dismantleValue(part: Part): number {
  return Math.max(1, Math.round(dismantleYield[part.rarity] * (0.5 + partQuality(part))));
}

/** Разбор модификаций на компоненты синтеза. */
export function dismantleParts(p: Profile, ids: string[]): { profile: Profile; components: number; count: number } {
  const parts = { ...p.parts };
  let components = 0;
  let count = 0;
  for (const id of ids) {
    const x = parts[id];
    if (!x || x.installedIn) continue;
    components += dismantleValue(x);
    delete parts[id];
    count++;
  }
  return { profile: { ...p, parts, resources: { ...p.resources, components: p.resources.components + components } }, components, count };
}

/** Свободные модификации по редкости и диапазону качества (0..1). */
export function partsInRange(p: Profile, rarities: Rarity[], qMin: number, qMax: number): Part[] {
  return Object.values(p.parts).filter((x) => {
    if (x.installedIn || !rarities.includes(x.rarity)) return false;
    const q = partQuality(x);
    return q >= qMin - 1e-9 && q <= qMax + 1e-9;
  });
}

/**
 * План массовой сборки: внутри каждого типа тройки собираются из
 * соседних по качеству деталей (так результат лучше), сколько хватит ресурсов.
 */
export function massFusePlan(p: Profile, rarity: Rarity, qMin: number, qMax: number): { triples: string[][]; coins: number; components: number; limited: boolean } {
  const cost = fusionCost[rarity];
  if (!cost || !nextRarity(rarity)) return { triples: [], coins: 0, components: 0, limited: false };
  const byTpl = new Map<string, Part[]>();
  for (const x of partsInRange(p, [rarity], qMin, qMax)) byTpl.set(x.templateId, [...(byTpl.get(x.templateId) ?? []), x]);
  const triples: string[][] = [];
  for (const list of byTpl.values()) {
    list.sort((a, b) => partQuality(b) - partQuality(a));
    for (let i = 0; i + 3 <= list.length; i += 3) triples.push(list.slice(i, i + 3).map((x) => x.id));
  }
  const afford = Math.min(Math.floor(p.resources.coins / cost.coins), Math.floor(p.resources.components / cost.components));
  const use = triples.slice(0, Math.max(0, afford));
  return { triples: use, coins: use.length * cost.coins, components: use.length * cost.components, limited: use.length < triples.length };
}
