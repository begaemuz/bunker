import type { DamageType, EffectKind, EquipCategory, Rarity, ResourceKey, SimpleStatKey } from '../game/types';

export const ru = {
  rarity: {
    common: 'Обычный',
    uncommon: 'Необычный',
    rare: 'Редкий',
    epic: 'Эпический',
    legendary: 'Легендарный',
  } as Record<Rarity, string>,
  category: {
    generator: 'Генератор',
    coil: 'Катушка',
    capacitor: 'Конденсатор',
    reactor: 'Реактор',
  } as Record<EquipCategory, string>,
  categoryPlural: {
    generator: 'Генераторы',
    coil: 'Катушки',
    capacitor: 'Конденсаторы',
    reactor: 'Реакторы',
  } as Record<EquipCategory, string>,
  resource: {
    coins: 'Монеты',
    techParts: 'Тех. компоненты',
    energyCores: 'Энергоядра',
    crystals: 'Кристаллы',
    scrap: 'Металлолом',
    stabilizers: 'Стабилизаторы',
  } as Record<ResourceKey, string>,
  resourceHint: {
    coins: 'Основная валюта: покупки, улучшения, обновление магазина.',
    techParts: 'Улучшение предметов, создание оборудования, технологии.',
    energyCores: 'Редкий ресурс для особых улучшений и технологий.',
    crystals: 'Особая валюта специального магазина.',
    scrap: 'Материал для создания предметов и рецептов.',
    stabilizers: 'Защищают предмет от уничтожения при неудачном улучшении.',
  } as Record<ResourceKey, string>,
  damage: {
    electric: 'Электрический',
    fire: 'Огненный',
    kinetic: 'Кинетический',
    energy: 'Энергетический',
    cold: 'Холод',
    radiation: 'Радиационный',
    dot: 'Периодический',
    explosive: 'Взрывной',
  } as Record<DamageType, string>,
  effect: {
    slow: 'Замедление',
    freeze: 'Заморозка',
    stun: 'Оглушение',
    burn: 'Поджог',
    shock: 'Электропоражение',
    corrosion: 'Коррозия',
    armorBreak: 'Снижение брони',
    chain: 'Цепная молния',
    extraPulse: 'Доп. импульс',
    splash: 'Взрыв при уничтожении',
  } as Record<EffectKind, string>,
  stat: {
    hpFlat: 'Прочность',
    hpPct: 'Прочность',
    regenFlat: 'Регенерация',
    radiusFlat: 'Радиус',
    radiusPct: 'Радиус',
    damageFlat: 'Урон импульса',
    damagePct: 'Урон импульса',
    ratePct: 'Частота импульсов',
    energyGen: 'Выработка энергии',
    energyUsePct: 'Энергопотребление',
    batteryCap: 'Энергорезерв',
    effectSlots: 'Слоты эффектов',
    critChance: 'Шанс крит. импульса',
    critDamage: 'Сила крит. импульса',
    effectPower: 'Сила эффектов',
    dropChancePct: 'Шанс выпадения предметов',
    coinPct: 'Монеты с роботов',
  } as Record<SimpleStatKey, string>,
};

export function statLabel(stat: string): string {
  if (stat.startsWith('resist:')) return `Сопр.: ${ru.damage[stat.slice(7) as DamageType].toLowerCase()}`;
  if (stat.startsWith('extra:')) return `Доп. урон: ${ru.damage[stat.slice(6) as DamageType].toLowerCase()}`;
  if (stat.startsWith('chance:')) return `Шанс: ${ru.effect[stat.slice(7) as EffectKind].toLowerCase()}`;
  return ru.stat[stat as SimpleStatKey] ?? stat;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return Math.floor(n).toString();
}
