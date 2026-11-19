import type { EquipCategory, Rarity, StatKey } from '../types';

export interface PartTemplate {
  id: string;
  name: string;
  description: string;
  /** Типы оборудования, в которые можно установить деталь. */
  fits: EquipCategory[];
  stat: StatKey;
  /** Значение при обычной редкости [мин, макс]. */
  range: [number, number];
  weight: number;
}

export const partTemplates: PartTemplate[] = [
  { id: 'p_power', name: 'Усилитель мощности', description: 'Повышает мощность импульсов катушек.', fits: ['coil', 'capacitor'], stat: 'coilPowerPct', range: [0.04, 0.06], weight: 10 },
  { id: 'p_lens', name: 'Фокусирующая линза', description: 'Расширяет зону воздействия катушек.', fits: ['coil'], stat: 'coilRadiusPct', range: [0.025, 0.04], weight: 8 },
  { id: 'p_freq', name: 'Модулятор частоты', description: 'Ускоряет следующую серию импульсов.', fits: ['coil', 'capacitor'], stat: 'coilRatePct', range: [0.03, 0.05], weight: 8 },
  { id: 'p_saver', name: 'Стабилизатор энергии', description: 'Снижает расход энергии на импульс.', fits: ['coil', 'converter'], stat: 'pulseCostPct', range: [-0.04, -0.06], weight: 7 },
  { id: 'p_cell', name: 'Ёмкостная ячейка', description: 'Увеличивает ёмкость накопителя.', fits: ['capacitor', 'generator'], stat: 'capacityPct', range: [0.06, 0.1], weight: 7 },
  { id: 'p_booster', name: 'Форсажный блок', description: 'Повышает мощность генератора.', fits: ['generator', 'converter'], stat: 'genPowerPct', range: [0.04, 0.06], weight: 7 },
  { id: 'p_radiator', name: 'Радиатор', description: 'Ускоряет отвод тепла.', fits: ['cooling', 'generator'], stat: 'coolRatePct', range: [0.06, 0.1], weight: 7 },
  { id: 'p_plate', name: 'Бронепластина', description: 'Укрепляет корпус бункера.', fits: ['shield', 'cooling'], stat: 'hullPct', range: [0.04, 0.06], weight: 7 },
  { id: 'p_repair', name: 'Ремонтный модуль', description: 'Постоянный ремонт корпуса.', fits: ['shield', 'converter'], stat: 'regen', range: [0.5, 0.9], weight: 6 },
  { id: 'p_crit', name: 'Модуль поражения узлов', description: 'Шанс найти и поразить уязвимый узел.', fits: ['sensor', 'coil'], stat: 'critChance', range: [0.02, 0.035], weight: 6 },
  { id: 'p_chain', name: 'Генератор цепного разряда', description: 'Шанс перебросить разряд на соседние цели.', fits: ['coil', 'sensor'], stat: 'chance:chain', range: [0.025, 0.04], weight: 5 },
  { id: 'p_scan', name: 'Блок анализа целей', description: 'Больше урона по опознанным целям.', fits: ['sensor'], stat: 'identifiedBonus', range: [0.04, 0.06], weight: 5 },
];

/** Множитель силы детали по редкости. */
export const partRarityMult: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2.2,
  epic: 3.2,
  legendary: 4.6,
  unique: 5,
};

/** Объединение: 3 одинаковые детали → 1 следующей редкости. */
export const fusionConfig = {
  count: 3,
  chance: {
    common: 0.95,
    uncommon: 0.85,
    rare: 0.7,
    epic: 0.5,
  } as Partial<Record<Rarity, number>>,
  /** Шанс, что при объединении деталь получит второе свойство. */
  bonusStatChance: 0.25,
};

/** Выпадение деталей. */
export const partDrops = {
  /** Базовый шанс с обычного робота (элиты и мини-боссы — множитель выпадения). */
  robotChance: 0.012,
  minibossChance: 0.6,
  bossCount: [1, 2] as [number, number],
  /** Шанс ключа расширения слота. */
  keyMiniboss: 0.15,
  keyBoss: 0.6,
  keyElite: 0.01,
  rarity: { common: 0.6, uncommon: 0.27, rare: 0.1, epic: 0.03, legendary: 0, unique: 0 } as Record<Rarity, number>,
};
