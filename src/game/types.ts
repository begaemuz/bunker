// Общие типы игровой логики. Не зависят от React и DOM.

export const DAMAGE_TYPES = [
  'electric',
  'fire',
  'kinetic',
  'energy',
  'cold',
  'radiation',
  'dot',
  'explosive',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const EFFECT_KINDS = [
  'slow',
  'freeze',
  'stun',
  'burn',
  'shock',
  'corrosion',
  'armorBreak',
  'chain',
  'extraPulse',
  'splash',
] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export const EQUIP_CATEGORIES = ['generator', 'coil', 'capacitor', 'reactor'] as const;
export type EquipCategory = (typeof EQUIP_CATEGORIES)[number];

export const RESOURCE_KEYS = [
  'coins',
  'techParts',
  'energyCores',
  'crystals',
  'scrap',
  'stabilizers',
] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];
export type Resources = Record<ResourceKey, number>;

/**
 * Ключ модификатора характеристики.
 * Простые ключи + составные `resist:<тип>`, `extra:<тип>`, `chance:<эффект>`.
 */
export type SimpleStatKey =
  | 'hpFlat'
  | 'hpPct'
  | 'regenFlat'
  | 'radiusFlat'
  | 'radiusPct'
  | 'damageFlat'
  | 'damagePct'
  | 'ratePct'
  | 'energyGen'
  | 'energyUsePct'
  | 'batteryCap'
  | 'effectSlots'
  | 'critChance'
  | 'critDamage'
  | 'effectPower'
  | 'dropChancePct'
  | 'coinPct';
export type StatKey =
  | SimpleStatKey
  | `resist:${DamageType}`
  | `extra:${DamageType}`
  | `chance:${EffectKind}`;

export interface StatMod {
  stat: StatKey;
  value: number;
}

export interface ItemSlot {
  locked: boolean;
  /** ID установленной детали (детали появятся на этапе 3). */
  partId: string | null;
}

export type ItemSource =
  | { kind: 'start' }
  | { kind: 'drop'; map: number; wave: number; enemy: string }
  | { kind: 'boss'; map: number; boss: string };

export interface Item {
  id: string;
  templateId: string;
  name: string;
  category: EquipCategory;
  rarity: Rarity;
  level: number;
  maxLevel: number;
  /** Базовые характеристики (растут с уровнем). */
  baseStats: StatMod[];
  /** Дополнительные случайные свойства. */
  extraStats: StatMod[];
  slots: ItemSlot[];
  /** Энергопотребление модуля, ед/сек. */
  energyCost: number;
  obtainedAt: number;
  source: ItemSource;
}

export type EquipmentLayout = Record<EquipCategory, (string | null)[]>;

export interface Vec2 {
  x: number;
  y: number;
}
