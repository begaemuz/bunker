import { balanceConfig } from '../config/balanceConfig';
import type { Enemy } from '../enemies/Enemy';
import { generateItem } from '../items/ItemGenerator';
import { rollRarity } from '../items/ItemRarity';
import { chance, randInt } from '../rng';
import type { Item, Resources } from '../types';

export interface Loot {
  resources: Partial<Resources>;
  items: Item[];
}

export interface DropContext {
  mapId: number;
  wave: number;
  dropChanceMult: number;
  coinMult: number;
}

function rollAmount(c: { chance: number; amount: [number, number] }, mult: number): number {
  if (!chance(Math.min(1, c.chance * mult))) return 0;
  return randInt(c.amount[0], c.amount[1]);
}

/** Награда за уничтоженного робота. */
export function rollEnemyLoot(e: Enemy, ctx: DropContext): Loot {
  const t = e.def.drops;
  const resources: Partial<Resources> = {};
  const coins = Math.round(randInt(t.coins[0], t.coins[1]) * e.coinMult * ctx.coinMult);
  if (coins > 0) resources.coins = coins;
  const scrap = rollAmount(t.scrap, e.dropMult);
  if (scrap) resources.scrap = scrap;
  const tech = rollAmount(t.techParts, e.dropMult);
  if (tech) resources.techParts = tech;
  const cores = rollAmount(t.energyCores, 1);
  if (cores) resources.energyCores = cores;

  const items: Item[] = [];
  if (e.isBoss) {
    // Гарантированный редкий+ предмет и случайные дополнительные.
    items.push(
      generateItem({
        rarity: rollRarity(balanceConfig.bossRarityChances),
        source: { kind: 'boss', map: ctx.mapId, boss: e.def.name },
      }),
    );
    const extra = randInt(balanceConfig.bossExtraItems[0], balanceConfig.bossExtraItems[1]);
    for (let i = 0; i < extra; i++) {
      items.push(
        generateItem({
          rarity: rollRarity(balanceConfig.minibossRarityChances),
          source: { kind: 'boss', map: ctx.mapId, boss: e.def.name },
        }),
      );
    }
    // Немного кристаллов и стабилизаторов — их нельзя одинаково получать каждый раз.
    if (chance(0.6)) resources.stabilizers = randInt(1, 2);
    if (chance(0.5)) resources.crystals = randInt(3, 8);
  } else {
    const p = t.item * e.dropMult * ctx.dropChanceMult;
    if (chance(Math.min(1, p))) {
      const table = e.isMiniboss ? balanceConfig.minibossRarityChances : balanceConfig.rarityChances;
      // Элитные роботы немного повышают шанс редких предметов.
      items.push(
        generateItem({
          rarity: rollRarity(table, e.elite ? 0.35 : 0),
          source: { kind: 'drop', map: ctx.mapId, wave: ctx.wave, enemy: e.def.name + (e.elite ? ' (элита)' : '') },
        }),
      );
    }
    if (e.isMiniboss && chance(0.3)) resources.stabilizers = 1;
  }
  return { resources, items };
}
