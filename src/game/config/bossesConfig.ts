import { drops, type EnemyDef } from './enemiesConfig';

export interface BossLook {
  /** Число граней корпуса. */
  sides: number;
  hull: string;
  core: string;
  /** Количество орудий. */
  guns: number;
  spikes: boolean;
}

export interface BossDef extends EnemyDef {
  id: string;
  title: string;
  look: BossLook;
  /** Количество обычного оборудования в награду [мин, макс]. */
  itemCount: [number, number];
  /** Уникальные предметы и шанс каждого (настраивается для босса). */
  uniques: { template: string; chance: number }[];
  /** Шанс выдать пропуск вызова босса. */
  passChance: number;
  /** Шанс красной вещи за победу. */
  mythicChance?: number;
}

const B = (b: BossDef) => b;

/** Архетипы боссов (заданы под свою родную зону, потом пересчитываются по Т). */
const archetypes: Record<string, BossDef> = {
  colossus: B({
    id: 'colossus',
    name: 'Колосс-01',
    title: 'Штурмовая платформа городских кварталов',
    hp: 2200,
    armor: 9,
    speed: 12,
    damage: 20,
    attackInterval: 1.5,
    range: 0,
    attack: 'kinetic',
    resist: { emp: 0.15 },
    electronic: true,
    heavyFrame: true,
    size: 38,
    xp: 400,
    drops: drops({
      coins: [400, 600],
      scrap: { chance: 1, amount: [25, 40] },
      techParts: { chance: 1, amount: [10, 16] },
      blueprints: { chance: 1, amount: [2, 3] },
      energyCores: { chance: 1, amount: [1, 2] },
    }),
    abilities: [
      { type: 'blast', damage: 45, interval: 3.5, attack: 'energy' },
      { type: 'summon', kind: 'light', count: 4, interval: 11 },
      { type: 'shield', percent: 0.18, regenDelay: 6, regenRate: 0.03 },
      { type: 'selfRepair', percentPerSec: 0.006, belowHp: 0.5 },
    ],
    look: { sides: 8, hull: '#25282c', core: '#ff2a2a', guns: 2, spikes: false },
    itemCount: [1, 2],
    uniques: [
      { template: 'u_silencer', chance: 0.12 },
      { template: 'u_firststrike', chance: 0.1 },
    ],
    passChance: 0.3,
  }),
  smith: B({
    id: 'smith',
    name: 'Кузнец',
    title: 'Сборочный комплекс промышленной зоны',
    hp: 22000,
    armor: 55,
    speed: 10,
    damage: 45,
    attackInterval: 1.6,
    range: 0,
    attack: 'kinetic',
    resist: { emp: 0.25, vibration: 0.1 },
    electronic: false,
    heavyFrame: true,
    size: 42,
    xp: 900,
    drops: drops({
      coins: [900, 1300],
      scrap: { chance: 1, amount: [50, 80] },
      techParts: { chance: 1, amount: [20, 30] },
      blueprints: { chance: 1, amount: [3, 5] },
      energyCores: { chance: 1, amount: [2, 3] },
    }),
    abilities: [
      { type: 'summon', kind: 'heavy', count: 2, interval: 14 },
      { type: 'armorUp', interval: 16, duration: 6, armor: 60 },
      { type: 'blast', damage: 70, interval: 4, attack: 'explosive' },
    ],
    look: { sides: 6, hull: '#3a2c22', core: '#ff8a1a', guns: 4, spikes: true },
    itemCount: [1, 2],
    uniques: [
      { template: 'u_twins', chance: 0.1 },
      { template: 'u_reflector', chance: 0.1 },
    ],
    passChance: 0.3,
  }),
  worm: B({
    id: 'worm',
    name: 'Песчаный червь',
    title: 'Буровая машина пустошей',
    hp: 50000,
    armor: 40,
    speed: 16,
    damage: 60,
    attackInterval: 1.4,
    range: 0,
    attack: 'kinetic',
    resist: { thermal: 0.35 },
    electronic: false,
    heavyFrame: true,
    size: 40,
    xp: 1700,
    drops: drops({
      coins: [1700, 2400],
      scrap: { chance: 1, amount: [90, 130] },
      techParts: { chance: 1, amount: [35, 50] },
      blueprints: { chance: 1, amount: [4, 6] },
      energyCores: { chance: 1, amount: [3, 4] },
    }),
    abilities: [
      { type: 'heatWave', interval: 9, heat: 35 },
      { type: 'summon', kind: 'kamikaze', count: 4, interval: 10 },
      { type: 'selfRepair', percentPerSec: 0.01, belowHp: 0.35 },
    ],
    look: { sides: 12, hull: '#4a3a24', core: '#ffcc33', guns: 0, spikes: true },
    itemCount: [1, 3],
    uniques: [
      { template: 'u_dune', chance: 0.1 },
      { template: 'u_scorch', chance: 0.09 },
    ],
    passChance: 0.3,
  }),
  icebreaker: B({
    id: 'icebreaker',
    name: 'Ледокол',
    title: 'Тяжёлый вездеход северных баз',
    hp: 110000,
    armor: 70,
    speed: 11,
    damage: 80,
    attackInterval: 1.8,
    range: 0,
    attack: 'kinetic',
    resist: { vibration: 0.3, emp: 0.2 },
    electronic: false,
    heavyFrame: true,
    size: 44,
    xp: 3000,
    drops: drops({
      coins: [3000, 4200],
      scrap: { chance: 1, amount: [150, 220] },
      techParts: { chance: 1, amount: [60, 85] },
      blueprints: { chance: 1, amount: [5, 8] },
      energyCores: { chance: 1, amount: [4, 6] },
    }),
    abilities: [
      { type: 'shield', percent: 0.25, regenDelay: 5, regenRate: 0.05 },
      { type: 'jamCoil', interval: 15, duration: 5 },
      { type: 'summon', kind: 'armored', count: 1, interval: 15 },
    ],
    look: { sides: 5, hull: '#2a3540', core: '#9fe6ff', guns: 2, spikes: false },
    itemCount: [2, 3],
    uniques: [
      { template: 'u_recuperator', chance: 0.09 },
      { template: 'u_quake', chance: 0.09 },
    ],
    passChance: 0.3,
  }),
  isotope: B({
    id: 'isotope',
    name: 'Изотоп',
    title: 'Заражённый страж радиоактивной зоны',
    hp: 220000,
    armor: 45,
    speed: 13,
    damage: 95,
    attackInterval: 1.5,
    range: 0,
    attack: 'energy',
    resist: { overload: 0.25, thermal: 0.2 },
    electronic: true,
    heavyFrame: false,
    size: 40,
    xp: 5000,
    drops: drops({
      coins: [5000, 7000],
      scrap: { chance: 1, amount: [220, 300] },
      techParts: { chance: 1, amount: [90, 120] },
      blueprints: { chance: 1, amount: [7, 10] },
      energyCores: { chance: 1, amount: [6, 9] },
    }),
    abilities: [
      { type: 'shield', percent: 0.5, regenDelay: 3, regenRate: 0.08 },
      { type: 'suppress', interval: 18, duration: 4, rateFactor: 0.6 },
      { type: 'summon', kind: 'shielded', count: 2, interval: 12 },
    ],
    look: { sides: 7, hull: '#22301e', core: '#a6ff4d', guns: 3, spikes: true },
    itemCount: [2, 3],
    uniques: [
      { template: 'u_marker', chance: 0.08 },
      { template: 'u_breaker', chance: 0.08 },
    ],
    passChance: 0.3,
  }),
  prototype: B({
    id: 'prototype',
    name: 'Прототип-Х',
    title: 'Экспериментальная машина научного комплекса',
    hp: 420000,
    armor: 60,
    speed: 18,
    damage: 110,
    attackInterval: 1.2,
    range: 0,
    attack: 'energy',
    resist: { emp: 0.3, radio: 0.3, highVoltage: 0.15 },
    electronic: true,
    heavyFrame: false,
    size: 36,
    xp: 8000,
    drops: drops({
      coins: [8000, 11000],
      scrap: { chance: 1, amount: [300, 420] },
      techParts: { chance: 1, amount: [130, 170] },
      blueprints: { chance: 1, amount: [9, 13] },
      energyCores: { chance: 1, amount: [8, 12] },
    }),
    abilities: [
      { type: 'jamCoil', interval: 12, duration: 4 },
      { type: 'heatWave', interval: 10, heat: 40 },
      { type: 'blast', damage: 140, interval: 4, attack: 'energy' },
      { type: 'shield', percent: 0.3, regenDelay: 4, regenRate: 0.06 },
    ],
    look: { sides: 3, hull: '#2c2236', core: '#d24dff', guns: 3, spikes: false },
    itemCount: [2, 3],
    uniques: [
      { template: 'u_lightning', chance: 0.08 },
      { template: 'u_prototype_cap', chance: 0.08 },
    ],
    passChance: 0.3,
  }),
  core: B({
    id: 'core',
    name: 'Ядро ИИ',
    title: 'Сердце главного производственного комплекса',
    hp: 800000,
    armor: 80,
    speed: 8,
    damage: 140,
    attackInterval: 1.5,
    range: 0,
    attack: 'energy',
    resist: { emp: 0.3, overload: 0.2, thermal: 0.2, vibration: 0.2 },
    electronic: true,
    heavyFrame: true,
    size: 48,
    xp: 14000,
    drops: drops({
      coins: [14000, 20000],
      scrap: { chance: 1, amount: [500, 700] },
      techParts: { chance: 1, amount: [200, 260] },
      blueprints: { chance: 1, amount: [12, 18] },
      energyCores: { chance: 1, amount: [12, 18] },
    }),
    abilities: [
      { type: 'shield', percent: 0.4, regenDelay: 4, regenRate: 0.05 },
      { type: 'summon', kind: 'shielded', count: 2, interval: 12 },
      { type: 'summon', kind: 'armored', count: 1, interval: 16 },
      { type: 'suppress', interval: 20, duration: 5, rateFactor: 0.55 },
      { type: 'jamCoil', interval: 14, duration: 5 },
      { type: 'blast', damage: 180, interval: 4.5, attack: 'energy' },
    ],
    look: { sides: 10, hull: '#1a1d22', core: '#ff3355', guns: 6, spikes: true },
    itemCount: [3, 4],
    uniques: [
      { template: 'u_core_gen', chance: 0.07 },
      { template: 'u_core_sensor', chance: 0.07 },
    ],
    passChance: 0.3,
  }),
};

