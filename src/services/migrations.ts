import { createNewProfile, emptyEquipment, emptyResources, emptyStats, SAVE_VERSION, type Profile } from '../game/profile/Profile';

type AnySave = Record<string, unknown> & { version?: number };

/**
 * Миграции сохранений: ключ — версия, ИЗ которой мигрируем.
 * Каждая миграция поднимает версию на 1.
 */
const migrations: Record<number, (s: AnySave) => AnySave> = {
  // v1 → v2: добавлены история получения и расширенная статистика.
  1: (s) => ({
    ...s,
    history: Array.isArray(s.history) ? s.history : [],
    stats: { ...emptyStats(), ...((s.stats as object) ?? {}) },
    version: 2,
  }),
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
  // Защита от повреждённых полей.
  return {
    ...base,
    ...p,
    version: SAVE_VERSION,
    resources: { ...emptyResources(), ...(p.resources ?? {}) },
    equipment: { ...emptyEquipment(), ...(p.equipment ?? {}) },
    stats: { ...emptyStats(), ...(p.stats ?? {}) },
    maps: { ...base.maps, ...(p.maps ?? {}) },
    items: p.items ?? {},
    history: p.history ?? [],
    bunker: p.bunker ?? base.bunker,
  };
}
