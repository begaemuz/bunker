import { gameConfig } from '../config/gameConfig';
import type { Enemy } from '../enemies/Enemy';
import type { DamageType } from '../types';

/** Типы урона, игнорирующие броню. */
const ARMOR_PIERCING: ReadonlySet<DamageType> = new Set<DamageType>(['radiation', 'dot']);

export function effectiveArmor(e: Enemy): number {
  const s = e.status;
  const base = e.armor + e.auraArmor - (s.corrosionT > 0 ? s.corrosionP : 0);
  const broken = s.armorBreakT > 0 ? 1 - s.armorBreakP : 1;
  return Math.max(0, base * broken);
}

/** Итоговый урон по роботу до учёта щита. */
export function mitigatedDamage(e: Enemy, amount: number, type: DamageType): number {
  let dmg = amount;
  if (e.status.shockT > 0) dmg *= 1 + e.status.shockP;
  const res = Math.min(gameConfig.maxResist, e.resist[type] ?? 0);
  dmg *= 1 - res;
  if (!ARMOR_PIERCING.has(type)) {
    const a = effectiveArmor(e);
    dmg *= 100 / (100 + a);
  }
  return dmg;
}

export interface HitResult {
  dealt: number;
  killed: boolean;
}

/** Применяет урон: сначала щит, затем HP. */
export function applyDamageToEnemy(e: Enemy, amount: number, type: DamageType): HitResult {
  if (!e.alive || amount <= 0) return { dealt: 0, killed: false };
  let dmg = mitigatedDamage(e, amount, type);
  const total = dmg;
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, dmg);
    e.shield -= absorbed;
    dmg -= absorbed;
  }
  // Щит восстанавливается только через паузу после последнего попадания.
  e.shieldDelay = 0;
  e.hp -= dmg;
  e.hitFlash = 0.12;
  const killed = e.hp <= 0;
  if (killed) {
    e.hp = 0;
    e.alive = false;
  }
  return { dealt: total, killed };
}

/** Урон по бункеру с учётом сопротивлений. */
export function mitigateBunkerDamage(amount: number, type: DamageType, resist: Record<DamageType, number>): number {
  return amount * (1 - Math.min(gameConfig.maxResist, resist[type] ?? 0));
}