// ───────────── Боссы по Т-уровню ─────────────
// Все боссы считаются по одной формуле от Т зоны, поэтому зон может быть сколько угодно.

/** Родная зона архетипа. */
const NATIVE: Record<string, number> = { colossus: 1, smith: 2, worm: 3, icebreaker: 4, isotope: 5, prototype: 6, core: 7 };
/** Характер архетипа: множители запаса прочности и брони. */
const FLAVOR: Record<string, { hp: number; armor: number }> = {
  colossus: { hp: 1, armor: 1 },
  smith: { hp: 1.1, armor: 1.6 },
  worm: { hp: 1, armor: 1.1 },
  icebreaker: { hp: 1.05, armor: 1.3 },
  isotope: { hp: 0.95, armor: 0.9 },
  prototype: { hp: 1, armor: 1 },
  core: { hp: 1.15, armor: 1.2 },
};

/** Базовая прочность, урон и броня босса зоны Т. */
export const bossCurve = {
  hp: (t: number) => 2200 * Math.pow(1.75, t - 1),
  damage: (t: number) => 20 * Math.pow(1.36, t - 1),
  armor: (t: number) => 9 + 9 * (t - 1),
  reward: (t: number) => Math.pow(1.45, t - 1),
};

function scaleDrops(d: BossDef['drops'], m: number): BossDef['drops'] {
  const out = { ...d } as Record<string, unknown>;
  for (const [k, v] of Object.entries(d)) {
    if (Array.isArray(v)) out[k] = [Math.round(v[0] * m), Math.round(v[1] * m)];
    else if (v && typeof v === 'object' && 'amount' in v) {
      const a = (v as { amount: [number, number] }).amount;
      out[k] = { ...v, amount: [Math.max(1, Math.round(a[0] * m)), Math.max(1, Math.round(a[1] * m))] };
    }
  }
  return out as unknown as BossDef['drops'];
}

