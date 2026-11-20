import type { RobotKind } from './enemiesConfig';
import type { Rarity, ResourceKey } from '../types';

export interface LocationDef {
  id: number;
  name: string;
  description: string;
  /** Технологический уровень противников и находок. */
  tier: number;
  /** Сколько групп уничтожить до возможности вызвать босса. */
  groupsForBoss: number;
  /** Уровень бункера, выше которого награды за слабых роботов снижаются. */
  levelCap: number;
  /** Рекомендуемый уровень бункера. */
  recommendedLevel: number;
  enemies: { kind: Exclude<RobotKind, 'miniboss'>; weight: number }[];
  /** Каждая N-я группа приводит мини-босса. */
  minibossEvery: number;
  boss: string;
  /** Множители ресурсов локации. */
  resourceMult: Partial<Record<ResourceKey, number>>;
  /** Шансы редкости оборудования с обычных роботов. */
  rarity: Record<Rarity, number>;
  palette: { ground: string; groundAlt: string; debris: string; accent: string; fog: string };
  /** Особая зона (подземелье, разлом). */
  special?: 'rift';
}

/** Редкость вещей с обычных роботов: белые, иногда зелёные, синие — очень редко. Фиолетовые и золотые — только с боссов. */
const R = (common: number, uncommon: number, rare: number, epic: number, legendary: number): Record<Rarity, number> => ({
  common,
  uncommon,
  rare,
  epic,
  legendary,
  unique: 0,
  mythic: 0,
});

