import type { Resources, StatKey } from '../types';

export type TechBranch = 'energy' | 'em' | 'defense';
export type TechMetaKey = 'maxItemLevel' | 'upgradeChance' | 'upgradeCost';

export interface TechEffect {
  key: StatKey | TechMetaKey;
  /** Прибавка за уровень (для эффектов с пределом — прибавка первого уровня). */
  perLevel: number;
  /**
   * Предел для эффектов, которые не могут расти бесконечно (КПД, снижение урона, шансы).
   * Значение приближается к пределу: cap × (1 − (1 − perLevel/cap)^уровень).
   */
  cap?: number;
}

export interface TechNode {
  id: string;
  branch: TechBranch;
  name: string;
  /** Описание с {v} — подставляется текущее значение. */
  description: string;
  /** Ряд в дереве (0 — верх) и колонка внутри ветки (0..1). */
  tier: number;
  col: number;
  /** Уровень бункера для изучения первого уровня. */
  levelReq: number;
  /** Требуемые уровни предыдущих навыков ветки. */
  requires: { id: string; level: number }[];
  /** Стоимость первого уровня; каждый следующий дороже в growth раз. */
  cost: Partial<Resources>;
  growth: number;
  effects: TechEffect[];
}

export const techBranches: { id: TechBranch; name: string; description: string; color: string }[] = [
  { id: 'energy', name: 'Энергосистема', description: 'Генерация, накопители, потери и охлаждение.', color: '#3fc8ff' },
  { id: 'em', name: 'Оружие', description: 'Мощность, радиус и частота катушек.', color: '#ff7a3d' },
  { id: 'defense', name: 'Защита и инженерия', description: 'Прочность, ремонт, улучшение и трофеи.', color: '#5fd16a' },
];

const N = (n: Omit<TechNode, 'growth' | 'requires'> & Partial<Pick<TechNode, 'growth' | 'requires'>>): TechNode => ({
  growth: 1.5,
  requires: [],
  ...n,
});

/**
 * Дерево навыков: 3 ветки, у каждого навыка бесконечные уровни,
 * стоимость растёт в геометрической прогрессии.
 */
