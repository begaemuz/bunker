import type { AttackType, CoilMode, EffectKind, EquipCategory, Rarity, ResourceKey, SimpleStatKey, SlotId, UniqueEffect } from '../game/types';
import { modeConfig } from '../game/config/gameConfig';

export const ru = {
  rarity: {
    common: 'Обычное',
    uncommon: 'Необычное',
    rare: 'Редкое',
    epic: 'Эпическое',
    legendary: 'Легендарное',
    unique: 'Уникальное',
  } as Record<Rarity, string>,
  category: {
    generator: 'Генератор',
    coil: 'Катушка',
    capacitor: 'Конденсаторный блок',
    converter: 'Преобразователь',
    cooling: 'Охлаждение',
    sensor: 'Сенсорный комплекс',
    shield: 'Защитный контур',
  } as Record<EquipCategory, string>,
  slot: {
    generator: 'Генератор',
    coil1: 'Катушка №1',
    coil2: 'Катушка №2',
    capacitor: 'Конденсаторы',
    converter: 'Преобразователь',
    cooling: 'Охлаждение',
    sensor: 'Сенсоры',
    shield: 'Защитный контур',
  } as Record<SlotId, string>,
  slotShort: {
    generator: 'Генератор',
    coil1: 'Катушка 1',
    coil2: 'Катушка 2',
    capacitor: 'Конденсат.',
    converter: 'Преобраз.',
    cooling: 'Охлаждение',
    sensor: 'Сенсоры',
    shield: 'Защита',
  } as Record<SlotId, string>,
  slotHint: {
    generator: 'Производит энергию для всех систем',
    coil1: 'Основное средство поражения',
    coil2: 'Работает одновременно с катушкой №1',
    capacitor: 'Накапливает энергию и усиливает импульс',
    converter: 'Снижает потери при передаче энергии',
    cooling: 'Отводит тепло от катушек',
    sensor: 'Опознаёт цели и находит уязвимости',
    shield: 'Прочность и снижение урона',
  } as Record<SlotId, string>,
  resource: {
    coins: 'Монеты',
    scrap: 'Металлолом',
    techParts: 'Тех. компоненты',
    blueprints: 'Чертежи',
    energyCores: 'Энергоядра',
    crystals: 'Кристаллы',
    stabilizers: 'Стабилизаторы',
    bossPasses: 'Пропуски вызова',
    expansionKeys: 'Ключи расширения',
  } as Record<ResourceKey, string>,
  resourceHint: {
    coins: 'Основная валюта: улучшения и исследования.',
    scrap: 'Материал для улучшения оборудования и защиты.',
    techParts: 'Улучшение оборудования и исследования.',
    blueprints: 'Нужны для продвинутых технологий.',
    energyCores: 'Редкий ресурс для высоких уровней оборудования.',
    crystals: 'Особая валюта. Пригодится в специальном магазине.',
    stabilizers: 'Защищают оборудование от уничтожения при неудачном улучшении.',
    bossPasses: 'Позволяют вызвать босса без уничтожения групп.',
    expansionKeys: 'Открывают заблокированный слот модификации в оборудовании.',
  } as Record<ResourceKey, string>,
  attack: {
    kinetic: 'Кинетические',
    explosive: 'Взрывные',
    energy: 'Энергетические',
  } as Record<AttackType, string>,
  effect: {
    stun: 'Отключение управления',
    slow: 'Замедление',
    burn: 'Перегрев узлов',
    jam: 'Подавление связи',
    shieldBreak: 'Перегрузка щита',
    chain: 'Цепной разряд',
    armorBreak: 'Ослабление брони',
  } as Record<EffectKind, string>,
  stat: {
    genPower: 'Мощность',
    genPowerPct: 'Мощность генератора',
    conversion: 'КПД передачи',
    capacity: 'Ёмкость накопителя',
    capacityPct: 'Ёмкость накопителя',
    chargeRate: 'Скорость зарядки',
    dischargeBonus: 'Усиление разряда',
    drainPct: 'Потребление модулей',
    coilPowerPct: 'Мощность катушек',
    coilRadiusPct: 'Радиус катушек',
    coilRatePct: 'Частота импульсов',
    pulseCostPct: 'Энергия на импульс',
    coolRate: 'Охлаждение',
    coolRatePct: 'Скорость охлаждения',
    heatCap: 'Допустимый нагрев',
    heatPct: 'Нагрев оборудования',
    overdrive: 'Форсаж (холодный режим)',
    detectRange: 'Дальность обнаружения',
    identifySpeed: 'Скорость опознания',
    identifiedBonus: 'Урон по опознанным',
    critChance: 'Шанс поражения узла',
    critDamage: 'Сила поражения узла',
    hullHp: 'Прочность',
    hullPct: 'Прочность бункера',
    damageReduction: 'Снижение урона',
    regen: 'Ремонт',
    emergencyRepair: 'Аварийный ремонт',
    moduleBonus: 'Эффективность модулей',
    coinPct: 'Монеты с роботов',
    dropChancePct: 'Шанс трофеев',
    xpPct: 'Опыт',
  } as Record<SimpleStatKey, string>,
};

export function modeName(m: CoilMode): string {
  return modeConfig[m].name;
}

export function statLabel(stat: string): string {
  if (stat.startsWith('resist:')) return `Защита: ${ru.attack[stat.slice(7) as AttackType].toLowerCase()}`;
  if (stat.startsWith('mode:')) return `Режим «${modeConfig[stat.slice(5) as CoilMode].short}»`;
  if (stat.startsWith('chance:')) return `Шанс: ${ru.effect[stat.slice(7) as EffectKind].toLowerCase()}`;
  return ru.stat[stat as SimpleStatKey] ?? stat;
}

export function uniqueText(u: UniqueEffect): string {
  const pct = `${Math.round(u.value * 100)}%`;
  switch (u.kind) {
    case 'firstPulse':
      return `Первый импульс каждой катушки после паузы мощнее на ${pct}`;
    case 'dualCoil':
      return `Если установлены обе катушки, их мощность +${pct}`;
    case 'shieldStrip':
      return `Каждый импульс снимает ${pct} энергощита цели`;
    case 'electronics':
      return `+${pct} урона по электронике и +10% шанс отключить управление`;
    case 'killEnergy':
      return `Уничтожение робота возвращает ${u.value} ед. энергии в накопитель`;
    case 'coolOnKill':
      return `Уничтожение робота снижает нагрев на ${u.value}`;
    case 'reflect':
      return `Отражает ${pct} урона ближнего боя обратно атакующему`;
    case 'markTargets':
      return `Опознанные цели получают +${pct} урона от всех систем`;
  }
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
