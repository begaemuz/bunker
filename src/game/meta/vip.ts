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
  /** Дополнительные часы офлайн-обороны. */
  offlineHours: number;
  /** Эффективность офлайн-обороны (прибавка). */
  offlineEff: number;
}

export function vipPerks(level: number): VipPerks {
  return {
    coinPct: level * 0.05,
    offlineHours: Math.min(8, level),
    offlineEff: Math.min(0.3, level * 0.03),
  };
}

export function vipPerkLines(level: number): string[] {
  const p = vipPerks(level);
  const out: string[] = [];
  if (p.coinPct) out.push(`+${Math.round(p.coinPct * 100)}% монет с роботов`);
  if (p.offlineHours) out.push(`+${p.offlineHours} ч офлайн-обороны`);
  if (p.offlineEff) out.push(`+${Math.round(p.offlineEff * 100)}% к добыче офлайн`);
  if (level >= 1) out.push('VIP-рамки аватара');
  return out;
}

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
];

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
  { id: 'vip8', name: 'VIP Корона', colors: ['#fff3c4', '#e8901c'], req: { vip: 8 } },
];

export function frameUnlocked(f: FrameDef, level: number, vip: number): boolean {
  return (f.req.level ?? 0) <= level && (f.req.vip ?? 0) <= vip;
}
