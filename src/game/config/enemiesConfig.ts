import type { AttackType, CoilMode } from '../types';

export type RobotKind = 'light' | 'heavy' | 'ranged' | 'support' | 'kamikaze' | 'armored' | 'shielded' | 'miniboss';
/** Тип противника: обычный робот или босс (`boss:<id>`). */
export type EnemyKind = RobotKind | `boss:${string}`;

export interface DropTable {
  coins: [number, number];
  scrap: { chance: number; amount: [number, number] };
  techParts: { chance: number; amount: [number, number] };
  blueprints: { chance: number; amount: [number, number] };
  energyCores: { chance: number; amount: [number, number] };
  bossPasses: number;
  /** Шанс выпадения оборудования. */
  item: number;
}

export type EnemyAbility =
  | { type: 'heal'; radius: number; percent: number; interval: number }
  | { type: 'armorAura'; radius: number; armor: number }
  | { type: 'explode' }
  | { type: 'shield'; percent: number; regenDelay: number; regenRate: number }
  | { type: 'summon'; kind: RobotKind; count: number; interval: number }
  | { type: 'blast'; damage: number; interval: number; attack: AttackType }
  | { type: 'suppress'; interval: number; duration: number; rateFactor: number }
  | { type: 'selfRepair'; percentPerSec: number; belowHp: number }
  | { type: 'jamCoil'; interval: number; duration: number }
  | { type: 'heatWave'; interval: number; heat: number }
  | { type: 'armorUp'; interval: number; duration: number; armor: number };

export interface EnemyDef {
  name: string;
  hp: number;
  armor: number;
  speed: number;
  damage: number;
  attackInterval: number;
  /** Дальность атаки от края бункера. 0 — ближний бой. */
  range: number;
  attack: AttackType;
  /** Сопротивления режимам воздействия (0..0.75). */
  resist: Partial<Record<CoilMode, number>>;
  /** Электроника уязвима к ЭМИ и радиоподавлению. */
  electronic: boolean;
  /** Тяжёлое механическое шасси уязвимо к вибрации. */
  heavyFrame: boolean;
  size: number;
  xp: number;
  drops: DropTable;
  abilities: EnemyAbility[];
}

export const drops = (p: Partial<DropTable>): DropTable => ({
  coins: [0, 0],
  scrap: { chance: 0, amount: [0, 0] },
  techParts: { chance: 0, amount: [0, 0] },
  blueprints: { chance: 0, amount: [0, 0] },
  energyCores: { chance: 0, amount: [0, 0] },
  bossPasses: 0,
  item: 0,
  ...p,
});