const baseLocations: LocationDef[] = [
  {
    id: 1,
    name: 'Разрушенный городской район',
    description: 'Окраины мегаполиса. Лёгкие разведчики и первые тяжёлые машины.',
    tier: 1,
    groupsForBoss: 10,
    levelCap: 8,
    recommendedLevel: 1,
    enemies: [
      { kind: 'light', weight: 12 },
      { kind: 'kamikaze', weight: 2 },
      { kind: 'heavy', weight: 2 },
      { kind: 'ranged', weight: 3 },
      { kind: 'support', weight: 1 },
    ],
    minibossEvery: 12,
    boss: 'colossus',
    resourceMult: {},
    rarity: R(0.85, 0.145, 0.005, 0, 0),
    palette: { ground: '#16181b', groundAlt: '#1d2024', debris: '#2b2f35', accent: '#3a3128', fog: '#0b0c0e' },
  },
  {
    id: 2,
    name: 'Промышленная зона',
    description: 'Заводы, захваченные ИИ. Много тяжёлой и бронированной техники.',
    tier: 2,
    groupsForBoss: 10,
    levelCap: 14,
    recommendedLevel: 7,
    enemies: [
      { kind: 'light', weight: 6 },
      { kind: 'heavy', weight: 5 },
      { kind: 'armored', weight: 3 },
      { kind: 'ranged', weight: 3 },
      { kind: 'support', weight: 2 },
      { kind: 'kamikaze', weight: 2 },
    ],
    minibossEvery: 10,
    boss: 'smith',
    resourceMult: { scrap: 1.6, techParts: 1.2 },
    rarity: R(0.83, 0.16, 0.01, 0, 0),
    palette: { ground: '#1a1714', groundAlt: '#221d18', debris: '#3a3028', accent: '#5a3a1c', fog: '#0d0b09' },
  },
  {
    id: 3,
    name: 'Пустынная территория',
    description: 'Раскалённые пустоши. Стаи камикадзе и машины, устойчивые к нагреву.',
    tier: 3,
    groupsForBoss: 12,
    levelCap: 20,
    recommendedLevel: 13,
    enemies: [
      { kind: 'light', weight: 6 },
      { kind: 'kamikaze', weight: 5 },
      { kind: 'ranged', weight: 4 },
      { kind: 'heavy', weight: 3 },
      { kind: 'shielded', weight: 2 },
    ],
    minibossEvery: 10,
    boss: 'worm',
    resourceMult: { coins: 1.3, scrap: 1.2 },
    rarity: R(0.81, 0.175, 0.015, 0, 0),
    palette: { ground: '#2a2318', groundAlt: '#352c1e', debris: '#4a3d28', accent: '#6b5230', fog: '#120e08' },
  },
  {
    id: 4,
    name: 'Заснеженный регион',
    description: 'Ледяные базы на севере. Броня, щиты и подавление систем.',
    tier: 4,
    groupsForBoss: 12,
    levelCap: 26,
    recommendedLevel: 19,
    enemies: [
      { kind: 'armored', weight: 4 },
      { kind: 'shielded', weight: 4 },
      { kind: 'heavy', weight: 3 },
      { kind: 'light', weight: 4 },
      { kind: 'support', weight: 2 },
    ],
    minibossEvery: 8,
    boss: 'icebreaker',
    resourceMult: { techParts: 1.4, energyCores: 1.3 },
    rarity: R(0.79, 0.19, 0.02, 0, 0),
    palette: { ground: '#1c2228', groundAlt: '#25303a', debris: '#3a4652', accent: '#5a6b7a', fog: '#0a0e12' },
  },
  {
    id: 5,
    name: 'Радиоактивная зона',
    description: 'Заражённые руины. Щитоносцы и поддержка образуют плотные группы.',
    tier: 5,
    groupsForBoss: 14,
    levelCap: 32,
    recommendedLevel: 25,
    enemies: [
      { kind: 'shielded', weight: 5 },
      { kind: 'support', weight: 3 },
      { kind: 'ranged', weight: 4 },
      { kind: 'light', weight: 4 },
      { kind: 'armored', weight: 2 },
    ],
    minibossEvery: 8,
    boss: 'isotope',
    resourceMult: { energyCores: 1.8, blueprints: 1.3 },
    rarity: R(0.77, 0.205, 0.025, 0, 0),
    palette: { ground: '#171c14', groundAlt: '#1f2619', debris: '#2f3a24', accent: '#4a5a1c', fog: '#090b07' },
  },
  {
    id: 6,
    name: 'Заброшенный научный комплекс',
    description: 'Лаборатории, где ИИ испытывает новые модели. Сильные смешанные отряды.',
    tier: 6,
    groupsForBoss: 15,
    levelCap: 38,
    recommendedLevel: 31,
    enemies: [
      { kind: 'shielded', weight: 4 },
      { kind: 'armored', weight: 3 },
      { kind: 'ranged', weight: 4 },
      { kind: 'support', weight: 3 },
      { kind: 'kamikaze', weight: 3 },
      { kind: 'heavy', weight: 3 },
    ],
    minibossEvery: 7,
    boss: 'prototype',
    resourceMult: { blueprints: 1.8, techParts: 1.3 },
    rarity: R(0.75, 0.22, 0.03, 0, 0),
    palette: { ground: '#18171d', groundAlt: '#211f29', debris: '#322e3d', accent: '#4a3a5a', fog: '#0a090d' },
  },
  {
    id: 7,
    name: 'Главный производственный комплекс ИИ',
    description: 'Сердце машинной армии. Самые опасные роботы и Ядро ИИ.',
    tier: 7,
    groupsForBoss: 16,
    levelCap: 99,
    recommendedLevel: 37,
    enemies: [
      { kind: 'armored', weight: 4 },
      { kind: 'shielded', weight: 4 },
      { kind: 'heavy', weight: 3 },
      { kind: 'ranged', weight: 3 },
      { kind: 'support', weight: 3 },
      { kind: 'kamikaze', weight: 3 },
      { kind: 'light', weight: 3 },
    ],
    minibossEvery: 6,
    boss: 'core',
    resourceMult: { coins: 1.5, energyCores: 1.5, crystals: 2 },
    rarity: R(0.72, 0.245, 0.035, 0, 0),
    palette: { ground: '#1a1416', groundAlt: '#24191c', debris: '#3a2228', accent: '#5a1c24', fog: '#0d0809' },
  },
];

