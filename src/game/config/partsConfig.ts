import type { Element, EquipCategory, Rarity, StatKey, StatMod } from '../types';

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

/**
 * Модификации меняют поведение бункера, а не просто добавляют цифры:
 * цепные разряды, оглушение, энергия за убийство, отражение урона.
 * У каждой — один эффект, сила зависит от редкости и качества.
 */
export const partTemplates: PartTemplate[] = [
  { id: 'p_chain', name: 'Цепной разрядник', description: 'Разряд может перескочить на соседние цели.', fits: ['coil', 'sensor'], stat: 'chance:chain', range: [0.03, 0.045], weight: 8 },
  { id: 'p_stun', name: 'Оглушитель', description: 'Разряд может на мгновение оглушить робота.', fits: ['coil', 'capacitor'], stat: 'chance:stun', range: [0.025, 0.04], weight: 7 },
  { id: 'p_slow', name: 'Вязкое поле', description: 'Разряд может замедлить робота.', fits: ['coil', 'cooling'], stat: 'chance:slow', range: [0.04, 0.06], weight: 8 },
  { id: 'p_burn', name: 'Плазменный поджиг', description: 'Разряд может поджечь робота: урон со временем.', fits: ['coil', 'generator'], stat: 'chance:burn', range: [0.04, 0.06], weight: 8 },
  { id: 'p_armor', name: 'Бронебой', description: 'Разряд может пробить броню робота.', fits: ['coil', 'sensor'], stat: 'chance:armorBreak', range: [0.04, 0.06], weight: 7 },
  { id: 'p_shield', name: 'Срыв щитов', description: 'Разряд может сорвать энергощит робота.', fits: ['coil', 'capacitor'], stat: 'chance:shieldBreak', range: [0.04, 0.06], weight: 6 },
  { id: 'p_jam', name: 'Глушитель систем', description: 'Разряд может сбить наведение робота.', fits: ['coil', 'converter'], stat: 'chance:jam', range: [0.03, 0.05], weight: 6 },
  { id: 'p_vampire', name: 'Рекуператор', description: 'Каждое уничтожение робота возвращает энергию.', fits: ['capacitor', 'generator', 'converter'], stat: 'b:killEnergy', range: [0.4, 0.7], weight: 6 },
  { id: 'p_frost', name: 'Криосброс', description: 'Каждое уничтожение робота снимает нагрев.', fits: ['cooling', 'generator'], stat: 'b:coolOnKill', range: [0.5, 0.9], weight: 6 },
  { id: 'p_mirror', name: 'Зеркальная броня', description: 'Часть урона по бункеру возвращается атакующему.', fits: ['shield', 'cooling'], stat: 'b:reflect', range: [0.03, 0.05], weight: 5 },
  { id: 'p_first', name: 'Первый удар', description: 'Первый импульс катушки после паузы сильнее.', fits: ['capacitor', 'coil'], stat: 'b:firstPulse', range: [0.1, 0.15], weight: 5 },
  { id: 'p_mark', name: 'Целеуказатель', description: 'Подсвеченные цели получают больше урона.', fits: ['sensor', 'shield'], stat: 'b:markTargets', range: [0.03, 0.05], weight: 5 },
];

/** Перенос старых модификаций (до версии 8) на новые эффекты. */
export const legacyPartMap: Record<string, string> = {
  p_power: 'p_first',
  p_lens: 'p_slow',
  p_freq: 'p_stun',
  p_saver: 'p_jam',
  p_cell: 'p_vampire',
  p_booster: 'p_burn',
  p_radiator: 'p_frost',
  p_plate: 'p_mirror',
  p_repair: 'p_mirror',
  p_crit: 'p_armor',
  p_chain: 'p_chain',
  p_scan: 'p_mark',
};

/** Стихии и резонанс: 2, 4 и 6 модификаций одной стихии в надетых вещах. */
export const elementConfig: Record<Element, { name: string; color: string; bonuses: [StatMod, StatMod, StatMod]; text: [string, string, string] }> = {
  shock: {
    name: 'Ток',
    color: '#ffd84d',
    bonuses: [
      { stat: 'coilPowerPct', value: 0.08 },
      { stat: 'coilRatePct', value: 0.12 },
      { stat: 'chance:chain', value: 0.1 },
    ],
    text: ['+8% мощности катушек', '+12% скорости катушек', '+10% шанс цепного разряда'],
  },
  frost: {
    name: 'Холод',
    color: '#7fd8ff',
    bonuses: [
      { stat: 'coolRatePct', value: 0.1 },
      { stat: 'heatCap', value: 40 },
      { stat: 'chance:slow', value: 0.15 },
    ],
    text: ['+10% охлаждения', '+40 к пределу нагрева', '+15% шанс замедления'],
  },
  magnet: {
    name: 'Магнит',
    color: '#c58bff',
    bonuses: [
      { stat: 'hullPct', value: 0.06 },
      { stat: 'damageReduction', value: 0.05 },
      { stat: 'b:reflect', value: 0.1 },
    ],
    text: ['+6% прочности корпуса', '+5% снижения урона', '+10% отражения урона'],
  },
  plasma: {
    name: 'Плазма',
    color: '#ff7a4d',
    bonuses: [
      { stat: 'critDamage', value: 0.2 },
      { stat: 'critChance', value: 0.05 },
      { stat: 'chance:burn', value: 0.12 },
    ],
    text: ['+20% урона крита', '+5% шанса крита', '+12% шанс поджога'],
  },
};
export const RESONANCE_STEPS = [2, 4, 6] as const;


/** Множитель силы детали по редкости. */
export const partRarityMult: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2.2,
  epic: 3.2,
  legendary: 4.6,
  unique: 5,
  mythic: 6,
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
};

/** Цена объединения трёх модификаций этой редкости. */
export const fusionCost: Partial<Record<Rarity, { coins: number; components: number }>> = {
  common: { coins: 300, components: 2 },
  uncommon: { coins: 1200, components: 5 },
  rare: { coins: 4000, components: 12 },
  epic: { coins: 12000, components: 30 },
};

/** Компоненты при разборе: база по редкости, растёт с качеством (×0.5…×1.5). */
export const dismantleYield: Record<Rarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 7,
  epic: 16,
  legendary: 35,
  unique: 50,
  mythic: 80,
};

/** У модификации один эффект; редкость определяет его силу. */
export const partStatCount: Record<Rarity, number> = {
  common: 1,
  uncommon: 1,
  rare: 1,
  epic: 1,
  legendary: 1,
  unique: 1,
  mythic: 1,
};

/** Дополнительные свойства слабее основного. */
export const partExtraMult = 0.5;

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
  rarity: { common: 0.6, uncommon: 0.27, rare: 0.1, epic: 0.03, legendary: 0, unique: 0, mythic: 0 } as Record<Rarity, number>,
};
