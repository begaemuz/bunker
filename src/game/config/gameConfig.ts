import type { DamageType, EffectKind } from '../types';

/** Технические параметры движка и базовые характеристики бункера. */
export const gameConfig = {
  /** Шаг симуляции (сек). Скорость игры не зависит от FPS. */
  fixedStep: 1 / 60,
  /** Максимум шагов симуляции за один кадр (защита от «спирали смерти»). */
  maxStepsPerFrame: 12,
  speeds: [1, 2, 3] as const,

  /** Размер игрового поля в игровых единицах (видимая область по ширине). */
  viewWidth: 440,
  /** Радиус корпуса бункера. */
  bunkerBodyRadius: 30,
  /** На сколько единиц за пределами экрана появляются роботы. */
  spawnMargin: 40,

  /** Пауза между волнами, сек. */
  waveBreak: 3,
  /** Ремонт бункера после каждой пройденной волны (доля от макс. HP). */
  waveRepairPct: 0.15,
  /** Время жизни визуального кольца импульса, сек. */
  pulseVisualTime: 0.35,

  bunkerBase: {
    maxHp: 1000,
    radius: 150,
    damage: 30,
    pulseRate: 1,
    regen: 0.5,
    energyUse: 10,
    energyGen: 14,
    batteryCap: 40,
    effectSlots: 2,
    critChance: 0,
    critMultiplier: 1.5,
    primaryDamageType: 'electric' as DamageType,
    resist: {} as Partial<Record<DamageType, number>>,
  },
  /** Предельное сопротивление бункера и роботов. */
  maxResist: 0.75,
  /** Ограничения радиуса и частоты, чтобы не ломать игру. */
  maxRadius: 260,
  maxPulseRate: 8,

  /** Предел частиц и чисел урона на экране. */
  maxParticles: 260,
  maxDamageNumbers: 60,
  /** Автосохранение во время боя, сек реального времени. */
  autosaveInterval: 15,
} as const;

/** Параметры дополнительных эффектов (длительность, сила). */
export interface EffectDef {
  duration: number;
  power: number;
}
export const effectConfig: Record<EffectKind, EffectDef> = {
  /** Замедление: power — доля снижения скорости. */
  slow: { duration: 2.5, power: 0.4 },
  /** Полная остановка (заморозка). */
  freeze: { duration: 1.2, power: 1 },
  /** Оглушение: нет движения и атак. */
  stun: { duration: 0.8, power: 1 },
  /** Поджог: power — доля урона импульса в сек (огнём). */
  burn: { duration: 3, power: 0.25 },
  /** Электрическое поражение: power — доля дополнительного получаемого урона. */
  shock: { duration: 3, power: 0.2 },
  /** Коррозия: power — снижение брони (ед.), длительно. */
  corrosion: { duration: 6, power: 15 },
  /** Снижение брони: power — доля снижения брони. */
  armorBreak: { duration: 4, power: 0.5 },
  /** Цепная молния: power — доля урона, число прыжков задано ниже. */
  chain: { duration: 0, power: 0.6 },
  /** Дополнительный импульс: power — доля урона. */
  extraPulse: { duration: 0, power: 0.5 },
  /** Урон по области при уничтожении: power — доля урона импульса. */
  splash: { duration: 0, power: 0.7 },
};
export const chainConfig = { jumps: 3, jumpRange: 90 };
export const splashConfig = { radius: 60 };