/** Зоны 8–20: те же вещи, но выше Т-уровень. */
const EXTRA_ZONES: Omit<LocationDef, 'tier' | 'levelCap' | 'recommendedLevel' | 'groupsForBoss' | 'minibossEvery' | 'rarity'>[] = [
  { id: 8, name: 'Затопленный мегаполис', description: 'Город ушёл под воду, но машины работают и на дне.', boss: 'tide', resourceMult: { scrap: 1.5 }, enemies: [{ kind: 'heavy', weight: 4 }, { kind: 'shielded', weight: 3 }, { kind: 'ranged', weight: 3 }, { kind: 'light', weight: 3 }], palette: { ground: '#111a1e', groundAlt: '#152229', debris: '#203540', accent: '#1d4a5a', fog: '#070c0f' } },
  { id: 9, name: 'Пепельные равнины', description: 'Выжженная земля после ядерных бурь. Плотные группы штурмовиков.', boss: 'ash', resourceMult: { techParts: 1.4 }, enemies: [{ kind: 'armored', weight: 4 }, { kind: 'heavy', weight: 4 }, { kind: 'kamikaze', weight: 3 }, { kind: 'support', weight: 2 }], palette: { ground: '#1b1917', groundAlt: '#24211e', debris: '#38332e', accent: '#5a4a3a', fog: '#0c0b0a' } },
  { id: 10, name: 'Ледяной ангар', description: 'Замёрзшая база тяжёлой техники. Холод замедляет и вас, и их.', boss: 'frostgate', resourceMult: { energyCores: 1.4 }, enemies: [{ kind: 'shielded', weight: 4 }, { kind: 'armored', weight: 3 }, { kind: 'ranged', weight: 3 }, { kind: 'support', weight: 3 }], palette: { ground: '#161c22', groundAlt: '#1c242c', debris: '#2c3844', accent: '#3a5a70', fog: '#0a0d10' } },
  { id: 11, name: 'Кислотные болота', description: 'Ядовитые топи, где ИИ выращивает рои дронов.', boss: 'mire', resourceMult: { blueprints: 1.4 }, enemies: [{ kind: 'light', weight: 5 }, { kind: 'kamikaze', weight: 4 }, { kind: 'support', weight: 3 }, { kind: 'shielded', weight: 2 }], palette: { ground: '#151a12', groundAlt: '#1b2316', debris: '#2a3622', accent: '#4a6a1c', fog: '#090b07' } },
  { id: 12, name: 'Станция связи', description: 'Антенны дальней связи. Отсюда ИИ координирует армию.', boss: 'relay', resourceMult: { blueprints: 1.6 }, enemies: [{ kind: 'ranged', weight: 5 }, { kind: 'support', weight: 4 }, { kind: 'shielded', weight: 3 }, { kind: 'heavy', weight: 2 }], palette: { ground: '#17161d', groundAlt: '#1e1c27', debris: '#2e2b3b', accent: '#46385a', fog: '#0a090d' } },
  { id: 13, name: 'Кладбище роботов', description: 'Свалка павших машин. Некоторые из них ещё не до конца выключены.', boss: 'scrapking', resourceMult: { scrap: 2, techParts: 1.3 }, enemies: [{ kind: 'heavy', weight: 4 }, { kind: 'armored', weight: 4 }, { kind: 'light', weight: 3 }, { kind: 'kamikaze', weight: 3 }], palette: { ground: '#1a1918', groundAlt: '#22201e', debris: '#353230', accent: '#5a5040', fog: '#0c0b0b' } },
  { id: 14, name: 'Подземный город', description: 'Тоннели метро и бункеры старого мира, захваченные машинами.', boss: 'deep', resourceMult: { energyCores: 1.6 }, enemies: [{ kind: 'armored', weight: 5 }, { kind: 'shielded', weight: 4 }, { kind: 'support', weight: 3 }, { kind: 'kamikaze', weight: 2 }], palette: { ground: '#141517', groundAlt: '#1a1c1f', debris: '#2a2d32', accent: '#3a3f48', fog: '#08090a' } },
  { id: 15, name: 'Вулканический завод', description: 'Литейные цеха у жерла вулкана. Жара и тяжёлая броня.', boss: 'magma', resourceMult: { coins: 1.4, techParts: 1.4 }, enemies: [{ kind: 'heavy', weight: 5 }, { kind: 'armored', weight: 4 }, { kind: 'ranged', weight: 3 }, { kind: 'support', weight: 2 }], palette: { ground: '#1d1412', groundAlt: '#271916', debris: '#3c2420', accent: '#6a2a14', fog: '#0e0807' } },
  { id: 16, name: 'Мёртвый космодром', description: 'Стартовые площадки, с которых ИИ хотел уйти в космос.', boss: 'launch', resourceMult: { crystals: 1.5 }, enemies: [{ kind: 'shielded', weight: 4 }, { kind: 'ranged', weight: 4 }, { kind: 'armored', weight: 3 }, { kind: 'kamikaze', weight: 3 }], palette: { ground: '#17191c', groundAlt: '#1e2125', debris: '#2f333a', accent: '#4a5260', fog: '#0a0b0c' } },
  { id: 17, name: 'Купол наблюдения', description: 'Гигантский купол-сенсор. Здесь вас видят ещё до выстрела.', boss: 'watcher', resourceMult: { blueprints: 1.8 }, enemies: [{ kind: 'ranged', weight: 5 }, { kind: 'shielded', weight: 4 }, { kind: 'support', weight: 4 }, { kind: 'armored', weight: 2 }], palette: { ground: '#14161d', groundAlt: '#1a1d27', debris: '#29304a', accent: '#2e4a70', fog: '#08090d' } },
  { id: 18, name: 'Сектор чёрного неба', description: 'Зона, где ИИ перекрыл солнце. Самые элитные отряды.', boss: 'eclipse', resourceMult: { energyCores: 1.8, crystals: 1.5 }, enemies: [{ kind: 'armored', weight: 4 }, { kind: 'shielded', weight: 4 }, { kind: 'heavy', weight: 4 }, { kind: 'support', weight: 3 }, { kind: 'kamikaze', weight: 3 }], palette: { ground: '#111114', groundAlt: '#16161b', debris: '#24242c', accent: '#3a2a5a', fog: '#060608' } },
  { id: 19, name: 'Цитадель ИИ', description: 'Крепость вокруг главного сервера. Каждый метр простреливается.', boss: 'citadel', resourceMult: { coins: 1.6, crystals: 1.8 }, enemies: [{ kind: 'armored', weight: 5 }, { kind: 'shielded', weight: 5 }, { kind: 'ranged', weight: 4 }, { kind: 'heavy', weight: 4 }, { kind: 'support', weight: 3 }], palette: { ground: '#18131a', groundAlt: '#201923', debris: '#352838', accent: '#5a1c4a', fog: '#0b080c' } },
  { id: 20, name: 'Последний сигнал', description: 'Источник сигнала, которым ИИ управляет машинами. Финал войны.', boss: 'signal', resourceMult: { coins: 2, crystals: 2.5, energyCores: 2 }, enemies: [{ kind: 'armored', weight: 5 }, { kind: 'shielded', weight: 5 }, { kind: 'heavy', weight: 5 }, { kind: 'ranged', weight: 4 }, { kind: 'support', weight: 4 }, { kind: 'kamikaze', weight: 3 }], palette: { ground: '#121214', groundAlt: '#18181b', debris: '#28282e', accent: '#5a5a6a', fog: '#070708' } },
];

/** Уровень бункера, с которого можно войти в зону Т: Т1 — 1, Т20 — 100. */
export function zoneLevel(tier: number): number {
  return Math.round(1 + ((tier - 1) * 99) / 19);
}

/** Синие с роботов чуть чаще в дальних зонах, но не больше 4%. */
function robotRarity(tier: number): Record<Rarity, number> {
  const blue = Math.min(0.04, 0.005 + 0.005 * (tier - 1));
  const green = Math.min(0.3, 0.145 + 0.015 * (tier - 1));
  return R(1 - blue - green, green, blue, 0, 0);
}

export const locationsConfig: LocationDef[] = [
  ...baseLocations,
  ...EXTRA_ZONES.map((z) => ({ ...z, tier: z.id, groupsForBoss: 16 + Math.floor((z.id - 7) / 2), minibossEvery: Math.max(4, 6 - Math.floor((z.id - 7) / 5)), levelCap: 0, recommendedLevel: 0, rarity: robotRarity(z.id) })),
].map((l) => ({ ...l, recommendedLevel: zoneLevel(l.tier), levelCap: zoneLevel(l.tier) + 8 }));

export function getLocation(id: number): LocationDef {
  return locationsConfig.find((l) => l.id === id) ?? locationsConfig[0];
}
