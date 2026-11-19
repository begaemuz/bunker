import { gameConfig, modeConfig } from '../config/gameConfig';
import type { Enemy } from '../enemies/Enemy';
import type { AttackType, CoilMode } from '../types';

export function effectiveArmor(e: Enemy): number {
  const s = e.status;
  const base = e.armor + e.auraArmor + (s.armorUpT > 0 ? s.armorUpP : 0);
  const broken = s.armorBreakT > 0 ? 1 - s.armorBreakP : 1;
  return Math.max(0, base * broken);
}

export interface HitOptions {
  /** Бонус по опознанным целям (сенсоры). */
  identifiedBonus?: number;
  /** Доп. урон по электронике (уникальное свойство). */
  electronicsBonus?: number;
  /** Доп. снятие щита (доля макс. щита). */
  shieldStrip?: number;
}

export interface HitResult {
  dealt: number;
  killed: boolean;
}

/**
 * Урон катушки по роботу: режим воздействия против сопротивлений,
 * брони, щита и особенностей конструкции.
 */
export function applyCoilHit(e: Enemy, power: number, mode: CoilMode | 'dot', opts: HitOptions = {}): HitResult {
  if (!e.alive || power <= 0) return { dealt: 0, killed: false };
  let dmg = power;
  let shieldMult = 1;
  let hullMult = 1;
  let armorWeight = 0;

  if (mode !== 'dot') {
    const m = modeConfig[mode];
    dmg *= 1 - Math.min(gameConfig.maxResist, e.resist[mode] ?? 0);
    if (e.electronic) dmg *= m.electronicMult * (1 + (opts.electronicsBonus ?? 0));
    if (e.heavyFrame) dmg *= m.heavyFrameMult;
    shieldMult = m.shieldMult;
    hullMult = m.hullMult;
    armorWeight = m.armorWeight;
  }
  if (e.identified && opts.identifiedBonus) dmg *= 1 + opts.identifiedBonus;

  let dealt = 0;
  // Щит поглощает урон с собственным множителем режима.
  if (e.shield > 0) {
    if (opts.shieldStrip) {
      const strip = Math.min(e.shield, e.maxShield * opts.shieldStrip);
      e.shield -= strip;
      dealt += strip;
    }
    const toShield = dmg * shieldMult;
    const absorbed = Math.min(e.shield, toShield);
    e.shield -= absorbed;
    dealt += absorbed;
    // Оставшаяся доля урона проходит в корпус.
    dmg = toShield > 0 ? dmg * (1 - absorbed / toShield) : dmg;
  }
  if (dmg > 0) {
    const armor = effectiveArmor(e) * armorWeight;
    const hull = dmg * hullMult * (100 / (100 + armor));
    e.hp -= hull;
    dealt += hull;
  }
  e.shieldDelay = 0;
  e.hitFlash = 0.12;
  const killed = e.hp <= 0;
  if (killed) {
    e.hp = 0;
    e.alive = false;
  }
  return { dealt, killed };
}

/** Урон по бункеру с учётом снижения урона и сопротивлений защитного контура. */
export function mitigateBunkerDamage(amount: number, type: AttackType, resist: Record<AttackType, number>, reduction: number): number {
  return amount * (1 - Math.min(gameConfig.maxResist, resist[type] ?? 0)) * (1 - reduction);
}