/** Пересчитывает архетип под зону Т. */
function retier(arch: string, tier: number, over: Partial<BossDef> & { id: string }): BossDef {
  const b = archetypes[arch];
  const t0 = NATIVE[arch];
  const f = FLAVOR[arch];
  const damage = bossCurve.damage(tier);
  const dmgK = damage / b.damage;
  const armor = Math.round(bossCurve.armor(tier) * f.armor);
  const armK = armor / Math.max(1, b.armor);
  return {
    ...b,
    hp: Math.round(bossCurve.hp(tier) * f.hp),
    armor,
    damage: Math.round(damage),
    xp: Math.round(400 * bossCurve.reward(tier)),
    drops: scaleDrops(b.drops, bossCurve.reward(tier) / bossCurve.reward(t0)),
    abilities: b.abilities.map((a) =>
      a.type === 'blast' ? { ...a, damage: Math.round(a.damage * dmgK) } : a.type === 'armorUp' ? { ...a, armor: Math.round(a.armor * armK) } : a,
    ),
    uniques: [],
    ...over,
  };
}

/** Боссы зон 8–20: новые имена на основе архетипов. */
const EXTRA: { id: string; arch: string; tier: number; name: string; title: string; look: BossDef['look'] }[] = [
  { id: 'tide', arch: 'worm', tier: 8, name: 'Левиафан', title: 'Подводный буровой комплекс', look: { sides: 7, hull: '#14262e', core: '#3fd0ff', guns: 4, spikes: true } },
  { id: 'ash', arch: 'colossus', tier: 9, name: 'Пепельный голем', title: 'Шагающая печь равнин', look: { sides: 8, hull: '#2a2420', core: '#ff8a3d', guns: 4, spikes: false } },
  { id: 'frostgate', arch: 'icebreaker', tier: 10, name: 'Морозные врата', title: 'Страж ледяного ангара', look: { sides: 6, hull: '#1f2c38', core: '#9fe6ff', guns: 5, spikes: true } },
  { id: 'mire', arch: 'isotope', tier: 11, name: 'Кислотная матка', title: 'Фабрика болотных дронов', look: { sides: 9, hull: '#1d2a16', core: '#a6ff3d', guns: 4, spikes: false } },
  { id: 'relay', arch: 'prototype', tier: 12, name: 'Ретранслятор', title: 'Узел связи машинной сети', look: { sides: 5, hull: '#221d33', core: '#b07bff', guns: 4, spikes: false } },
  { id: 'scrapking', arch: 'smith', tier: 13, name: 'Король свалки', title: 'Собран из тысячи павших машин', look: { sides: 8, hull: '#2b2a26', core: '#ffd24d', guns: 6, spikes: true } },
  { id: 'deep', arch: 'worm', tier: 14, name: 'Глубинный бур', title: 'Хозяин подземного города', look: { sides: 7, hull: '#191d24', core: '#ff5a3d', guns: 5, spikes: true } },
  { id: 'magma', arch: 'colossus', tier: 15, name: 'Магмовый титан', title: 'Плавильня вулканического завода', look: { sides: 10, hull: '#2e1a14', core: '#ff6a1a', guns: 6, spikes: true } },
  { id: 'launch', arch: 'icebreaker', tier: 16, name: 'Стартовый стол', title: 'Оживший комплекс космодрома', look: { sides: 6, hull: '#232830', core: '#f2f2f2', guns: 6, spikes: false } },
  { id: 'watcher', arch: 'prototype', tier: 17, name: 'Наблюдатель', title: 'Глаз купола слежения', look: { sides: 3, hull: '#1c2030', core: '#4dd8ff', guns: 5, spikes: false } },
  { id: 'eclipse', arch: 'isotope', tier: 18, name: 'Затмение', title: 'Владыка сектора чёрного неба', look: { sides: 9, hull: '#121218', core: '#8a4dff', guns: 6, spikes: true } },
  { id: 'citadel', arch: 'core', tier: 19, name: 'Цитадель', title: 'Последний рубеж обороны ИИ', look: { sides: 12, hull: '#1a1a20', core: '#ff3355', guns: 8, spikes: true } },
  { id: 'signal', arch: 'core', tier: 20, name: 'Источник сигнала', title: 'Разум, управляющий всеми машинами', look: { sides: 12, hull: '#0f1014', core: '#ffffff', guns: 8, spikes: true } },
];

export const bossesConfig: Record<string, BossDef> = {
  ...Object.fromEntries(Object.keys(archetypes).map((id) => [id, retier(id, NATIVE[id], { id })])),
  ...Object.fromEntries(EXTRA.map((e) => [e.id, retier(e.arch, e.tier, { id: e.id, name: e.name, title: e.title, look: e.look, itemCount: [3, 5] })])),
};