export const robotsConfig: Record<RobotKind, EnemyDef> = {
  light: {
    name: 'Лёгкий робот',
    hp: 30,
    armor: 0,
    speed: 52,
    damage: 5,
    attackInterval: 1,
    range: 0,
    attack: 'kinetic',
    resist: {},
    electronic: true,
    heavyFrame: false,
    size: 9,
    xp: 2,
    drops: drops({ coins: [2, 4], scrap: { chance: 0.2, amount: [1, 2] }, item: 0.012 }),
    abilities: [],
  },
  heavy: {
    name: 'Тяжёлый робот',
    hp: 130,
    armor: 20,
    speed: 22,
    damage: 10,
    attackInterval: 1.5,
    range: 0,
    attack: 'kinetic',
    resist: { emp: 0.2 },
    electronic: false,
    heavyFrame: true,
    size: 16,
    xp: 8,
    drops: drops({
      coins: [8, 12],
      scrap: { chance: 0.6, amount: [2, 4] },
      techParts: { chance: 0.2, amount: [1, 1] },
      item: 0.04,
    }),
    abilities: [],
  },
  ranged: {
    name: 'Дальнобойный робот',
    hp: 65,
    armor: 5,
    speed: 35,
    damage: 10,
    attackInterval: 1.6,
    range: 110,
    attack: 'energy',
    resist: { thermal: 0.2 },
    electronic: true,
    heavyFrame: false,
    size: 10,
    xp: 4,
    drops: drops({
      coins: [4, 7],
      scrap: { chance: 0.25, amount: [1, 2] },
      techParts: { chance: 0.08, amount: [1, 1] },
      item: 0.025,
    }),
    abilities: [],
  },
  support: {
    name: 'Робот поддержки',
    hp: 90,
    armor: 10,
    speed: 30,
    damage: 4,
    attackInterval: 2,
    range: 0,
    attack: 'energy',
    resist: { emp: 0.15 },
    electronic: true,
    heavyFrame: false,
    size: 11,
    xp: 6,
    drops: drops({
      coins: [6, 9],
      scrap: { chance: 0.3, amount: [1, 3] },
      techParts: { chance: 0.15, amount: [1, 1] },
      blueprints: { chance: 0.02, amount: [1, 1] },
      item: 0.035,
    }),
    abilities: [
      { type: 'heal', radius: 85, percent: 0.06, interval: 1.5 },
      { type: 'armorAura', radius: 85, armor: 15 },
    ],
  },
  kamikaze: {
    name: 'Робот-камикадзе',
    hp: 28,
    armor: 0,
    speed: 82,
    damage: 40,
    attackInterval: 0,
    range: 0,
    attack: 'explosive',
    resist: {},
    electronic: true,
    heavyFrame: false,
    size: 8,
    xp: 3,
    drops: drops({ coins: [3, 5], item: 0.008 }),
    abilities: [{ type: 'explode' }],
  },
  armored: {
    name: 'Бронированный робот',
    hp: 240,
    armor: 70,
    speed: 18,
    damage: 18,
    attackInterval: 1.8,
    range: 0,
    attack: 'kinetic',
    resist: { emp: 0.35, highVoltage: 0.2, vibration: 0.1 },
    electronic: false,
    heavyFrame: true,
    size: 17,
    xp: 12,
    drops: drops({
      coins: [12, 18],
      scrap: { chance: 0.8, amount: [3, 6] },
      techParts: { chance: 0.3, amount: [1, 2] },
      blueprints: { chance: 0.03, amount: [1, 1] },
      item: 0.05,
    }),
    abilities: [],
  },
  shielded: {
    name: 'Щитоносец',
    hp: 80,
    armor: 10,
    speed: 30,
    damage: 10,
    attackInterval: 1.4,
    range: 0,
    attack: 'energy',
    resist: { thermal: 0.2, radio: 0.2 },
    electronic: true,
    heavyFrame: false,
    size: 12,
    xp: 9,
    drops: drops({
      coins: [9, 14],
      scrap: { chance: 0.3, amount: [1, 3] },
      techParts: { chance: 0.25, amount: [1, 2] },
      energyCores: { chance: 0.02, amount: [1, 1] },
      item: 0.045,
    }),
    abilities: [{ type: 'shield', percent: 1.5, regenDelay: 2, regenRate: 0.25 }],
  },
  miniboss: {
    name: 'Таран',
    hp: 450,
    armor: 20,
    speed: 18,
    damage: 16,
    attackInterval: 1.6,
    range: 0,
    attack: 'kinetic',
    resist: { emp: 0.15 },
    electronic: false,
    heavyFrame: true,
    size: 24,
    xp: 60,
    drops: drops({
      coins: [60, 90],
      scrap: { chance: 1, amount: [6, 10] },
      techParts: { chance: 1, amount: [2, 4] },
      blueprints: { chance: 0.25, amount: [1, 1] },
      energyCores: { chance: 0.25, amount: [1, 1] },
      bossPasses: 0.04,
      item: 1,
    }),
    abilities: [
      { type: 'shield', percent: 0.3, regenDelay: 4, regenRate: 0.06 },
      { type: 'summon', kind: 'light', count: 2, interval: 9 },
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
  bossPassChance: 0.01,
  shield: { type: 'shield', percent: 0.35, regenDelay: 3, regenRate: 0.1 } as EnemyAbility,
};
