import { bossesConfig } from '../config/bossesConfig';
import { eliteConfig } from '../config/enemiesConfig';
import type { LocationDef } from '../config/locationsConfig';
import type { Enemy } from '../enemies/Enemy';
import { generateItem } from '../items/ItemGenerator';
import { rollRarity } from '../items/ItemRarity';
import { chance, randInt } from '../rng';
import type { Item, Part, Rarity, ResourceKey, Resources } from '../types';
import { partDrops } from '../config/partsConfig';
import { generatePart } from '../items/Parts';

/** Шанс выпадения «Сброса навыков» с босса: очень редкая добыча. */
export const SKILL_RESET_CHANCE = 0.01;
/** Шансы бустеров с босса. */
export const BOOST_DROP = { boost1: 0.04, boost2: 0.012, boost3: 0.003 };

export interface Loot {
  resources: Partial<Resources>;
  items: Item[];
  parts: Part[];
}

export interface DropContext {
  location: LocationDef;
  /** Снижение наград за слишком слабых противников (0..1). */
  decay: number;
  dropChanceMult: number;
  coinMult: number;
}

/** Таблица редкости наград босса: только редкое и выше. */
export const bossRarity: Record<Rarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 0.62,
  epic: 0.28,
  legendary: 0.1,
  unique: 0,
};

function amount(c: { chance: number; amount: [number, number] }, mult: number): number {
  if (!chance(Math.min(1, c.chance * mult))) return 0;
  return randInt(c.amount[0], c.amount[1]);
}

function res(loc: LocationDef, k: ResourceKey, v: number): number {
  return Math.round(v * (loc.resourceMult[k] ?? 1));
}

/** Награда за обычного робота: преимущественно ресурсы и опыт. */
export function rollEnemyLoot(e: Enemy, ctx: DropContext): Loot {
  const t = e.def.drops;
  const loc = ctx.location;
  const tierMult = 1 + 0.5 * (loc.tier - 1);
  const r: Partial<Resources> = {};
  const coins = Math.round(randInt(t.coins[0], t.coins[1]) * e.coinMult * ctx.coinMult * ctx.decay * (loc.resourceMult.coins ?? 1));
  if (coins > 0) r.coins = coins;
  const scrap = res(loc, 'scrap', amount(t.scrap, e.dropMult) * tierMult);
  if (scrap) r.scrap = scrap;
  const tech = res(loc, 'techParts', amount(t.techParts, e.dropMult) * tierMult);
  if (tech) r.techParts = tech;
  const bp = res(loc, 'blueprints', amount(t.blueprints, e.dropMult));
  if (bp) r.blueprints = bp;
  const cores = res(loc, 'energyCores', amount(t.energyCores, e.dropMult));
  if (cores) r.energyCores = cores;
  const passChance = t.bossPasses + (e.elite ? eliteConfig.bossPassChance : 0);
  if (passChance > 0 && chance(passChance)) r.bossPasses = 1;
  if (e.isMiniboss && chance(0.3)) r.stabilizers = 1;

  const items: Item[] = [];
  const p = t.item * e.dropMult * ctx.dropChanceMult;
  if (chance(Math.min(1, p))) {
    items.push(
      generateItem({
        rarity: rollRarity(loc.rarity, e.elite || e.isMiniboss ? 0.4 : 0),
        tier: loc.tier,
        source: { kind: 'drop', location: loc.id, enemy: e.def.name + (e.elite ? ' (элита)' : '') },
      }),
    );
  }
  const parts: Part[] = [];
  const pc = e.isMiniboss ? partDrops.minibossChance : partDrops.robotChance * e.dropMult * ctx.dropChanceMult;
  if (chance(Math.min(1, pc))) parts.push(generatePart(rollRarity(partDrops.rarity, e.elite || e.isMiniboss ? 0.4 : 0.05 * (loc.tier - 1))));
  const kc = e.isMiniboss ? partDrops.keyMiniboss : e.elite ? partDrops.keyElite : 0;
  if (kc > 0 && chance(kc)) r.expansionKeys = 1;
  // Компоненты синтеза — редкая находка.
  const cc = e.isMiniboss ? 0.5 : e.elite ? 0.08 : 0.01;
  if (chance(cc)) r.components = e.isMiniboss ? randInt(2, 4) : 1;
  return { resources: r, items, parts };
}

/** Награда за босса: ресурсы, оборудование и шанс уникальных предметов. */
export function rollBossLoot(bossId: string, ctx: DropContext): Loot {
  const boss = bossesConfig[bossId];
  const t = boss.drops;
  const loc = ctx.location;
  const r: Partial<Resources> = {
    coins: Math.round(randInt(t.coins[0], t.coins[1]) * ctx.coinMult),
    scrap: amount(t.scrap, 1),
    techParts: amount(t.techParts, 1),
    blueprints: amount(t.blueprints, 1),
    energyCores: amount(t.energyCores, 1),
  };
  if (chance(0.6)) r.stabilizers = randInt(1, 2);
  if (chance(0.5)) r.crystals = randInt(3, 8) * loc.tier;
  if (chance(boss.passChance)) r.bossPasses = 1;
  // Сброс навыков — редчайшая добыча с боссов.
  if (chance(SKILL_RESET_CHANCE)) r.skillResets = 1;
  // Бустеры: редкая добыча с боссов, самый сильный — редчайший.
  if (chance(BOOST_DROP.boost1)) r.boost1 = 1;
  if (chance(BOOST_DROP.boost2)) r.boost2 = 1;
  if (chance(BOOST_DROP.boost3)) r.boost3 = 1;

  const source = { kind: 'boss' as const, location: loc.id, boss: boss.name };
  const items: Item[] = [];
  const n = randInt(boss.itemCount[0], boss.itemCount[1]);
  for (let i = 0; i < n; i++) items.push(generateItem({ rarity: rollRarity(bossRarity), tier: loc.tier, source }));
  for (const u of boss.uniques) {
    if (chance(u.chance)) items.push(generateItem({ templateId: u.template, rarity: 'unique', tier: loc.tier, source }));
  }
  const parts: Part[] = [];
  const pn = randInt(partDrops.bossCount[0], partDrops.bossCount[1]);
  for (let i = 0; i < pn; i++) parts.push(generatePart(rollRarity(partDrops.rarity, 0.6 + 0.1 * loc.tier)));
  if (chance(partDrops.keyBoss)) r.expansionKeys = 1;
  r.components = randInt(3, 6) * loc.tier;
  return { resources: r, items, parts };
}
