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

/**
 * Календарь входа на 30 дней. Каждый день — одна награда, пропуск дня
 * не сбрасывает прогресс. Дни 7, 14, 21, 28 — особые, 30 — главный приз.
 * Монеты, металл, шестерни и чертежи растут с тех. уровнем игрока.
 */
export const loginCalendar: { reward: Partial<Resources>; milestone?: 'big' | 'grand' }[] = [
  { reward: { coins: 300 } },
  { reward: { scrap: 40 } },
  { reward: { coins: 400, techParts: 10 } },
  { reward: { stabilizers: 1 } },
  { reward: { coins: 500, blueprints: 1 } },
  { reward: { techParts: 20 } },
  { reward: { crystals: 20, bossPasses: 1, coins: 800 }, milestone: 'big' },
  { reward: { coins: 600 } },
  { reward: { scrap: 80 } },
  { reward: { energyCores: 1 } },
  { reward: { coins: 700, techParts: 15 } },
  { reward: { stabilizers: 2 } },
  { reward: { blueprints: 2 } },
  { reward: { crystals: 30, expansionKeys: 1, coins: 1000 }, milestone: 'big' },
  { reward: { coins: 800 } },
  { reward: { scrap: 120 } },
  { reward: { techParts: 30 } },
  { reward: { energyCores: 2 } },
  { reward: { coins: 1000, stabilizers: 1 } },
  { reward: { blueprints: 3 } },
  { reward: { crystals: 40, bossPasses: 2, coins: 1500 }, milestone: 'big' },
  { reward: { coins: 1000 } },
  { reward: { scrap: 150 } },
  { reward: { techParts: 40 } },
  { reward: { energyCores: 2, blueprints: 2 } },
  { reward: { coins: 1500 } },
  { reward: { stabilizers: 3 } },
  { reward: { crystals: 60, expansionKeys: 1, energyCores: 3 }, milestone: 'big' },
  { reward: { coins: 2000, techParts: 50 } },
  { reward: { crystals: 150, expansionKeys: 2, bossPasses: 3, coins: 5000 }, milestone: 'grand' },
];

export type QuestKind =
  | 'kill'
  | 'killHeavy'
  | 'groups'
  | 'miniboss'
  | 'items'
  | 'coins'
  | 'upgrade'
  | 'research'
  | 'boss'
  | 'login'
  | 'dailyAll';

export type QuestPeriod = 'day' | 'week' | 'month';

interface QuestDef {
  kind: QuestKind;
  title: string;
  target: number;
  /** Цель растёт с тех. уровнем (для монет). */
  scale: boolean;
  reward: Partial<Resources>;
}

/** Задания по периодам: сколько выдаётся, пул и бонус за выполнение всех. */
export const questConfig: Record<QuestPeriod, { count: number; pool: QuestDef[]; bonus: Partial<Resources>; title: string }> = {
  day: {
    title: 'Ежедневные',
    count: 4,
    bonus: { crystals: 10, bossPasses: 1 },
    pool: [
      { kind: 'kill', title: 'Уничтожить роботов', target: 150, scale: false, reward: { coins: 400, techParts: 8 } },
      { kind: 'killHeavy', title: 'Уничтожить тяжёлых или бронированных роботов', target: 15, scale: false, reward: { coins: 400, scrap: 50 } },
      { kind: 'groups', title: 'Уничтожить групп', target: 25, scale: false, reward: { coins: 500, blueprints: 1 } },
      { kind: 'miniboss', title: 'Уничтожить мини-босса', target: 1, scale: false, reward: { coins: 300, stabilizers: 1 } },
      { kind: 'items', title: 'Получить оборудование', target: 4, scale: false, reward: { coins: 400, techParts: 10 } },
      { kind: 'coins', title: 'Собрать монет с роботов', target: 1500, scale: true, reward: { techParts: 12, crystals: 3 } },
      { kind: 'upgrade', title: 'Улучшить оборудование', target: 2, scale: false, reward: { coins: 300, stabilizers: 1 } },
      { kind: 'research', title: 'Изучить уровни навыков', target: 2, scale: false, reward: { coins: 300, blueprints: 1 } },
    ],
  },
  week: {
    title: 'Еженедельные',
    count: 5,
    bonus: { crystals: 50, expansionKeys: 1, energyCores: 3 },
    pool: [
      { kind: 'kill', title: 'Уничтожить роботов', target: 1500, scale: false, reward: { coins: 2500, techParts: 40 } },
      { kind: 'killHeavy', title: 'Уничтожить тяжёлых или бронированных роботов', target: 150, scale: false, reward: { coins: 2000, scrap: 300 } },
      { kind: 'groups', title: 'Уничтожить групп', target: 200, scale: false, reward: { coins: 2500, blueprints: 4 } },
      { kind: 'miniboss', title: 'Уничтожить мини-боссов', target: 10, scale: false, reward: { stabilizers: 3, energyCores: 1 } },
      { kind: 'boss', title: 'Победить боссов', target: 3, scale: false, reward: { crystals: 25, bossPasses: 1 } },
      { kind: 'coins', title: 'Собрать монет с роботов', target: 15000, scale: true, reward: { techParts: 60, crystals: 10 } },
      { kind: 'upgrade', title: 'Улучшить оборудование', target: 15, scale: false, reward: { stabilizers: 3, coins: 1500 } },
      { kind: 'research', title: 'Изучить уровни навыков', target: 12, scale: false, reward: { blueprints: 5, coins: 1500 } },
      { kind: 'login', title: 'Забрать награду за вход (дней)', target: 5, scale: false, reward: { crystals: 15, energyCores: 1 } },
      { kind: 'dailyAll', title: 'Выполнить все ежедневные задания (раз)', target: 4, scale: false, reward: { crystals: 20, expansionKeys: 1 } },
    ],
  },
  month: {
    title: 'Ежемесячные',
    count: 5,
    bonus: { crystals: 200, expansionKeys: 3, bossPasses: 3, energyCores: 10 },
    pool: [
      { kind: 'kill', title: 'Уничтожить роботов', target: 6000, scale: false, reward: { coins: 10000, techParts: 150 } },
      { kind: 'groups', title: 'Уничтожить групп', target: 800, scale: false, reward: { coins: 8000, blueprints: 15 } },
      { kind: 'miniboss', title: 'Уничтожить мини-боссов', target: 40, scale: false, reward: { stabilizers: 10, energyCores: 4 } },
      { kind: 'boss', title: 'Победить боссов', target: 12, scale: false, reward: { crystals: 80, bossPasses: 3 } },
      { kind: 'items', title: 'Получить оборудование', target: 150, scale: false, reward: { coins: 8000, expansionKeys: 1 } },
      { kind: 'upgrade', title: 'Улучшить оборудование', target: 50, scale: false, reward: { stabilizers: 8, coins: 6000 } },
      { kind: 'research', title: 'Изучить уровни навыков', target: 40, scale: false, reward: { blueprints: 15, energyCores: 3 } },
      { kind: 'login', title: 'Забрать награду за вход (дней)', target: 20, scale: false, reward: { crystals: 60, expansionKeys: 1 } },
      { kind: 'dailyAll', title: 'Выполнить все ежедневные задания (раз)', target: 15, scale: false, reward: { crystals: 80, energyCores: 5 } },
    ],
  },
};
