import { balanceConfig } from '../config/balanceConfig';
import type { EnemyKind } from '../config/enemiesConfig';
import type { MapDef } from '../config/mapsConfig';
import { chance, pickWeighted } from '../rng';

export interface SpawnEntry {
  kind: EnemyKind;
  elite: boolean;
}

export interface WavePlan {
  wave: number;
  isBoss: boolean;
  spawns: SpawnEntry[];
  interval: number;
}

export function eliteChance(wave: number, difficulty: number): number {
  const w = balanceConfig.waves;
  return Math.min(0.35, (w.eliteBase + w.elitePerWave * (wave - 1)) * difficulty);
}

export function enemyCount(wave: number, difficulty: number): number {
  const w = balanceConfig.waves;
  return Math.round((w.baseCount + w.countPerWave * (wave - 1)) * Math.sqrt(difficulty));
}

/** Составляет план волны: какие роботы и с каким интервалом появятся. */
export function generateWave(map: MapDef, wave: number): WavePlan {
  const w = balanceConfig.waves;
  const isBoss = wave > map.wavesBeforeBoss;
  const spawns: SpawnEntry[] = [];

  if (isBoss) {
    spawns.push({ kind: map.boss, elite: false });
    for (const esc of map.bossEscort) {
      for (let i = 0; i < esc.count; i++) spawns.push({ kind: esc.kind, elite: false });
    }
    return { wave, isBoss, spawns, interval: 0.6 };
  }

  const pool = map.enemies.filter((e) => e.fromWave <= wave);
  const count = enemyCount(wave, map.difficulty);
  const elite = eliteChance(wave, map.difficulty);
  for (let i = 0; i < count; i++) {
    const u = pickWeighted(pool, (e) => e.weight);
    spawns.push({ kind: u.kind, elite: chance(elite) });
  }
  // Мини-босс приходит в середине волны.
  if (map.minibossWaves.includes(wave)) {
    spawns.splice(Math.floor(spawns.length / 2), 0, { kind: 'miniboss', elite: false });
  }
  const interval = Math.max(w.spawnIntervalMin, w.spawnIntervalBase - w.spawnIntervalPerWave * (wave - 1));
  return { wave, isBoss, spawns, interval };
}
