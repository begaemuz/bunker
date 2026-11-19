import type { Resources, StatKey } from '../types';

export type TechBranch = 'energy' | 'em' | 'engineering' | 'defense' | 'cooling';
export type TechMetaKey = 'maxItemLevel' | 'upgradeChance' | 'upgradeCost';

export interface TechNode {
  id: string;
  branch: TechBranch;
  name: string;
  description: string;
  maxLevel: number;
  /** Требуемый уровень бункера для 1-го уровня технологии. */
  levelReq: number;
  /** Каждый следующий уровень технологии требует +levelStep к уровню бункера. */
  levelStep: number;
  requires: { id: string; level: number }[];
  /** Стоимость 1-го уровня; дальше × growth за уровень. */
  cost: Partial<Resources>;
  growth: number;
  /** Эффект за каждый уровень. */
  effects: { key: StatKey | TechMetaKey; perLevel: number }[];
}

export const techBranches: { id: TechBranch; name: string; description: string }[] = [
  { id: 'energy', name: 'Энергетика', description: 'Генераторы, накопители, потери энергии.' },
  { id: 'em', name: 'Электромагнетизм', description: 'Мощность, радиус и частота катушек, эффекты.' },
  { id: 'engineering', name: 'Инженерия', description: 'Улучшение оборудования и трофеи.' },
  { id: 'defense', name: 'Защита', description: 'Прочность бункера, снижение урона, ремонт.' },
  { id: 'cooling', name: 'Охлаждение', description: 'Нагрев, теплоотвод и стабильность комплекса.' },
];

const N = (n: Omit<TechNode, 'growth' | 'levelStep' | 'requires'> & Partial<Pick<TechNode, 'growth' | 'levelStep' | 'requires'>>): TechNode => ({
  growth: 1.65,
  levelStep: 2,
  requires: [],
  ...n,
});

