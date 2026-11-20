import type { Rarity, Resources } from '../types';

/** Все коэффициенты баланса собраны здесь. */
export const balanceConfig = {
  /** Множитель характеристик по редкости. */
  rarityStatMult: {
    common: 1,
    uncommon: 1.2,
    rare: 1.45,
    epic: 1.8,
    legendary: 2.25,
    unique: 2.4,
    mythic: 2.7,
  } as Record<Rarity, number>,
  /** Энергопотребление и нагрев растут медленнее силы. */
  rarityCostMult: {
    common: 1,
    uncommon: 1.08,
    rare: 1.18,
    epic: 1.3,
    legendary: 1.45,
    unique: 1.35,
    mythic: 1.6,
  } as Record<Rarity, number>,
  /** Сколько основных характеристик у вещи: белая 1, зелёная 2, синяя и выше 3. */
  rarityMainCount: {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 3,
    legendary: 3,
    unique: 3,
    mythic: 3,
  } as Record<Rarity, number>,
  /** Случайные дополнительные: фиолетовая +1, золотая +2 (красная в будущем +3). */
  rarityExtraCount: {
    common: [0, 0],
    uncommon: [0, 0],
    rare: [0, 0],
    epic: [1, 1],
    legendary: [2, 2],
    unique: [1, 2],
    mythic: [3, 3],
  } as Record<Rarity, [number, number]>,
  raritySlots: {
    common: [0, 1],
    uncommon: [0, 2],
    rare: [1, 2],
    epic: [1, 3],
    legendary: [2, 4],
    unique: [3, 4],
    mythic: [3, 4],
  } as Record<Rarity, [number, number]>,
  lockedSlotChance: 0.3,

  /** Рост характеристик с технологическим уровнем находки (локации). */
  tier: {
    /** Рост «плоских» характеристик и мощности катушек за каждый Т (×). */
    statGrowth: 1.42,
    coilGrowth: 1.42,
    /** Рост энергопотребления за Т (×). */
    costGrowth: 1.36,
    /** Рост цены улучшения за Т (×). */
    upgradeGrowth: 1.4,
  },

  item: {
    startMaxLevel: 10,
    /** Прирост основных характеристик за уровень улучшения. */
    statPerLevel: 0.1,
    /** Уровень оборудования не может превышать уровень бункера + это значение. */
    levelOverBunker: 2,
  },

  /** Улучшение оборудования. */
  upgrade: {
    /** Стоимость = база × (1 + уровень)^exp × множитель редкости × (1 + 0.5 × (tier − 1)). */
    base: { coins: 40, scrap: 6, techParts: 2 } as Partial<Resources>,
    exponent: 1.6,
    rarityMult: {
      common: 1,
      uncommon: 1.4,
      rare: 2,
      epic: 3,
      legendary: 4.5,
      unique: 5,
      mythic: 7,
    } as Record<Rarity, number>,
    /** С 7-го уровня нужны энергоядра. */
    coresFromLevel: 7,
    coresPerLevel: 1,
    /** Шанс успеха перехода с уровня N на N+1 (индекс = N−1). Последний шаг 9→10 — всего 10%. */
    successChance: [0.9, 0.8, 0.7, 0.6, 0.48, 0.38, 0.28, 0.18, 0.1],
    minChance: 0.1,
    /** Абсолютный предел уровня вещи. */
    maxLevel: 10,
  },

  sell: {
    base: 15,
    rarityMult: {
      common: 1,
      uncommon: 2.5,
      rare: 7,
      epic: 20,
      legendary: 60,
      unique: 120,
      mythic: 300,
    } as Record<Rarity, number>,
    perLevel: 0.25,
    perTier: 0.6,
    warnFrom: 'rare' as Rarity,
  },

  /** Опыт и уровень бункера. Уровень не даёт прямых бонусов — он открывает возможности. */
  /**
   * Опыт: на уровень L нужно base × growth^(L−1). Рассчитано так, что при 3–4 часах
   * игры в день 75–80 уровень берётся примерно за месяц, а 100 — за несколько месяцев.
   */
  xp: {
    base: 104,
    growth: 1.158,
    maxLevel: 100,
  },

  /**
   * Снижение наград за слабых противников: если уровень бункера выше
   * levelCap локации, опыт и монеты падают на step за уровень (не ниже min).
   */
  rewardDecay: { step: 0.12, min: 0.15 },

  /** Непрерывное появление роботов. */
  spawn: {
    groupInterval: 5.5,
    groupSizeMin: 3,
    groupSizeMax: 5,
    maxAliveBase: 10,
    maxAlivePerTier: 2,
    /** Рост «угрозы» за уничтоженную группу и её предел. */
    threatPerGroup: 0.005,
    threatMax: 0.8,
    eliteBase: 0.03,
    elitePerThreat: 0.12,
    firstGroupDelay: 1.2,
  },

  /** Масштабирование роботов по технологическому уровню локации. */
  scaling: {
    hpPerTier: 1.5,
    damagePerTier: 1.36,
    armorPerTier: 9,
    rewardPerTier: 1.45,
    /** Угроза добавляет к HP и урону. */
    threatHp: 0.8,
    threatDamage: 0.5,
  },

  /** Ремонт бункера после уничтожения группы (доля макс. прочности). */
  groupRepair: 0.05,
  /** Максимум оборудования в инвентаре; лишнее превращается в металлолом. */
  inventoryLimit: 300,
};
