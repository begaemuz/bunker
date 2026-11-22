// Инженер — персонаж, который управляет бункером. Свои характеристики,
// своё снаряжение (создаётся в мастерской из оборудования бункера).
// Пока это всё нужно для будущей арены и на бой бункера не влияет.
import type { Rarity } from '../types';

/** Характеристики, в которые вкладываются очки за уровни. */
export const ENG_STATS = ['str', 'end', 'agi', 'int'] as const;
export type EngStat = (typeof ENG_STATS)[number];

/** Виды снаряжения: каждый создаётся по своему свитку и рецепту. */
export const GEAR_KINDS = ['weapon', 'helmet', 'armor', 'pants', 'boots', 'amulet', 'ring'] as const;
export type GearKind = (typeof GEAR_KINDS)[number];

/** Слоты снаряжения: колец два. */
export const GEAR_SLOTS = ['weapon', 'helmet', 'armor', 'pants', 'boots', 'amulet', 'ring1', 'ring2'] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

/** Свойства снаряжения. */
export type GearStatKey = 'damage' | 'hp' | 'armor' | 'crit' | 'dodge' | EngStat;

export interface GearStat {
  key: GearStatKey;
  value: number;
}

export interface Gear {
  id: string;
  kind: GearKind;
  name: string;
  rarity: Rarity;
  /** Технологический уровень: от вещей, из которых создано. */
  tier: number;
  /** Качество 0..1: выпало в диапазоне качества вложенных вещей. */
  quality: number;
  stats: GearStat[];
  createdAt: number;
}

export interface EngineerState {
  /** Сколько очков вложено в каждую характеристику (без базовых). */
  points: Record<EngStat, number>;
  gear: Record<string, Gear>;
  equip: Record<GearSlot, string | null>;
}

export function emptyEngineer(): EngineerState {
  return {
    points: { str: 0, end: 0, agi: 0, int: 0 },
    gear: {},
    equip: { weapon: null, helmet: null, armor: null, pants: null, boots: null, amulet: null, ring1: null, ring2: null },
  };
}