export const techConfig: TechNode[] = [
  // ── Энергетика ──
  N({ id: 'e_gen', branch: 'energy', name: 'Оптимизация генераторов', description: '+6% мощности генератора за уровень.', maxLevel: 5, levelReq: 2, cost: { coins: 150, techParts: 4 }, effects: [{ key: 'genPowerPct', perLevel: 0.06 }] }),
  N({ id: 'e_cap', branch: 'energy', name: 'Ёмкие накопители', description: '+10% ёмкости накопителя за уровень.', maxLevel: 5, levelReq: 3, requires: [{ id: 'e_gen', level: 1 }], cost: { coins: 200, techParts: 5 }, effects: [{ key: 'capacityPct', perLevel: 0.1 }] }),
  N({ id: 'e_loss', branch: 'energy', name: 'Снижение потерь', description: '+2% к КПД передачи энергии за уровень.', maxLevel: 4, levelReq: 5, requires: [{ id: 'e_gen', level: 2 }], cost: { coins: 400, techParts: 10, blueprints: 1 }, effects: [{ key: 'conversion', perLevel: 0.02 }] }),
  N({ id: 'e_charge', branch: 'energy', name: 'Быстрая зарядка', description: '+3 ед/с к скорости зарядки накопителя.', maxLevel: 5, levelReq: 8, requires: [{ id: 'e_cap', level: 2 }], cost: { coins: 700, techParts: 16, blueprints: 1 }, effects: [{ key: 'chargeRate', perLevel: 3 }] }),
  N({ id: 'e_drain', branch: 'energy', name: 'Экономичные модули', description: '−6% постоянного потребления модулей.', maxLevel: 4, levelReq: 12, requires: [{ id: 'e_loss', level: 2 }], cost: { coins: 1500, techParts: 30, blueprints: 2 }, effects: [{ key: 'drainPct', perLevel: -0.06 }] }),

  // ── Электромагнетизм ──
  N({ id: 'm_power', branch: 'em', name: 'Мощность импульсов', description: '+6% мощности обеих катушек за уровень.', maxLevel: 8, levelReq: 1, levelStep: 2, cost: { coins: 120, techParts: 3 }, effects: [{ key: 'coilPowerPct', perLevel: 0.06 }] }),
  N({ id: 'm_radius', branch: 'em', name: 'Фокусировка поля', description: '+4% радиуса катушек за уровень.', maxLevel: 5, levelReq: 4, requires: [{ id: 'm_power', level: 2 }], cost: { coins: 300, techParts: 8 }, effects: [{ key: 'coilRadiusPct', perLevel: 0.04 }] }),
  N({ id: 'm_rate', branch: 'em', name: 'Частотная модуляция', description: '+5% частоты импульсов за уровень.', maxLevel: 5, levelReq: 6, requires: [{ id: 'm_power', level: 3 }], cost: { coins: 450, techParts: 12, blueprints: 1 }, effects: [{ key: 'coilRatePct', perLevel: 0.05 }] }),
  N({ id: 'm_cost', branch: 'em', name: 'Эффективные катушки', description: '−5% энергии на импульс за уровень.', maxLevel: 4, levelReq: 9, requires: [{ id: 'm_rate', level: 1 }], cost: { coins: 800, techParts: 18, blueprints: 1 }, effects: [{ key: 'pulseCostPct', perLevel: -0.05 }] }),
  N({ id: 'm_chain', branch: 'em', name: 'Цепной разряд', description: '+3% шанса цепного разряда для всех катушек.', maxLevel: 3, levelReq: 15, requires: [{ id: 'm_cost', level: 2 }], cost: { coins: 2500, techParts: 40, blueprints: 3, energyCores: 2 }, effects: [{ key: 'chance:chain', perLevel: 0.03 }] }),

  // ── Инженерия ──
  N({ id: 'g_cost', branch: 'engineering', name: 'Снижение стоимости обслуживания', description: '−5% стоимости улучшения оборудования.', maxLevel: 5, levelReq: 3, cost: { coins: 250, techParts: 6 }, effects: [{ key: 'upgradeCost', perLevel: -0.05 }] }),
  N({ id: 'g_chance', branch: 'engineering', name: 'Точная сборка', description: '+2% шанса успешного улучшения.', maxLevel: 5, levelReq: 4, cost: { coins: 350, techParts: 8, blueprints: 1 }, effects: [{ key: 'upgradeChance', perLevel: 0.02 }] }),
  N({ id: 'g_maxlvl', branch: 'engineering', name: 'Предельные нагрузки', description: '+2 к максимальному уровню оборудования.', maxLevel: 5, levelReq: 8, levelStep: 4, requires: [{ id: 'g_chance', level: 1 }], cost: { coins: 1000, techParts: 20, blueprints: 2 }, effects: [{ key: 'maxItemLevel', perLevel: 2 }] }),
  N({ id: 'g_salvage', branch: 'engineering', name: 'Переработка трофеев', description: '+5% монет с роботов.', maxLevel: 5, levelReq: 2, cost: { coins: 200, techParts: 4 }, effects: [{ key: 'coinPct', perLevel: 0.05 }] }),
  N({ id: 'g_drops', branch: 'engineering', name: 'Поиск трофеев', description: '+6% шанса выпадения оборудования.', maxLevel: 5, levelReq: 7, requires: [{ id: 'g_salvage', level: 2 }], cost: { coins: 600, techParts: 14, blueprints: 1 }, effects: [{ key: 'dropChancePct', perLevel: 0.06 }] }),

  // ── Защита ──
  N({ id: 'd_hull', branch: 'defense', name: 'Укрепление корпуса', description: '+8% прочности бункера.', maxLevel: 8, levelReq: 1, cost: { coins: 120, scrap: 15 }, effects: [{ key: 'hullPct', perLevel: 0.08 }] }),
  N({ id: 'd_regen', branch: 'defense', name: 'Ремонтные дроны', description: '+0.8 ед/с к регенерации прочности.', maxLevel: 5, levelReq: 3, cost: { coins: 220, scrap: 25, techParts: 4 }, effects: [{ key: 'regen', perLevel: 0.8 }] }),
  N({ id: 'd_dr', branch: 'defense', name: 'Композитная броня', description: '+2% снижения входящего урона.', maxLevel: 5, levelReq: 5, requires: [{ id: 'd_hull', level: 2 }], cost: { coins: 450, scrap: 40, techParts: 10 }, effects: [{ key: 'damageReduction', perLevel: 0.02 }] }),
  N({ id: 'd_emerg', branch: 'defense', name: 'Аварийные системы ремонта', description: '+5% экстренного ремонта при критическом уроне.', maxLevel: 4, levelReq: 9, requires: [{ id: 'd_regen', level: 2 }], cost: { coins: 900, scrap: 60, techParts: 16, blueprints: 1 }, effects: [{ key: 'emergencyRepair', perLevel: 0.05 }] }),
  N({ id: 'd_contour', branch: 'defense', name: 'Развитие защитного контура', description: '+3% сопротивления всем типам атак.', maxLevel: 4, levelReq: 12, requires: [{ id: 'd_dr', level: 2 }], cost: { coins: 1800, scrap: 100, techParts: 30, blueprints: 2 }, effects: [{ key: 'resist:kinetic', perLevel: 0.03 }, { key: 'resist:explosive', perLevel: 0.03 }, { key: 'resist:energy', perLevel: 0.03 }] }),

  // ── Охлаждение ──
  N({ id: 'c_rate', branch: 'cooling', name: 'Теплоотвод', description: '+8% скорости охлаждения.', maxLevel: 6, levelReq: 2, cost: { coins: 150, scrap: 15, techParts: 3 }, effects: [{ key: 'coolRatePct', perLevel: 0.08 }] }),
  N({ id: 'c_cap', branch: 'cooling', name: 'Тепловая ёмкость', description: '+12 к допустимому нагреву.', maxLevel: 5, levelReq: 4, cost: { coins: 250, scrap: 20, techParts: 5 }, effects: [{ key: 'heatCap', perLevel: 12 }] }),
  N({ id: 'c_heat', branch: 'cooling', name: 'Снижение нагрева', description: '−5% нагрева от всего оборудования.', maxLevel: 5, levelReq: 6, requires: [{ id: 'c_rate', level: 2 }], cost: { coins: 500, scrap: 35, techParts: 12, blueprints: 1 }, effects: [{ key: 'heatPct', perLevel: -0.05 }] }),
  N({ id: 'c_stab', branch: 'cooling', name: 'Стабилизация комплекса', description: '+4% форсажа катушек, пока комплекс холодный.', maxLevel: 4, levelReq: 11, requires: [{ id: 'c_cap', level: 2 }], cost: { coins: 1200, scrap: 60, techParts: 22, blueprints: 2 }, effects: [{ key: 'overdrive', perLevel: 0.04 }] }),
  N({ id: 'c_load', branch: 'cooling', name: 'Допустимая нагрузка', description: '+4% эффективности охлаждения, сенсоров и защиты.', maxLevel: 4, levelReq: 14, requires: [{ id: 'c_heat', level: 2 }], cost: { coins: 2000, scrap: 90, techParts: 35, blueprints: 3, energyCores: 1 }, effects: [{ key: 'moduleBonus', perLevel: 0.04 }] }),
];

export function getTech(id: string): TechNode | undefined {
  return techConfig.find((t) => t.id === id);
}
