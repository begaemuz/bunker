import type { EnemyKind } from './enemiesConfig';

export interface WaveUnlock {
  kind: Exclude<EnemyKind, 'boss' | 'miniboss'>;
  fromWave: number;
  weight: number;
}

export interface MapDef {
  id: number;
  name: string;
  biome: string;
  /** Обычных волн до босса. Босс приходит на волне wavesBeforeBoss + 1. */
  wavesBeforeBoss: number;
  /** Множитель сложности карты. */
  difficulty: number;
  /** Волны, на которых появляется мини-босс. */
  minibossWaves: number[];
  enemies: WaveUnlock[];
  boss: EnemyKind;
  /** Сопровождение босса. */
  bossEscort: { kind: EnemyKind; count: number }[];
  palette: {
    ground: string;
    groundAlt: string;
    debris: string;
    accent: string;
  };
}

/**
 * Карты кампании. На этапах 1–2 доступна первая карта,
 * остальные биомы добавляются на этапе 5 (прогрессия).
 */
export const mapsConfig: MapDef[] = [
  {
    id: 1,
    name: 'Разрушенный город',
    biome: 'city',
    wavesBeforeBoss: 10,
    difficulty: 1,
    minibossWaves: [5, 10],
    enemies: [
      { kind: 'light', fromWave: 1, weight: 10 },
      { kind: 'kamikaze', fromWave: 2, weight: 3 },
      { kind: 'heavy', fromWave: 3, weight: 3 },
      { kind: 'ranged', fromWave: 4, weight: 3 },
      { kind: 'support', fromWave: 6, weight: 2 },
    ],
    boss: 'boss',
    bossEscort: [
      { kind: 'heavy', count: 3 },
      { kind: 'light', count: 8 },
      { kind: 'support', count: 2 },
    ],
    palette: {
      ground: '#16181b',
      groundAlt: '#1d2024',
      debris: '#2b2f35',
      accent: '#3a3128',
    },
  },
];

export function getMap(id: number): MapDef {
  return mapsConfig.find((m) => m.id === id) ?? mapsConfig[0];
}
