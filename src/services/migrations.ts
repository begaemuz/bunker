import { AVATARS } from '../game/meta/vip';
import { emptyQuests } from '../game/meta/Meta';
import { generateItem } from '../game/items/ItemGenerator';
import {
  createNewProfile,
  emptyMeta,
  emptyEquipment,
  emptyLocationProgress,
  emptyResources,
  emptyStats,
  SAVE_VERSION,
  type Profile,
} from '../game/profile/Profile';
import { RARITIES, type Item, type Part, type Rarity } from '../game/types';
import { generatePart } from '../game/items/Parts';
import { legacyPartMap, partTemplates } from '../game/config/partsConfig';

type AnySave = Record<string, unknown> & { version?: number };

interface V2Item {
  id: string;
  templateId: string;
  category: string;
  rarity: string;
  level: number;
  obtainedAt: number;
}

/** Старые шаблоны (v2) → новое оборудование. Реактор стал типом генератора. */
const TEMPLATE_MAP: Record<string, string> = {
  gen_diesel: 'gen_diesel',
  gen_thermo: 'gen_thermo',
  gen_plasma: 'gen_turbine',
  coil_pulse: 'coil_emp',
  coil_tesla: 'coil_hv',
  coil_cryo: 'coil_vibro',
  coil_wide: 'coil_radio',
  cap_pulse: 'cap_pulse',
  cap_super: 'cap_super',
  cap_shock: 'cap_bank',
  reac_compact: 'gen_reactor',
  reac_isotope: 'gen_reactor',
  reac_fusion: 'gen_reactor',
};

/**
 * v2 → v3: новая система оборудования (8 слотов), технологии и локации.
 * Предметы пересоздаются по новым шаблонам с той же редкостью, уровнем и ID,
 * ресурсы, уровень бункера и статистика сохраняются.
 */
function v2to3(s: AnySave): AnySave {
  const oldItems = (s.items ?? {}) as Record<string, V2Item>;
  const items: Record<string, Item> = {};
  for (const old of Object.values(oldItems)) {
    const tpl = TEMPLATE_MAP[old.templateId];
    if (!tpl) continue;
    const rarity = (RARITIES as readonly string[]).includes(old.rarity) ? (old.rarity as Rarity) : 'common';
    const it = generateItem({ templateId: tpl, rarity, tier: 1, source: { kind: 'start' } });
    items[old.id] = { ...it, id: old.id, level: Math.min(10, Math.max(1, old.level ?? 1)), obtainedAt: old.obtainedAt ?? Date.now() };
  }
  const oldEq = (s.equipment ?? {}) as Record<string, (string | null)[]>;
  const equipment = emptyEquipment();
  const first = (k: string) => (oldEq[k] ?? []).find((id) => id && items[id]) ?? null;
  equipment.generator = first('generator') ?? first('reactor');
  equipment.coil1 = first('coil');
  equipment.capacitor = first('capacitor');
  // Без охлаждения катушки сразу перегреются — выдаём базовую систему.
  const cooler = generateItem({ templateId: 'cool_air', rarity: 'common', tier: 1, source: { kind: 'start' } });
  items[cooler.id] = cooler;
  equipment.cooling = cooler.id;
  if (!equipment.generator) {
    const gen = generateItem({ templateId: 'gen_diesel', rarity: 'common', tier: 1, source: { kind: 'start' } });
    items[gen.id] = gen;
    equipment.generator = gen.id;
  }
  if (!equipment.coil1) {
    const coil = generateItem({ templateId: 'coil_emp', rarity: 'common', tier: 1, source: { kind: 'start' } });
    items[coil.id] = coil;
    equipment.coil1 = coil.id;
  }

  const maps = (s.maps ?? {}) as { bossKills?: Record<number, number> };
  const kills = maps.bossKills?.[1] ?? 0;
  const unlocked = kills > 0 ? [1, 2] : [1];
  const progress: Record<number, unknown> = { 1: { ...emptyLocationProgress(), bossKills: kills } };
  if (kills > 0) progress[2] = emptyLocationProgress();

  return {
    ...s,
    items,
    equipment,
    techs: {},
    locations: { current: 1, unlocked, progress },
    resources: { ...emptyResources(), ...((s.resources as object) ?? {}) },
    stats: { ...emptyStats(), ...((s.stats as object) ?? {}) },
    version: 3,
  };
}