export const techConfig: TechNode[] = [
  // ───── Энергосистема ─────
  N({ id: 'e_gen', branch: 'energy', name: 'Генераторы', description: 'Мощность генератора {v}', tier: 0, col: 0, levelReq: 1, cost: { coins: 120, techParts: 3 }, effects: [{ key: 'genPowerPct', perLevel: 0.05 }] }),
  N({ id: 'c_rate', branch: 'energy', name: 'Теплоотвод', description: 'Скорость охлаждения {v}', tier: 0, col: 1, levelReq: 2, cost: { coins: 120, scrap: 12, techParts: 2 }, effects: [{ key: 'coolRatePct', perLevel: 0.06 }] }),
  N({ id: 'e_cap', branch: 'energy', name: 'Накопители', description: 'Ёмкость накопителя {v}', tier: 1, col: 0, levelReq: 3, requires: [{ id: 'e_gen', level: 2 }], cost: { coins: 200, techParts: 5 }, effects: [{ key: 'capacityPct', perLevel: 0.08 }] }),
  N({ id: 'c_cap', branch: 'energy', name: 'Тепловая ёмкость', description: 'Допустимый нагрев {v}', tier: 1, col: 1, levelReq: 4, requires: [{ id: 'c_rate', level: 2 }], cost: { coins: 220, scrap: 20, techParts: 4 }, effects: [{ key: 'heatCap', perLevel: 8 }] }),
  N({ id: 'e_charge', branch: 'energy', name: 'Быстрая зарядка', description: 'Скорость зарядки {v}', tier: 2, col: 0, levelReq: 6, requires: [{ id: 'e_cap', level: 3 }], cost: { coins: 450, techParts: 10, blueprints: 1 }, effects: [{ key: 'chargeRate', perLevel: 2 }] }),
  N({ id: 'c_heat', branch: 'energy', name: 'Снижение нагрева', description: 'Нагрев оборудования {v}', tier: 2, col: 1, levelReq: 6, requires: [{ id: 'c_cap', level: 3 }], cost: { coins: 450, scrap: 35, techParts: 10, blueprints: 1 }, effects: [{ key: 'heatPct', perLevel: -0.04, cap: -0.6 }] }),
  N({ id: 'e_loss', branch: 'energy', name: 'Снижение потерь', description: 'КПД передачи энергии {v}', tier: 3, col: 0, levelReq: 9, requires: [{ id: 'e_charge', level: 3 }], cost: { coins: 800, techParts: 18, blueprints: 2 }, effects: [{ key: 'conversion', perLevel: 0.015, cap: 0.22 }] }),
  N({ id: 'c_stab', branch: 'energy', name: 'Форсаж', description: 'Скорость катушек в холодном режиме {v}', tier: 3, col: 1, levelReq: 10, requires: [{ id: 'c_heat', level: 3 }], cost: { coins: 900, scrap: 60, techParts: 20, blueprints: 2 }, effects: [{ key: 'overdrive', perLevel: 0.03 }] }),
  N({ id: 'e_drain', branch: 'energy', name: 'Экономичные модули', description: 'Потребление модулей {v}', tier: 4, col: 0, levelReq: 14, requires: [{ id: 'e_loss', level: 3 }], cost: { coins: 1600, techParts: 35, blueprints: 3, energyCores: 1 }, effects: [{ key: 'drainPct', perLevel: -0.05, cap: -0.6 }] }),
  N({ id: 'c_load', branch: 'energy', name: 'Допустимая нагрузка', description: 'Эффективность охлаждения, сенсоров и защиты {v}', tier: 4, col: 1, levelReq: 15, requires: [{ id: 'c_stab', level: 3 }], cost: { coins: 1800, scrap: 100, techParts: 35, blueprints: 3, energyCores: 1 }, effects: [{ key: 'moduleBonus', perLevel: 0.03 }] }),

  // ───── Оружие ─────
  N({ id: 'm_power', branch: 'em', name: 'Мощность импульсов', description: 'Мощность катушек {v}', tier: 0, col: 0, levelReq: 1, cost: { coins: 100, techParts: 3 }, effects: [{ key: 'coilPowerPct', perLevel: 0.05 }] }),
  N({ id: 'm_radius', branch: 'em', name: 'Фокусировка поля', description: 'Радиус катушек {v}', tier: 0, col: 1, levelReq: 3, cost: { coins: 200, techParts: 5 }, effects: [{ key: 'coilRadiusPct', perLevel: 0.025, cap: 0.6 }] }),
  N({ id: 'm_rate', branch: 'em', name: 'Частотная модуляция', description: 'Частота импульсов {v}', tier: 1, col: 0, levelReq: 5, requires: [{ id: 'm_power', level: 3 }], cost: { coins: 350, techParts: 9, blueprints: 1 }, effects: [{ key: 'coilRatePct', perLevel: 0.04 }] }),
  N({ id: 'm_cost', branch: 'em', name: 'Эффективные катушки', description: 'Энергия на импульс {v}', tier: 1, col: 1, levelReq: 6, requires: [{ id: 'm_radius', level: 2 }], cost: { coins: 400, techParts: 10, blueprints: 1 }, effects: [{ key: 'pulseCostPct', perLevel: -0.04, cap: -0.6 }] }),
  N({ id: 'm_crit', branch: 'em', name: 'Поиск уязвимостей', description: 'Шанс поражения узла {v}', tier: 2, col: 0, levelReq: 8, requires: [{ id: 'm_rate', level: 3 }], cost: { coins: 700, techParts: 16, blueprints: 2 }, effects: [{ key: 'critChance', perLevel: 0.02, cap: 0.35 }] }),
  N({ id: 'm_critdmg', branch: 'em', name: 'Перегрузка узлов', description: 'Сила поражения узла {v}', tier: 2, col: 1, levelReq: 9, requires: [{ id: 'm_cost', level: 2 }], cost: { coins: 750, techParts: 18, blueprints: 2 }, effects: [{ key: 'critDamage', perLevel: 0.08 }] }),
  N({ id: 'm_chain', branch: 'em', name: 'Цепной разряд', description: 'Шанс цепного разряда {v}', tier: 3, col: 0, levelReq: 13, requires: [{ id: 'm_crit', level: 3 }], cost: { coins: 1500, techParts: 32, blueprints: 3, energyCores: 1 }, effects: [{ key: 'chance:chain', perLevel: 0.02, cap: 0.4 }] }),
  N({ id: 'm_break', branch: 'em', name: 'Пробой брони', description: 'Шанс ослабить броню {v}', tier: 3, col: 1, levelReq: 13, requires: [{ id: 'm_critdmg', level: 3 }], cost: { coins: 1500, techParts: 32, blueprints: 3, energyCores: 1 }, effects: [{ key: 'chance:armorBreak', perLevel: 0.02, cap: 0.4 }] }),

  // ───── Защита и инженерия ─────
  N({ id: 'd_hull', branch: 'defense', name: 'Укрепление корпуса', description: 'Прочность бункера {v}', tier: 0, col: 0, levelReq: 1, cost: { coins: 100, scrap: 12 }, effects: [{ key: 'hullPct', perLevel: 0.07 }] }),
  N({ id: 'g_salvage', branch: 'defense', name: 'Переработка трофеев', description: 'Монеты с роботов {v}', tier: 0, col: 1, levelReq: 2, cost: { coins: 150, techParts: 3 }, effects: [{ key: 'coinPct', perLevel: 0.05 }] }),
  N({ id: 'd_regen', branch: 'defense', name: 'Ремонтные дроны', description: 'Ремонт корпуса {v}', tier: 1, col: 0, levelReq: 3, requires: [{ id: 'd_hull', level: 2 }], cost: { coins: 200, scrap: 25, techParts: 4 }, effects: [{ key: 'regen', perLevel: 0.6 }] }),
  N({ id: 'g_cost', branch: 'defense', name: 'Снижение стоимости обслуживания', description: 'Стоимость улучшения {v}', tier: 1, col: 1, levelReq: 3, requires: [{ id: 'g_salvage', level: 2 }], cost: { coins: 220, techParts: 5 }, effects: [{ key: 'upgradeCost', perLevel: -0.04, cap: -0.6 }] }),
  N({ id: 'd_dr', branch: 'defense', name: 'Композитная броня', description: 'Снижение входящего урона {v}', tier: 2, col: 0, levelReq: 5, requires: [{ id: 'd_regen', level: 2 }], cost: { coins: 400, scrap: 40, techParts: 9 }, effects: [{ key: 'damageReduction', perLevel: 0.02, cap: 0.35 }] }),
  N({ id: 'g_chance', branch: 'defense', name: 'Точная сборка', description: 'Шанс успешного улучшения {v}', tier: 2, col: 1, levelReq: 5, requires: [{ id: 'g_cost', level: 2 }], cost: { coins: 350, techParts: 8, blueprints: 1 }, effects: [{ key: 'upgradeChance', perLevel: 0.02, cap: 0.3 }] }),
  N({ id: 'd_emerg', branch: 'defense', name: 'Аварийный ремонт', description: 'Экстренный ремонт при критическом уроне {v}', tier: 3, col: 0, levelReq: 9, requires: [{ id: 'd_dr', level: 2 }], cost: { coins: 800, scrap: 60, techParts: 15, blueprints: 1 }, effects: [{ key: 'emergencyRepair', perLevel: 0.04, cap: 0.5 }] }),
  N({ id: 'g_maxlvl', branch: 'defense', name: 'Лёгкие сплавы', description: 'Стоимость улучшения {v}', tier: 3, col: 1, levelReq: 8, requires: [{ id: 'g_chance', level: 2 }], cost: { coins: 900, techParts: 18, blueprints: 2 }, growth: 1.7, effects: [{ key: 'upgradeCost', perLevel: -0.03, cap: -0.3 }] }),
  N({ id: 'd_contour', branch: 'defense', name: 'Защитный контур', description: 'Сопротивление всем атакам {v}', tier: 4, col: 0, levelReq: 12, requires: [{ id: 'd_emerg', level: 2 }], cost: { coins: 1600, scrap: 100, techParts: 28, blueprints: 2 }, effects: [{ key: 'resist:kinetic', perLevel: 0.02, cap: 0.4 }, { key: 'resist:explosive', perLevel: 0.02, cap: 0.4 }, { key: 'resist:energy', perLevel: 0.02, cap: 0.4 }] }),
  N({ id: 'g_drops', branch: 'defense', name: 'Поиск трофеев', description: 'Шанс выпадения оборудования {v}', tier: 4, col: 1, levelReq: 7, requires: [{ id: 'g_maxlvl', level: 1 }], cost: { coins: 700, techParts: 14, blueprints: 1 }, effects: [{ key: 'dropChancePct', perLevel: 0.05 }] }),
];

export function getTech(id: string): TechNode | undefined {
  return techConfig.find((t) => t.id === id);
}
