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
    rarity: { common: 0.55, uncommon: 0.4, rare: 0.05, epic: 0, legendary: 0, unique: 0, mythic: 0 } as Record<Rarity, number>,
    /** Цена оборудования = цена продажи × множитель. */
    priceMult: 4,
  },
  rare: {
    parts: 3,
    rarity: { common: 0, uncommon: 0, rare: 0.65, epic: 0.3, legendary: 0.05, unique: 0, mythic: 0 } as Record<Rarity, number>,
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
    { id: 'sp_legend', title: 'Легендарное оборудование', description: 'Случайное легендарное оборудование вашего тех. уровня.', price: { crystals: 500 }, kind: 'legendary' as const },
    { id: 'sp_epicpart', title: 'Эпическая модификация', description: 'Случайная эпическая модификация.', price: { crystals: 45 }, kind: 'epicPart' as const },
    { id: 'sp_pass', title: 'Пропуск вызова босса', description: 'Вызов босса без уничтожения групп.', price: { crystals: 30 }, kind: 'pass' as const },
    { id: 'sp_stab', title: 'Стабилизаторы ×3', description: 'Защита оборудования при улучшении.', price: { crystals: 20 }, kind: 'stabilizers' as const },
    { id: 'sp_statreset', title: 'Сброс характеристик', description: 'Возвращает очки характеристик инженера.', price: { crystals: 50 }, kind: 'statReset' as const },
    { id: 'sp_key', title: 'Ключ расширения', description: 'Открывает заблокированный слот модификации.', price: { crystals: 25 }, kind: 'key' as const },
    { id: 'sp_boost1', title: 'Бустер I', description: 'Буст вещи ±0–10%: в плюс или в минус.', price: { crystals: 90 }, kind: 'boost1' as const },
    { id: 'sp_boost2', title: 'Бустер II', description: 'Буст вещи ±10–20%: в плюс или в минус.', price: { crystals: 300 }, kind: 'boost2' as const },
    { id: 'sp_boost3', title: 'Бустер III', description: 'Буст вещи ±15–30%. Редчайший.', price: { crystals: 900 }, kind: 'boost3' as const, monthlyLimit: 3 },
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
  | 'dismantle'
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
  // День: все 4 задания — примерно 2 часа активной игры.
  day: {
    title: 'Ежедневные',
    count: 4,
    bonus: { crystals: 10, bossPasses: 1 },
    pool: [
      { kind: 'kill', title: 'Уничтожить роботов', target: 2800, scale: false, reward: { coins: 1500, techParts: 25 } },
      { kind: 'killHeavy', title: 'Уничтожить тяжёлых или бронированных роботов', target: 300, scale: false, reward: { coins: 1500, scrap: 200 } },
      { kind: 'groups', title: 'Уничтожить групп', target: 600, scale: false, reward: { coins: 1800, blueprints: 2 } },
      { kind: 'miniboss', title: 'Уничтожить мини-боссов', target: 35, scale: false, reward: { coins: 1200, stabilizers: 2 } },
      { kind: 'items', title: 'Получить оборудование', target: 80, scale: false, reward: { coins: 1500, techParts: 30 } },
      { kind: 'coins', title: 'Собрать монет с роботов', target: 40000, scale: true, reward: { techParts: 35, crystals: 4 } },
      { kind: 'dismantle', title: 'Разобрать модификаций', target: 60, scale: false, reward: { coins: 1200, components: 15 } },
      { kind: 'boss', title: 'Победить боссов', target: 6, scale: false, reward: { coins: 1500, energyCores: 2 } },
    ],
  },
  // Неделя ≈ 4,5 дня ежедневной нормы.
  week: {
    title: 'Еженедельные',
    count: 5,
    bonus: { crystals: 50, expansionKeys: 1, energyCores: 3 },
    pool: [
      { kind: 'kill', title: 'Уничтожить роботов', target: 12500, scale: false, reward: { coins: 8000, techParts: 120 } },
      { kind: 'killHeavy', title: 'Уничтожить тяжёлых или бронированных роботов', target: 1350, scale: false, reward: { coins: 7000, scrap: 900 } },
      { kind: 'groups', title: 'Уничтожить групп', target: 2700, scale: false, reward: { coins: 8000, blueprints: 8 } },
      { kind: 'miniboss', title: 'Уничтожить мини-боссов', target: 160, scale: false, reward: { stabilizers: 6, energyCores: 3 } },
      { kind: 'boss', title: 'Победить боссов', target: 27, scale: false, reward: { crystals: 25, bossPasses: 1 } },
      { kind: 'coins', title: 'Собрать монет с роботов', target: 180000, scale: true, reward: { techParts: 150, crystals: 10 } },
      { kind: 'upgrade', title: 'Успешно улучшить оборудование', target: 10, scale: false, reward: { stabilizers: 6, coins: 5000 } },
      { kind: 'dismantle', title: 'Разобрать модификаций', target: 270, scale: false, reward: { components: 60, coins: 5000 } },
      { kind: 'items', title: 'Получить оборудование', target: 360, scale: false, reward: { coins: 6000, expansionKeys: 1 } },
      { kind: 'login', title: 'Забрать награду за вход (дней)', target: 5, scale: false, reward: { crystals: 15, energyCores: 1 } },
      { kind: 'dailyAll', title: 'Выполнить все ежедневные задания (раз)', target: 5, scale: false, reward: { crystals: 20, expansionKeys: 1 } },
    ],
  },
  // Месяц ≈ 19 дней ежедневной нормы.
  month: {
    title: 'Ежемесячные',
    count: 5,
    bonus: { crystals: 200, expansionKeys: 3, bossPasses: 3, energyCores: 10 },
    pool: [
      { kind: 'kill', title: 'Уничтожить роботов', target: 53000, scale: false, reward: { coins: 30000, techParts: 450 } },
      { kind: 'groups', title: 'Уничтожить групп', target: 11500, scale: false, reward: { coins: 25000, blueprints: 30 } },
      { kind: 'miniboss', title: 'Уничтожить мини-боссов', target: 650, scale: false, reward: { stabilizers: 20, energyCores: 10 } },
      { kind: 'boss', title: 'Победить боссов', target: 110, scale: false, reward: { crystals: 80, bossPasses: 3 } },
      { kind: 'items', title: 'Получить оборудование', target: 1500, scale: false, reward: { coins: 25000, expansionKeys: 2 } },
      { kind: 'upgrade', title: 'Успешно улучшить оборудование', target: 35, scale: false, reward: { stabilizers: 20, coins: 20000 } },
      { kind: 'dismantle', title: 'Разобрать модификаций', target: 1100, scale: false, reward: { components: 250, energyCores: 5 } },
      { kind: 'login', title: 'Забрать награду за вход (дней)', target: 20, scale: false, reward: { crystals: 60, expansionKeys: 1 } },
      { kind: 'dailyAll', title: 'Выполнить все ежедневные задания (раз)', target: 18, scale: false, reward: { crystals: 80, energyCores: 5 } },
    ],
  },
};