/** Миграции: ключ — версия, ИЗ которой мигрируем. */
const migrations: Record<number, (s: AnySave) => AnySave> = {
  1: (s) => ({ ...s, history: Array.isArray(s.history) ? s.history : [], version: 2 }),
  2: v2to3,
  // v3 → v4: модификации, автопродажа, офлайн-прогресс, привязка к Telegram.
  3: (s) => ({
    ...s,
    parts: {},
    autoSell: { maxRarity: null },
    offline: { lastSeen: Date.now(), rates: null },
    tgUserId: null,
    version: 4,
  }),
  // v4 → v5: магазин, обмен, награды за вход, ежедневные задания.
  4: (s) => ({ ...s, ...emptyMeta(), version: 5 }),
  // v5 → v6: карточка игрока и VIP.
  5: (s) => ({ ...s, player: { nick: '', avatar: 0, frame: 'steel' }, vip: { points: 0 }, version: 6 }),
  // v6 → v7: задания на день, неделю и месяц; календарь входа на 30 дней.
  6: (s) => {
    const old = (s.quests ?? {}) as { day?: string; list?: unknown[]; bonusClaimed?: boolean };
    const q = emptyQuests();
    if (typeof old.day === 'string' && Array.isArray(old.list)) q.day = { key: old.day, list: old.list as never[], bonusClaimed: !!old.bonusClaimed };
    return { ...s, quests: q, version: 7 };
  },
  // v7 → v8: заточка до 10 уровня; модификации стали эффектами со стихиями.
  7: (s) => {
    const items = { ...((s.items ?? {}) as Record<string, Item>) };
    for (const [id, it] of Object.entries(items)) {
      items[id] = { ...it, level: Math.min(10, it.level), maxLevel: Math.min(10, it.maxLevel ?? 10) };
    }
    const parts: Record<string, Part> = {};
    const known = new Set(partTemplates.map((t) => t.id));
    for (const [id, old] of Object.entries((s.parts ?? {}) as Record<string, Part>)) {
      const tpl = known.has(old.templateId) && old.templateId !== 'p_chain' ? old.templateId : (legacyPartMap[old.templateId] ?? 'p_chain');
      const fresh = generatePart(old.rarity, tpl, 0.5);
      parts[id] = { ...fresh, id, installedIn: old.installedIn ?? null, obtainedAt: old.obtainedAt ?? Date.now() };
    }
    // Задания пересоздаются с новыми, более серьёзными целями.
    return { ...s, items, parts, quests: emptyQuests(), version: 8 };
  },
  // v8 → v9: «уникальная» (голубая) редкость убрана — такие вещи стали золотыми.
  8: (s) => {
    const items = { ...((s.items ?? {}) as Record<string, Item>) };
    for (const [id, it] of Object.entries(items)) if ((it.rarity as string) === 'unique') items[id] = { ...it, rarity: 'legendary' };
    const loc = (s.locations ?? null) as { current: number; unlocked: number[] } | null;
    const locations = loc ? { ...loc, current: Math.min(7, loc.current), unlocked: loc.unlocked.filter((x) => x <= 7) } : loc;
    return { ...s, items, ...(locations ? { locations } : {}), version: 9 };
  },
};

/** Приводит сохранение любой версии к текущей и заполняет пропуски. */
export function migrate(raw: unknown): Profile {
  if (!raw || typeof raw !== 'object') return createNewProfile();
  let s = raw as AnySave;
  let v = typeof s.version === 'number' ? s.version : 1;
  while (v < SAVE_VERSION) {
    const m = migrations[v];
    s = m ? m(s) : { ...s, version: v + 1 };
    v = s.version as number;
  }
  const base = createNewProfile();
  const p = s as unknown as Profile;
  return {
    ...base,
    ...p,
    version: SAVE_VERSION,
    resources: { ...emptyResources(), ...(p.resources ?? {}) },
    equipment: { ...emptyEquipment(), ...(p.equipment ?? {}) },
    stats: { ...emptyStats(), ...(p.stats ?? {}) },
    techs: p.techs ?? {},
    locations: p.locations ?? base.locations,
    items: p.items ?? {},
    // База: всё, что уже лежит у игрока, считается найденным.
    codex: {
      items: [...new Set([...(p.codex?.items ?? []), ...Object.values(p.items ?? {}).map((i) => i.templateId)])],
      parts: [...new Set([...(p.codex?.parts ?? []), ...Object.values(p.parts ?? {}).map((x) => x.templateId)])],
    },
    history: p.history ?? [],
    bunker: p.bunker ?? base.bunker,
    parts: p.parts ?? {},
    autoSell: { ...base.autoSell, ...(p.autoSell ?? {}) },
    offline: p.offline ?? base.offline,
    tgUserId: p.tgUserId ?? null,
    shop: p.shop ?? base.shop,
    exchange: p.exchange ?? base.exchange,
    daily: p.daily ?? base.daily,
    quests: { ...base.quests, ...(p.quests ?? {}) },
    player: { ...base.player, ...(p.player ?? {}), ...(AVATARS[p.player?.avatar ?? 0] ? {} : { avatar: 0 }) },
    vip: { ...base.vip, ...(p.vip ?? {}) },
  };
}
