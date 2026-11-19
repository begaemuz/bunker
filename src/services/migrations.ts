import { generateItem } from '../game/items/ItemGenerator';
import {
  createNewProfile,
  emptyEquipment,
  emptyLocationProgress,
  emptyResources,
  emptyStats,
  SAVE_VERSION,
  type Profile,
} from '../game/profile/Profile';
import { RARITIES, type Item, type Rarity } from '../game/types';

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
    history: p.history ?? [],
    bunker: p.bunker ?? base.bunker,
  };
}
