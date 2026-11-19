import type { EquipCategory, StatKey } from '../types';

/** Диапазон значения характеристики для обычной редкости. */
export interface StatRange {
  stat: StatKey;
  min: number;
  max: number;
}

export interface ItemTemplate {
  id: string;
  name: string;
  category: EquipCategory;
  /** Базовые характеристики (всегда есть у предмета). */
  base: StatRange[];
  /** Энергопотребление при обычной редкости [мин, макс]. */
  energyCost: [number, number];
  /** Вес шаблона при выпадении. */
  weight: number;
}

/**
 * Значения для процентов задаются долями: 0.12 = +12%.
 * Для генераторов energyGen — ед/сек.
 */
export const itemTemplates: ItemTemplate[] = [
  // ── Генераторы ──
  {
    id: 'gen_diesel',
    name: 'Дизельный генератор',
    category: 'generator',
    base: [{ stat: 'energyGen', min: 7, max: 11 }],
    energyCost: [0, 0],
    weight: 10,
  },
  {
    id: 'gen_thermo',
    name: 'Термоэлектрический генератор',
    category: 'generator',
    base: [
      { stat: 'energyGen', min: 5, max: 8 },
      { stat: 'hpFlat', min: 60, max: 110 },
    ],
    energyCost: [0, 0],
    weight: 7,
  },
  {
    id: 'gen_plasma',
    name: 'Плазменный генератор',
    category: 'generator',
    base: [
      { stat: 'energyGen', min: 10, max: 15 },
      { stat: 'batteryCap', min: 10, max: 20 },
    ],
    energyCost: [0, 0],
    weight: 4,
  },
  // ── Катушки ──
  {
    id: 'coil_pulse',
    name: 'Катушка электрического импульса',
    category: 'coil',
    base: [
      { stat: 'damagePct', min: 0.08, max: 0.14 },
      { stat: 'radiusPct', min: 0.04, max: 0.08 },
    ],
    energyCost: [6, 8],
    weight: 10,
  },
  {
    id: 'coil_tesla',
    name: 'Катушка Теслы',
    category: 'coil',
    base: [
      { stat: 'damageFlat', min: 5, max: 9 },
      { stat: 'chance:chain', min: 0.06, max: 0.1 },
    ],
    energyCost: [7, 9],
    weight: 6,
  },
  {
    id: 'coil_cryo',
    name: 'Криокатушка',
    category: 'coil',
    base: [
      { stat: 'extra:cold', min: 0.12, max: 0.2 },
      { stat: 'chance:slow', min: 0.15, max: 0.25 },
    ],
    energyCost: [6, 8],
    weight: 6,
  },
  {
    id: 'coil_wide',
    name: 'Широкополосная катушка',
    category: 'coil',
    base: [{ stat: 'radiusFlat', min: 12, max: 20 }],
    energyCost: [5, 7],
    weight: 7,
  },
  // ── Конденсаторы ──
  {
    id: 'cap_pulse',
    name: 'Импульсный конденсатор',
    category: 'capacitor',
    base: [{ stat: 'ratePct', min: 0.08, max: 0.14 }],
    energyCost: [5, 7],
    weight: 10,
  },
  {
    id: 'cap_super',
    name: 'Суперконденсатор',
    category: 'capacitor',
    base: [
      { stat: 'batteryCap', min: 20, max: 35 },
      { stat: 'ratePct', min: 0.04, max: 0.07 },
    ],
    energyCost: [3, 5],
    weight: 6,
  },
  {
    id: 'cap_shock',
    name: 'Ударный конденсатор',
    category: 'capacitor',
    base: [
      { stat: 'damageFlat', min: 6, max: 10 },
      { stat: 'critChance', min: 0.04, max: 0.07 },
    ],
    energyCost: [6, 8],
    weight: 6,
  },
  // ── Реакторы ──
  {
    id: 'reac_compact',
    name: 'Компактный реактор',
    category: 'reactor',
    base: [
      { stat: 'energyGen', min: 4, max: 7 },
      { stat: 'batteryCap', min: 15, max: 25 },
    ],
    energyCost: [2, 3],
    weight: 10,
  },
  {
    id: 'reac_isotope',
    name: 'Изотопный реактор',
    category: 'reactor',
    base: [
      { stat: 'extra:radiation', min: 0.1, max: 0.18 },
      { stat: 'energyGen', min: 3, max: 5 },
    ],
    energyCost: [3, 4],
    weight: 6,
  },
  {
    id: 'reac_fusion',
    name: 'Реактор синтеза',
    category: 'reactor',
    base: [
      { stat: 'energyUsePct', min: -0.08, max: -0.14 },
      { stat: 'damagePct', min: 0.04, max: 0.08 },
    ],
    energyCost: [2, 3],
    weight: 5,
  },
];

/** Пулы дополнительных свойств по категориям. */
export const extraStatPools: Record<EquipCategory, StatRange[]> = {
  generator: [
    { stat: 'energyGen', min: 2, max: 4 },
    { stat: 'batteryCap', min: 8, max: 15 },
    { stat: 'hpFlat', min: 40, max: 80 },
    { stat: 'regenFlat', min: 0.3, max: 0.7 },
    { stat: 'energyUsePct', min: -0.03, max: -0.06 },
    { stat: 'resist:kinetic', min: 0.03, max: 0.06 },
    { stat: 'resist:explosive', min: 0.04, max: 0.08 },
  ],
  coil: [
    { stat: 'damagePct', min: 0.04, max: 0.08 },
    { stat: 'radiusFlat', min: 5, max: 10 },
    { stat: 'extra:fire', min: 0.06, max: 0.12 },
    { stat: 'extra:electric', min: 0.06, max: 0.12 },
    { stat: 'chance:burn', min: 0.08, max: 0.15 },
    { stat: 'chance:shock', min: 0.08, max: 0.15 },
    { stat: 'chance:stun', min: 0.03, max: 0.06 },
    { stat: 'chance:chain', min: 0.04, max: 0.07 },
    { stat: 'effectPower', min: 0.05, max: 0.1 },
  ],
  capacitor: [
    { stat: 'ratePct', min: 0.03, max: 0.06 },
    { stat: 'critChance', min: 0.02, max: 0.05 },
    { stat: 'critDamage', min: 0.1, max: 0.2 },
    { stat: 'chance:extraPulse', min: 0.04, max: 0.08 },
    { stat: 'chance:armorBreak', min: 0.06, max: 0.12 },
    { stat: 'batteryCap', min: 8, max: 15 },
    { stat: 'effectSlots', min: 1, max: 1 },
  ],
  reactor: [
    { stat: 'energyGen', min: 2, max: 4 },
    { stat: 'extra:energy', min: 0.06, max: 0.12 },
    { stat: 'chance:corrosion', min: 0.08, max: 0.14 },
    { stat: 'chance:splash', min: 0.06, max: 0.12 },
    { stat: 'chance:freeze', min: 0.03, max: 0.05 },
    { stat: 'hpPct', min: 0.04, max: 0.08 },
    { stat: 'resist:energy', min: 0.04, max: 0.08 },
    { stat: 'dropChancePct', min: 0.05, max: 0.1 },
    { stat: 'coinPct', min: 0.05, max: 0.12 },
  ],
};

/** Стартовое оборудование новой игры (обычная редкость). */
export const starterTemplates = ['gen_diesel', 'coil_pulse', 'cap_pulse', 'reac_compact'];

/** Стартовые слоты бункера. Расширяются деревом технологий (этап 5). */
export const startSlots = { generator: 1, coil: 1, capacitor: 1, reactor: 1 };
