import type { Rarity } from '../types';

/** Все коэффициенты баланса собраны здесь. */
export const balanceConfig = {
  /** Шансы редкости обычного выпадения (сумма = 1). */
  rarityChances: {
    common: 0.55,
    uncommon: 0.25,
    rare: 0.13,
    epic: 0.055,
    legendary: 0.015,
  } as Record<Rarity, number>,
  /** Таблица редкости мини-босса (без обычных). */
  minibossRarityChances: {
    common: 0,
    uncommon: 0.6,
    rare: 0.28,
    epic: 0.1,
    legendary: 0.02,
  } as Record<Rarity, number>,
  /** Гарантированная награда босса — редкий и выше. */
  bossRarityChances: {
    common: 0,
    uncommon: 0,
    rare: 0.7,
    epic: 0.24,
    legendary: 0.06,
  } as Record<Rarity, number>,
  /** Дополнительные предметы с босса. */
  bossExtraItems: [1, 2] as [number, number],

  /** Множитель базовых характеристик по редкости. */
  rarityStatMult: {
    common: 1,
    uncommon: 1.25,
    rare: 1.6,
    epic: 2.1,
    legendary: 2.8,
  } as Record<Rarity, number>,
  /** Количество дополнительных свойств [мин, макс]. */
  rarityExtraCount: {
    common: [0, 0],
    uncommon: [1, 1],
    rare: [1, 2],
    epic: [2, 3],
    legendary: [3, 3],
  } as Record<Rarity, [number, number]>,
  /** Количество слотов деталей [мин, макс]. */
  raritySlots: {
    common: [0, 1],
    uncommon: [0, 2],
    rare: [1, 2],
    epic: [1, 3],
    legendary: [2, 4],
  } as Record<Rarity, [number, number]>,
  /** Шанс, что отдельный слот заблокирован. */
  lockedSlotChance: 0.3,
  /** Энергопотребление растёт с редкостью медленнее силы. */
  rarityEnergyMult: {
    common: 1,
    uncommon: 1.12,
    rare: 1.3,
    epic: 1.5,
    legendary: 1.75,
  } as Record<Rarity, number>,

  item: {
    startMaxLevel: 10,
    /** Прирост базовых характеристик за уровень. */
    statPerLevel: 0.12,
  },

  /** Цена продажи: база × множитель редкости × (1 + 0.25 × (уровень−1)). */
  sell: {
    base: 15,
    rarityMult: {
      common: 1,
      uncommon: 2.5,
      rare: 7,
      epic: 20,
      legendary: 60,
    } as Record<Rarity, number>,
    perLevel: 0.25,
    /** Редкости, перед продажей которых нужно отдельное предупреждение. */
    warnFrom: 'rare' as Rarity,
  },

  /** Опыт бункера. */
  xp: {
    base: 40,
    exponent: 1.5,
    perLevel: { damagePct: 0.06, hpPct: 0.05 },
    maxLevel: 100,
  },

  /** Масштабирование волн. */
  waves: {
    baseCount: 6,
    countPerWave: 2.4,
    hpLinear: 0.1,
    hpQuad: 0.008,
    damagePerWave: 0.07,
    armorPerWave: 2,
    speedPerWave: 0.012,
    eliteBase: 0.02,
    elitePerWave: 0.012,
    spawnIntervalBase: 1.15,
    spawnIntervalPerWave: 0.05,
    spawnIntervalMin: 0.32,
    /** Награды тоже растут с волной. */
    rewardPerWave: 0.08,
  },

  /** Максимум оборудования в инвентаре; лишнее превращается в металлолом. */
  inventoryLimit: 300,
};

export type BalanceConfig = typeof balanceConfig;
