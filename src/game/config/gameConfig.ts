import type { CoilMode, EffectKind } from '../types';

/** Технические параметры движка и базовые характеристики корпуса бункера. */
export const gameConfig = {
  /** Какая доля прироста мощности катушек ложится на энергию и нагрев импульса. */
  powerLoad: 0.6,
  /** Шаг симуляции (сек). Скорость игры не зависит от FPS. */
  fixedStep: 1 / 60,
  maxStepsPerFrame: 12,
  speeds: [1, 2, 3] as const,
  /** Рассеивание импульса по площади: −6% за каждую цель сверх первой, не ниже 60%. */
  areaSpreadPerTarget: 0.06,
  areaSpreadMin: 0.6,
  /** Фокус точечного разряда: +15% за разряд подряд по той же цели, до 4 раз. */
  focusPerStack: 0.15,
  focusMaxStacks: 4,

  /** Видимая область по ширине в игровых единицах. */
  viewWidth: 440,
  bunkerBodyRadius: 30,
  spawnMargin: 40,
  pulseVisualTime: 0.35,

  /**
   * Корпус бункера без оборудования. Всё остальное (энергия, импульсы,
   * охлаждение, защита) дают установленные модули и технологии.
   */
  bunkerBase: {
    hullHp: 1000,
    regen: 1.5,
    /** КПД передачи энергии без преобразователя. */
    conversion: 0.72,
    /** Встроенный буфер энергии без конденсатора. */
    capacity: 15,
    chargeRate: 8,
    /** Пассивный отвод тепла корпусом. */
    coolRate: 1.5,
    heatCap: 60,
    critMultiplier: 1.6,
    /** Время идентификации цели сенсорами, сек. */
    identifyTime: 2.5,
  },
  /** Перегрев: катушки блокируются, пока нагрев не опустится до этой доли. */
  overheatRecover: 0.45,
  /** Форсаж из системы охлаждения работает, пока нагрев ниже этой доли. */
  overdriveBelow: 0.5,
  maxResist: 0.75,
  maxDamageReduction: 0.6,
  maxCoilRadius: 280,
  minCoilInterval: 0.12,
  maxConversion: 0.98,

  maxParticles: 260,
  maxDamageNumbers: 60,
  autosaveInterval: 15,
} as const;

export interface ModeDef {
  name: string;
  short: string;
  description: string;
  /** Бьёт всех в радиусе (true) или одну цель (false). */
  area: boolean;
  /** Насколько броня снижает урон (0 — игнорирует броню). */
  armorWeight: number;
  /** Множитель урона по корпусу. */
  hullMult: number;
  /** Множитель урона по энергощиту. */
  shieldMult: number;
  /** Бонус по электронным роботам. */
  electronicMult: number;
  /** Бонус по тяжёлым механическим шасси. */
  heavyFrameMult: number;
  /** Встроенный эффект режима. */
  effect: { kind: EffectKind; chance: number; electronicOnly?: boolean } | null;
  color: string;
}

export const modeConfig: Record<CoilMode, ModeDef> = {
  emp: {
    name: 'Электромагнитный импульс',
    short: 'ЭМИ',
    description: 'Бьёт по площади, нарушает электронику и может временно отключить управление роботом.',
    area: true,
    armorWeight: 0.5,
    hullMult: 1,
    shieldMult: 1,
    electronicMult: 1.3,
    heavyFrameMult: 0.8,
    effect: { kind: 'stun', chance: 0.12, electronicOnly: true },
    color: '#3fc8ff',
  },
  highVoltage: {
    name: 'Высоковольтный разряд',
    short: 'ВВР',
    description: 'Точечный разряд в одну цель: бьёт в разы сильнее импульсов по площади, пробивает броню и щиты. Пока цель жива, каждый следующий разряд по ней сильнее (фокус до +60%).',
    area: false,
    armorWeight: 0.3,
    hullMult: 1,
    shieldMult: 1,
    electronicMult: 1,
    heavyFrameMult: 1.3,
    effect: { kind: 'chain', chance: 0.15 },
    color: '#e6f3ff',
  },
  radio: {
    name: 'Радиочастотное воздействие',
    short: 'РЧВ',
    description: 'Слабый урон, но глушит связь: роботы бьют слабее, поддержка перестаёт работать.',
    area: true,
    armorWeight: 0,
    hullMult: 0.7,
    shieldMult: 0.7,
    electronicMult: 1.2,
    heavyFrameMult: 0.8,
    effect: { kind: 'jam', chance: 0.6 },
    color: '#5fe08a',
  },
  overload: {
    name: 'Импульс перегрузки',
    short: 'ПРГ',
    description: 'Перегружает защитные системы: разрушает энергощиты и останавливает их восстановление.',
    area: true,
    armorWeight: 0.5,
    hullMult: 0.6,
    shieldMult: 3,
    electronicMult: 1,
    heavyFrameMult: 1,
    effect: { kind: 'shieldBreak', chance: 0.4 },
    color: '#b46bff',
  },
  thermal: {
    name: 'Тепловое воздействие',
    short: 'ТЕП',
    description: 'Прожигает броню и механические узлы, оставляет периодический урон.',
    area: true,
    armorWeight: 0,
    hullMult: 0.7,
    shieldMult: 0.5,
    electronicMult: 1,
    heavyFrameMult: 1,
    effect: { kind: 'burn', chance: 0.7 },
    color: '#ff8a3d',
  },
  vibration: {
    name: 'Низкочастотная вибрация',
    short: 'ВИБ',
    description: 'Нарушает движение механических систем: замедляет и сильнее бьёт тяжёлые шасси.',
    area: true,
    armorWeight: 1,
    hullMult: 0.9,
    shieldMult: 0.6,
    electronicMult: 0.8,
    heavyFrameMult: 1.5,
    effect: { kind: 'slow', chance: 0.5 },
    color: '#e0b23a',
  },
};

export interface EffectDef {
  duration: number;
  power: number;
}
export const effectConfig: Record<EffectKind, EffectDef> = {
  /** Отключение управления. */
  stun: { duration: 0.9, power: 1 },
  /** Замедление: доля снижения скорости. */
  slow: { duration: 2, power: 0.45 },
  /** Перегрев узлов: доля мощности импульса в секунду, игнорирует броню. */
  burn: { duration: 3, power: 0.3 },
  /** Подавление связи: снижение урона робота, отключение способностей. */
  jam: { duration: 3, power: 0.4 },
  /** Перегрузка щита: щит не восстанавливается. */
  shieldBreak: { duration: 4, power: 1 },
  /** Цепной разряд: доля мощности на соседние цели. */
  chain: { duration: 0, power: 0.5 },
  /** Ослабление брони. */
  armorBreak: { duration: 4, power: 0.5 },
};
export const chainConfig = { jumps: 3, jumpRange: 90 };
