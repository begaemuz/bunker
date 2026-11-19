import type { DamageType } from '../types';

export type EnemyKind = 'light' | 'heavy' | 'ranged' | 'support' | 'kamikaze' | 'miniboss' | 'boss';

export interface DropTable {
  coins: [number, number];
  scrap: { chance: number; amount: [number, number] };
  techParts: { chance: number; amount: [number, number] };
  energyCores: { chance: number; amount: [number, number] };
  /** Шанс выпадения предмета. */
  item: number;
}

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  armor: number;
  speed: number;
  damage: number;
  attackInterval: number;
  /** Дальность атаки от края бункера. 0 — ближний бой. */
  range: number;
  damageType: DamageType;
  resist: Partial<Record<DamageType, number>>;
  size: number;
  xp: number;
  drops: DropTable;
  /** Способности: поддержка, самоподрыв и т.п. */
  abilities: EnemyAbility[];
}

export type EnemyAbility =
  | { type: 'heal'; radius: number; percent: number; interval: number }
  | { type: 'armorAura'; radius: number; armor: number }
  | { type: 'explode'; radius: number }
  | { type: 'shield'; percent: number; regenDelay: number; regenRate: number }
  | { type: 'summon'; kind: EnemyKind; count: number; interval: number }
  | { type: 'blast'; damage: number; interval: number; damageType: DamageType }
  | { type: 'suppress'; interval: number; duration: number; rateFactor: number }
  | { type: 'selfRepair'; percentPerSec: number; belowHp: number };

const noDrops: DropTable = {
  coins: [0, 0],
  scrap: { chance: 0, amount: [0, 0] },
  techParts: { chance: 0, amount: [0, 0] },
  energyCores: { chance: 0, amount: [0, 0] },
  item: 0,
};

export const enemiesConfig: Record<EnemyKind, EnemyDef> = {
  light: {
    kind: 'light',
    name: 'Лёгкий робот',
    hp: 30,
    armor: 0,
    speed: 52,
    damage: 6,
    attackInterval: 1,
    range: 0,
    damageType: 'kinetic',
    resist: {},
    size: 9,
    xp: 2,
    drops: {
      ...noDrops,
      coins: [2, 4],
      scrap: { chance: 0.15, amount: [1, 2] },
      item: 0.02,
    },
    abilities: [],
  },
  heavy: {
    kind: 'heavy',
    name: 'Тяжёлый робот',
    hp: 160,
    armor: 25,
    speed: 22,
    damage: 14,
    attackInterval: 1.5,
    range: 0,
    damageType: 'kinetic',
    resist: { kinetic: 0.3, fire: 0.2 },
    size: 16,
    xp: 8,
    drops: {
      ...noDrops,
      coins: [8, 12],
      scrap: { chance: 0.5, amount: [2, 4] },
      techParts: { chance: 0.2, amount: [1, 1] },
      item: 0.07,
    },
    abilities: [],
  },
  ranged: {
    kind: 'ranged',
    name: 'Дальнобойный робот',
    hp: 70,
    armor: 5,
    speed: 35,
    damage: 10,
    attackInterval: 1.6,
    range: 115,
    damageType: 'energy',
    resist: { energy: 0.2 },
    size: 10,
    xp: 4,
    drops: {
      ...noDrops,
      coins: [4, 7],
      scrap: { chance: 0.25, amount: [1, 2] },
      techParts: { chance: 0.06, amount: [1, 1] },
      item: 0.04,
    },
    abilities: [],
  },
  support: {
    kind: 'support',
    name: 'Робот поддержки',
    hp: 90,
    armor: 10,
    speed: 30,
    damage: 4,
    attackInterval: 2,
    range: 0,
    damageType: 'electric',
    resist: { electric: 0.15 },
    size: 11,
    xp: 6,
    drops: {
      ...noDrops,
      coins: [6, 9],
      scrap: { chance: 0.3, amount: [1, 3] },
      techParts: { chance: 0.12, amount: [1, 1] },
      item: 0.05,
    },
    abilities: [
      { type: 'heal', radius: 85, percent: 0.06, interval: 1.5 },
      { type: 'armorAura', radius: 85, armor: 15 },
    ],
  },
  kamikaze: {
    kind: 'kamikaze',
    name: 'Робот-камикадзе',
    hp: 30,
    armor: 0,
    speed: 82,
    damage: 40,
    attackInterval: 0,
    range: 0,
    damageType: 'explosive',
    resist: {},
    size: 8,
    xp: 3,
    drops: { ...noDrops, coins: [3, 5], item: 0.01 },
    abilities: [{ type: 'explode', radius: 0 }],
  },
  miniboss: {
    kind: 'miniboss',
    name: 'Мини-босс «Таран»',
    hp: 600,
    armor: 25,
    speed: 18,
    damage: 22,
    attackInterval: 1.6,
    range: 0,
    damageType: 'kinetic',
    resist: { kinetic: 0.3, electric: 0.1 },
    size: 24,
    xp: 60,
    drops: {
      coins: [60, 90],
      scrap: { chance: 1, amount: [6, 10] },
      techParts: { chance: 1, amount: [2, 4] },
      energyCores: { chance: 0.25, amount: [1, 1] },
      item: 1,
    },
    abilities: [
      { type: 'shield', percent: 0.3, regenDelay: 4, regenRate: 0.06 },
      { type: 'summon', kind: 'light', count: 2, interval: 9 },
    ],
  },
  boss: {
    kind: 'boss',
    name: 'Колосс-01',
    hp: 4200,
    armor: 30,
    speed: 12,
    damage: 30,
    attackInterval: 1.5,
    range: 0,
    damageType: 'kinetic',
    resist: { kinetic: 0.2, electric: 0.15 },
    size: 38,
    xp: 400,
    drops: {
      coins: [400, 600],
      scrap: { chance: 1, amount: [25, 40] },
      techParts: { chance: 1, amount: [10, 16] },
      energyCores: { chance: 1, amount: [2, 4] },
      item: 1,
    },
    abilities: [
      { type: 'blast', damage: 45, interval: 3.5, damageType: 'energy' },
      { type: 'summon', kind: 'light', count: 4, interval: 11 },
      { type: 'shield', percent: 0.18, regenDelay: 6, regenRate: 0.03 },
      { type: 'suppress', interval: 22, duration: 4, rateFactor: 0.6 },
      { type: 'selfRepair', percentPerSec: 0.006, belowHp: 0.5 },
    ],
  },
};

/** Модификатор элитного робота. */
export const eliteConfig = {
  hpMult: 2.6,
  armorAdd: 20,
  damageMult: 1.5,
  speedMult: 1.05,
  xpMult: 3,
  dropMult: 4,
  coinMult: 3,
  /** Элиты получают регенерирующий щит. */
  shield: { type: 'shield', percent: 0.35, regenDelay: 3, regenRate: 0.1 } as EnemyAbility,
};
