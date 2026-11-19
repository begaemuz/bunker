import type { Rarity, ResourceKey, Resources } from '../types';

/** Магазины. */
export const shopConfig = {
  /** Автоматическое обновление ассортимента, часов реального времени. */
  refreshHours: 4,
  /** Цена ручного обновления: база × тех. уровень × (1 + обновлений сегодня). */
  refreshBase: 80,
  regular: {
    equipment: 4,
    parts: 1,
    resources: 2,
    rarity: { common: 0.35, uncommon: 0.35, rare: 0.2, epic: 0.08, legendary: 0.02, unique: 0 } as Record<Rarity, number>,
    /** Цена оборудования = цена продажи × множитель. */
    priceMult: 4,
  },
  rare: {
    parts: 3,
    rarity: { common: 0, uncommon: 0, rare: 0.65, epic: 0.3, legendary: 0.05, unique: 0 } as Record<Rarity, number>,
    keyPrice: { coins: 1500, blueprints: 3 } as Partial<Resources>,
  },
  /** Пакеты ресурсов обычного магазина: что даётся и за сколько монет (× тех. уровень). */
  resourcePacks: [
    { give: { techParts: 10 }, price: { coins: 250 } },
    { give: { scrap: 60 }, price: { coins: 180 } },
    { give: { stabilizers: 1 }, price: { coins: 600 } },
    { give: { blueprints: 1 }, price: { coins: 500 } },
    { give: { energyCores: 1 }, price: { coins: 900 } },
  ] as { give: Partial<Resources>; price: Partial<Resources> }[],
  /** Специальный магазин за кристаллы — постоянный ассортимент. */
  special: [
    { id: 'sp_legend', title: 'Легендарное оборудование', description: 'Случайное легендарное оборудование вашего тех. уровня.', price: { crystals: 120 }, kind: 'legendary' as const },
    { id: 'sp_epicpart', title: 'Эпическая модификация', description: 'Случайная эпическая модификация.', price: { crystals: 45 }, kind: 'epicPart' as const },
    { id: 'sp_pass', title: 'Пропуск вызова босса', description: 'Вызов босса без уничтожения групп.', price: { crystals: 30 }, kind: 'pass' as const },
    { id: 'sp_stab', title: 'Стабилизаторы ×3', description: 'Защита оборудования при улучшении.', price: { crystals: 20 }, kind: 'stabilizers' as const },
    { id: 'sp_key', title: 'Ключ расширения', description: 'Открывает заблокированный слот модификации.', price: { crystals: 25 }, kind: 'key' as const },
  ],
};

/**
 * Обмен ресурсов. Курсы заданы так, чтобы обмен туда-обратно
 * всегда был в убыток, а дневной лимит не давал бесконечной выгоды.
 */
export const exchangeConfig: { id: string; from: ResourceKey; give: number; to: ResourceKey; get: number; dailyLimit: number }[] = [
  { id: 'scrap_coins', from: 'scrap', give: 20, to: 'coins', get: 50, dailyLimit: 20 },
  { id: 'coins_tech', from: 'coins', give: 300, to: 'techParts', get: 8, dailyLimit: 15 },
  { id: 'tech_scrap', from: 'techParts', give: 5, to: 'scrap', get: 40, dailyLimit: 15 },
  { id: 'tech_bp', from: 'techParts', give: 30, to: 'blueprints', get: 1, dailyLimit: 10 },
  { id: 'bp_core', from: 'blueprints', give: 4, to: 'energyCores', get: 1, dailyLimit: 5 },
  { id: 'core_stab', from: 'energyCores', give: 2, to: 'stabilizers', get: 1, dailyLimit: 5 },
  { id: 'cryst_coins', from: 'crystals', give: 5, to: 'coins', get: 600, dailyLimit: 10 },
];

/** Календарь наград за вход (7 дней по кругу; × тех. уровень открытой локации). */
export const dailyRewards: Partial<Resources>[] = [
  { coins: 300, scrap: 30 },
  { coins: 400, techParts: 10 },
  { coins: 500, stabilizers: 1 },
  { coins: 600, blueprints: 2 },
  { coins: 800, energyCores: 1, techParts: 15 },
  { coins: 1000, crystals: 10 },
  { coins: 1500, crystals: 25, expansionKeys: 1, bossPasses: 1 },
];

export type QuestKind = 'kill' | 'killHeavy' | 'groups' | 'miniboss' | 'items' | 'coins' | 'upgrade' | 'research' | 'boss';

/** Пул ежедневных заданий: цель × тех. уровень для боевых целей. */
export const questPool: { kind: QuestKind; title: string; target: number; scale: boolean; reward: Partial<Resources> }[] = [
  { kind: 'kill', title: 'Уничтожить роботов', target: 150, scale: false, reward: { coins: 400, techParts: 8 } },
  { kind: 'killHeavy', title: 'Уничтожить тяжёлых или бронированных роботов', target: 15, scale: false, reward: { coins: 400, scrap: 50 } },
  { kind: 'groups', title: 'Уничтожить групп', target: 25, scale: false, reward: { coins: 500, blueprints: 1 } },
  { kind: 'miniboss', title: 'Уничтожить мини-босса', target: 1, scale: false, reward: { coins: 300, stabilizers: 1 } },
  { kind: 'items', title: 'Получить оборудование', target: 4, scale: false, reward: { coins: 400, techParts: 10 } },
  { kind: 'coins', title: 'Собрать монет с роботов', target: 1500, scale: true, reward: { techParts: 12, crystals: 3 } },
  { kind: 'upgrade', title: 'Улучшить оборудование', target: 2, scale: false, reward: { coins: 300, stabilizers: 1 } },
  { kind: 'research', title: 'Изучить уровни навыков', target: 2, scale: false, reward: { coins: 300, blueprints: 1 } },
  { kind: 'boss', title: 'Победить босса', target: 1, scale: false, reward: { crystals: 10, energyCores: 1 } },
];
export const questsPerDay = 4;
/** Бонус за выполнение всех заданий дня. */
export const questAllBonus: Partial<Resources> = { crystals: 10, bossPasses: 1 };
