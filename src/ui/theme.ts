import type { AttackType, CoilMode, Rarity } from '../game/types';
import { modeConfig } from '../game/config/gameConfig';

export const rarityColor: Record<Rarity, string> = {
  common: '#a8b0b8',
  uncommon: '#5fd16a',
  rare: '#4da3ff',
  epic: '#b46bff',
  legendary: '#ff9f2e',
  unique: '#ff4d6a',
};

export const modeColor = (m: CoilMode | 'dot'): string => (m === 'dot' ? '#ffb347' : modeConfig[m].color);

export const attackColor: Record<AttackType, string> = {
  kinetic: '#c9c2b6',
  explosive: '#ff9a3c',
  energy: '#ff5a8a',
};

export const colors = {
  energy: '#3fc8ff',
  energyDim: '#1b6f96',
  heat: '#ff7a3d',
  rust: '#c2622d',
  hp: '#d6463a',
  xp: '#e0b23a',
  text: '#eef2f5',
  muted: '#8a949c',
};
