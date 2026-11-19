import type { DamageType, Rarity } from '../game/types';

export const rarityColor: Record<Rarity, string> = {
  common: '#a8b0b8',
  uncommon: '#5fd16a',
  rare: '#4da3ff',
  epic: '#b46bff',
  legendary: '#ff9f2e',
};

export const damageColor: Record<DamageType, string> = {
  electric: '#6fd3ff',
  fire: '#ff7a3d',
  kinetic: '#c9c2b6',
  energy: '#ff5a8a',
  cold: '#9fe6ff',
  radiation: '#a6ff4d',
  dot: '#ffb347',
  explosive: '#ff9a3c',
};

export const colors = {
  energy: '#3fc8ff',
  energyDim: '#1b6f96',
  rust: '#c2622d',
  hp: '#d6463a',
  xp: '#e0b23a',
  text: '#eef2f5',
  muted: '#8a949c',
};
