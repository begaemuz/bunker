import type { EquipCategory, Rarity, ResourceKey } from '../types';
/**
 * VIP-статус: растёт от очков VIP, которые начисляются за покупку
 * кристаллов за реальные деньги (1 кристалл = 1 очко).
 */
export const VIP_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000, 50000, 100000];

export function vipLevel(points: number): number {
  let lvl = 0;
  for (let i = 1; i < VIP_THRESHOLDS.length; i++) if (points >= VIP_THRESHOLDS[i]) lvl = i;
  return lvl;
}

export function vipNext(points: number): { level: number; need: number; from: number } | null {
  const lvl = vipLevel(points);
  if (lvl >= VIP_THRESHOLDS.length - 1) return null;
  return { level: lvl + 1, need: VIP_THRESHOLDS[lvl + 1], from: VIP_THRESHOLDS[lvl] };
}

export interface VipPerks {
  /** Прибавка к монетам с роботов. */
  coinPct: number;
  /** Прибавка к опыту бункера. */
  xpPct: number;
  /** Прибавка к шансу выпадения вещей и модификаций. */
  dropPct: number;
  /** Дополнительные часы офлайн-обороны. */
  offlineHours: number;
  /** Эффективность офлайн-обороны (прибавка). */
  offlineEff: number;
  /** Прибавка к шансу улучшения оборудования. */
  upgradeChance: number;
  /** Прибавка к шансу объединения модификаций. */
  fusionChance: number;
  /** Множитель дневных лимитов обмена. */
  exchangeMult: number;
  /** Множитель награды за ежедневный вход. */
  loginMult: number;
  /** Скорость боя ×4. */
  speed4: boolean;
  /** Босс вызывается сам, как только готов. */
  autoBoss: boolean;
}

const T = <X,>(arr: X[], lvl: number): X => arr[Math.max(0, Math.min(arr.length - 1, lvl))];

export function vipPerks(level: number): VipPerks {
  return {
    coinPct: T([0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 1], level),
    xpPct: T([0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75], level),
    dropPct: T([0, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5], level),
    offlineHours: T([0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16], level),
    offlineEff: T([0, 0.05, 0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.25, 0.3, 0.35], level),
    upgradeChance: T([0, 0, 0, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1], level),
    fusionChance: T([0, 0, 0, 0, 0.05, 0.06, 0.07, 0.08, 0.1, 0.12, 0.15], level),
    exchangeMult: level >= 7 ? 2 : level >= 2 ? 1.5 : 1,
    loginMult: level >= 9 ? 2 : level >= 4 ? 1.5 : 1,
    speed4: level >= 3,
    autoBoss: level >= 4,
  };
}

const pct = (v: number) => `+${Math.round(v * 100)}%`;

/** Привилегии уровня текстом: [ключ, текст] — ключ нужен, чтобы отметить новое. */
export function vipPerkList(level: number): { key: string; text: string }[] {
  const p = vipPerks(level);
  const out: { key: string; text: string }[] = [];
  const add = (key: string, v: number | boolean, text: string) => {
    if (v) out.push({ key: `${key}:${v}`, text });
  };
  add('chest', level >= 1, 'Ежедневный VIP-сундук');
  add('coin', p.coinPct, `${pct(p.coinPct)} монет с роботов`);
  add('xp', p.xpPct, `${pct(p.xpPct)} опыта бункера`);
  add('drop', p.dropPct, `${pct(p.dropPct)} к шансу выпадения вещей и модификаций`);
  add('speed', p.speed4, 'Скорость боя ×4');
  add('auto', p.autoBoss, 'Автовызов босса, когда он готов');
  add('upg', p.upgradeChance, `${pct(p.upgradeChance)} к шансу улучшения`);
  add('fuse', p.fusionChance, `${pct(p.fusionChance)} к шансу объединения модификаций`);
  add('off', p.offlineHours, `Офлайн-оборона дольше на ${p.offlineHours} ч и выгоднее на ${Math.round(p.offlineEff * 100)}%`);
  add('login', p.loginMult > 1, `Награды за вход ×${p.loginMult}`);
  add('exch', p.exchangeMult > 1, `Лимиты обмена ×${p.exchangeMult}`);
  return out;
}

/** Совместимость: только тексты. */
export function vipPerkLines(level: number): string[] {
  return vipPerkList(level).map((x) => x.text);
}

/** Ежедневный VIP-сундук: растёт с уровнем VIP. */
export function vipChest(level: number): Partial<Record<ResourceKey, number>> {
  if (level <= 0) return {};
  const r: Partial<Record<ResourceKey, number>> = {
    coins: 800 * level,
    crystals: 3 * level,
    stabilizers: Math.ceil(level / 2),
    energyCores: level,
  };
  if (level >= 5) r.expansionKeys = 1;
  if (level >= 7) r.bossPasses = 1;
  if (level >= 9) r.blueprints = 5;
  return r;
}

export type VipGift =
  | { kind: 'res'; res: Partial<Record<ResourceKey, number>> }
  | { kind: 'parts'; rarity: Rarity; count: number }
  | { kind: 'item'; rarity: Rarity; category?: EquipCategory }
  | { kind: 'unique'; templateId: string }
  | { kind: 'avatar'; id: number }
  | { kind: 'frame'; id: string };

