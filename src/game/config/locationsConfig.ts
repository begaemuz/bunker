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
}

const R = (common: number, uncommon: number, rare: number, epic: number, legendary: number): Record<Rarity, number> => ({
  common,
  uncommon,
  rare,
  epic,
  legendary,
  unique: 0,
});

export const locationsConfig: LocationDef[] = [
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
    rarity: R(0.55, 0.27, 0.13, 0.04, 0.01),
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
    rarity: R(0.5, 0.28, 0.15, 0.055, 0.015),
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
    rarity: R(0.46, 0.29, 0.17, 0.06, 0.02),
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
    rarity: R(0.42, 0.3, 0.18, 0.075, 0.025),
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
    rarity: R(0.38, 0.3, 0.2, 0.09, 0.03),
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
    rarity: R(0.34, 0.3, 0.22, 0.1, 0.04),
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
    rarity: R(0.3, 0.3, 0.24, 0.11, 0.05),
    palette: { ground: '#1a1416', groundAlt: '#24191c', debris: '#3a2228', accent: '#5a1c24', fog: '#0d0809' },
  },
];

export function getLocation(id: number): LocationDef {
  return locationsConfig.find((l) => l.id === id) ?? locationsConfig[0];
}
