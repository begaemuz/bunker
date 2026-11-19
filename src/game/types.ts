// Общие типы игровой логики. Не зависят от React и DOM.

/** Режимы воздействия катушек (вместо «стихий»). */
export const COIL_MODES = ['emp', 'highVoltage', 'radio', 'overload', 'thermal', 'vibration'] as const;
export type CoilMode = (typeof COIL_MODES)[number];

/** Типы атак роботов по бункеру. */
export const ATTACK_TYPES = ['kinetic', 'explosive', 'energy'] as const;
export type AttackType = (typeof ATTACK_TYPES)[number];

/** Состояния, которые катушки накладывают на роботов. */
export const EFFECT_KINDS = ['stun', 'slow', 'burn', 'jam', 'shieldBreak', 'chain', 'armorBreak'] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'unique'] as const;
export type Rarity = (typeof RARITIES)[number];

/** Типы оборудования. */
export const EQUIP_CATEGORIES = ['generator', 'coil', 'capacitor', 'converter', 'cooling', 'sensor', 'shield'] as const;
export type EquipCategory = (typeof EQUIP_CATEGORIES)[number];

/** Восемь физических слотов бункера. */
export const SLOT_IDS = ['generator', 'coil1', 'coil2', 'capacitor', 'converter', 'cooling', 'sensor', 'shield'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

export const SLOT_CATEGORY: Record<SlotId, EquipCategory> = {
  generator: 'generator',
  coil1: 'coil',
  coil2: 'coil',
  capacitor: 'capacitor',
  converter: 'converter',
  cooling: 'cooling',
  sensor: 'sensor',
  shield: 'shield',
};

export const RESOURCE_KEYS = [
  'coins',
  'scrap',
  'techParts',
  'blueprints',
  'energyCores',
  'crystals',
  'stabilizers',
  'bossPasses',
  'expansionKeys',
] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];
export type Resources = Record<ResourceKey, number>;

/** Ключи модификаторов оборудования и технологий. */
export type SimpleStatKey =
  // энергия
  | 'genPower'
  | 'genPowerPct'
  | 'conversion'
  | 'capacity'
  | 'capacityPct'
  | 'chargeRate'
  | 'dischargeBonus'
  | 'drainPct'
  // катушки
  | 'coilPowerPct'
  | 'coilRadiusPct'
  | 'coilRatePct'
  | 'pulseCostPct'
  // охлаждение
  | 'coolRate'
  | 'coolRatePct'
  | 'heatCap'
  | 'heatPct'
  | 'overdrive'
  // сенсоры
  | 'detectRange'
  | 'identifySpeed'
  | 'identifiedBonus'
  | 'critChance'
  | 'critDamage'
  // защита
  | 'hullHp'
  | 'hullPct'
  | 'damageReduction'
  | 'regen'
  | 'emergencyRepair'
  // прочее
  | 'moduleBonus'
  | 'coinPct'
  | 'dropChancePct'
  | 'xpPct';

export type StatKey =
  | SimpleStatKey
  | `resist:${AttackType}`
  | `mode:${CoilMode}`
  | `chance:${EffectKind}`;

export interface StatMod {
  stat: StatKey;
  value: number;
}

/** Параметры катушки (есть только у оборудования типа «катушка»). */
export interface CoilProps {
  mode: CoilMode;
  /** Мощность одного импульса (урон). */
  power: number;
  radius: number;
  /** Интервал между импульсами, сек. */
  interval: number;
  /** Энергия на один импульс. */
  energyPerPulse: number;
  /** Нагрев за импульс. */
  heatPerPulse: number;
}

/** Особые свойства уникальных предметов. */
export type UniqueEffect =
  | { kind: 'firstPulse'; value: number }
  | { kind: 'dualCoil'; value: number }
  | { kind: 'shieldStrip'; value: number }
  | { kind: 'electronics'; value: number }
  | { kind: 'killEnergy'; value: number }
  | { kind: 'coolOnKill'; value: number }
  | { kind: 'reflect'; value: number }
  | { kind: 'markTargets'; value: number };

export interface ItemSlot {
  locked: boolean;
  /** ID установленной модификации. */
  partId: string | null;
}

export type ItemSource =
  | { kind: 'start' }
  | { kind: 'drop'; location: number; enemy: string }
  | { kind: 'boss'; location: number; boss: string };

export interface Item {
  id: string;
  templateId: string;
  name: string;
  category: EquipCategory;
  rarity: Rarity;
  /** Технологический уровень (от локации, где найден). */
  tier: number;
  level: number;
  maxLevel: number;
  baseStats: StatMod[];
  extraStats: StatMod[];
  coil?: CoilProps;
  unique?: UniqueEffect;
  slots: ItemSlot[];
  /** Постоянное потребление энергии модулем, ед/сек (у катушек — 0, они платят за импульс). */
  energyCost: number;
  description: string;
  obtainedAt: number;
  source: ItemSource;
}

export type EquipmentLayout = Record<SlotId, string | null>;

/** Модификация (деталь), устанавливаемая в слот оборудования. */
export interface Part {
  id: string;
  templateId: string;
  name: string;
  rarity: Rarity;
  stats: StatMod[];
  /** ID оборудования, в которое деталь установлена навсегда. */
  installedIn: string | null;
  obtainedAt: number;
}