/** Подарки за достижение уровня VIP (забираются один раз). */
export const VIP_GIFTS: Record<number, VipGift[]> = {
  1: [{ kind: 'res', res: { stabilizers: 3, expansionKeys: 1, coins: 3000 } }, { kind: 'frame', id: 'vip1' }],
  2: [{ kind: 'res', res: { energyCores: 5, blueprints: 5, crystals: 30 } }],
  3: [{ kind: 'parts', rarity: 'epic', count: 2 }, { kind: 'frame', id: 'vip3' }],
  4: [{ kind: 'item', rarity: 'epic', category: 'coil' }, { kind: 'res', res: { expansionKeys: 3, bossPasses: 3 } }],
  5: [{ kind: 'item', rarity: 'legendary' }, { kind: 'avatar', id: 6 }, { kind: 'frame', id: 'vip5' }],
  6: [{ kind: 'parts', rarity: 'legendary', count: 2 }, { kind: 'res', res: { energyCores: 15 } }],
  7: [{ kind: 'item', rarity: 'legendary', category: 'coil' }, { kind: 'item', rarity: 'legendary', category: 'generator' }],
  8: [{ kind: 'unique', templateId: 'v_imperial' }, { kind: 'frame', id: 'vip8' }],
  9: [{ kind: 'parts', rarity: 'legendary', count: 4 }, { kind: 'res', res: { expansionKeys: 10, crystals: 300 } }],
  10: [{ kind: 'unique', templateId: 'v_crown' }, { kind: 'avatar', id: 7 }, { kind: 'frame', id: 'vip10' }],
};

/** Наборы кристаллов за Telegram Stars. */
export const crystalPacks = [
  { id: 'c60', crystals: 60, bonus: 0, stars: 50 },
  { id: 'c300', crystals: 300, bonus: 30, stars: 250 },
  { id: 'c650', crystals: 650, bonus: 100, stars: 500 },
  { id: 'c1400', crystals: 1400, bonus: 300, stars: 1000 },
  { id: 'c3000', crystals: 3000, bonus: 900, stars: 2000 },
];

/** Аватары инженеров и рамки. */
export const AVATARS = [
  { id: 0, name: 'Механик', skin: '#e8b98f', hair: '#3a2a1e', gear: '#f2a93b', visor: '#46d4ff' },
  { id: 1, name: 'Связистка', skin: '#f0c7a5', hair: '#b4532a', gear: '#46d4ff', visor: '#ffd27a' },
  { id: 2, name: 'Сварщик', skin: '#c98e66', hair: '#1b1b1b', gear: '#7d858c', visor: '#ff7a3d' },
  { id: 3, name: 'Хакер', skin: '#e2b08a', hair: '#5a3a8a', gear: '#b46bff', visor: '#7be38a' },
  { id: 4, name: 'Инженер-полевик', skin: '#8d5a3b', hair: '#2a1d14', gear: '#5fd16a', visor: '#46d4ff' },
  { id: 5, name: 'Ветеран', skin: '#d9a982', hair: '#9aa0a6', gear: '#ff4d6a', visor: '#ffd27a' },
  { id: 6, name: 'Командор', skin: '#e8b98f', hair: '#1b1b1b', gear: '#b46bff', visor: '#ffd06a', vip: 5 },
  { id: 7, name: 'Император', skin: '#f0c7a5', hair: '#e8c26a', gear: '#ffd06a', visor: '#ff4d6a', vip: 10 },
] as { id: number; name: string; skin: string; hair: string; gear: string; visor: string; vip?: number }[];

export interface FrameDef {
  id: string;
  name: string;
  colors: [string, string];
  req: { level?: number; vip?: number };
}

export const FRAMES: FrameDef[] = [
  { id: 'steel', name: 'Сталь', colors: ['#8d959c', '#3a4148'], req: {} },
  { id: 'bronze', name: 'Бронза', colors: ['#e0a46a', '#7a4a22'], req: { level: 10 } },
  { id: 'silver', name: 'Серебро', colors: ['#f2f4f6', '#8a949c'], req: { level: 20 } },
  { id: 'gold', name: 'Золото', colors: ['#ffe08a', '#c98a1a'], req: { level: 30 } },
  { id: 'vip1', name: 'VIP Неон', colors: ['#46d4ff', '#1b6f96'], req: { vip: 1 } },
  { id: 'vip3', name: 'VIP Плазма', colors: ['#d58cff', '#6b2fb0'], req: { vip: 3 } },
  { id: 'vip5', name: 'VIP Инферно', colors: ['#ffb347', '#d1281b'], req: { vip: 5 } },
  { id: 'vip8', name: 'VIP Империя', colors: ['#fff3c4', '#e8901c'], req: { vip: 8 } },
  { id: 'vip10', name: 'VIP Корона', colors: ['#ffffff', '#ff4d6a'], req: { vip: 10 } },
];

export function frameUnlocked(f: FrameDef, level: number, vip: number): boolean {
  return (f.req.level ?? 0) <= level && (f.req.vip ?? 0) <= vip;
}
