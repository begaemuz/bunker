import type { EquipCategory, Rarity, ResourceKey } from '../../game/types';
import { rarityColor } from '../../ui/theme';

// Все игровые иконки — SVG. Цвет и свечение задают редкость.

export function CategoryGlyph({ category, color, size = 26 }: { category: EquipCategory; color: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (category) {
    case 'generator':
      return (
        <svg {...p}>
          <rect x="5" y="9" width="22" height="16" rx="2" />
          <path d="M9 9V6h5v3M18 9V6h5v3" />
          <path d="M17 12l-4 6h5l-3 5" stroke="#ffd24a" />
        </svg>
      );
    case 'coil':
      return (
        <svg {...p}>
          <path d="M8 5h16M8 27h16" />
          <path d="M16 7c6 0 6 3 0 3s-6 3 0 3 6 3 0 3-6 3 0 3 6 3 0 3" />
          <path d="M3 13l3 3-3 3M29 13l-3 3 3 3" strokeWidth="1.5" />
        </svg>
      );
    case 'capacitor':
      return (
        <svg {...p}>
          <path d="M4 16h8M20 16h8" />
          <path d="M12 7v18M20 7v18" strokeWidth="3" />
          <path d="M23 9h4M25 7v4" strokeWidth="1.5" />
        </svg>
      );
    case 'converter':
      return (
        <svg {...p}>
          <circle cx="11" cy="16" r="6" />
          <circle cx="21" cy="16" r="6" />
          <path d="M2 16h3M27 16h3" />
        </svg>
      );
    case 'cooling':
      return (
        <svg {...p}>
          <path d="M16 3v26M5 9.5l22 13M27 9.5l-22 13" />
          <path d="M13 5l3 3 3-3M13 27l3-3 3 3" strokeWidth="1.5" />
        </svg>
      );
    case 'sensor':
      return (
        <svg {...p}>
          <path d="M6 26a14 14 0 0 1 0-20" />
          <path d="M11 22a8 8 0 0 1 0-12" />
          <circle cx="17" cy="16" r="3" fill={color} />
          <path d="M17 16l11-7" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...p}>
          <path d="M16 3l11 4v8c0 7-5 12-11 14C10 27 5 22 5 15V7z" />
          <path d="M11 15l4 4 7-7" />
        </svg>
      );
  }
}

/** Иконка модификации (детали). */
export function PartGlyph({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round">
      <rect x="8" y="8" width="16" height="16" rx="2" />
      <rect x="12" y="12" width="8" height="8" rx="1" fill={color} fillOpacity="0.35" />
      <path d="M12 8V4M16 8V4M20 8V4M12 28v-4M16 28v-4M20 28v-4M8 12H4M8 16H4M8 20H4M28 12h-4M28 16h-4M28 20h-4" strokeWidth="1.6" />
    </svg>
  );
}

export function ItemIcon({ category, rarity, level, size = 44 }: { category: EquipCategory; rarity: Rarity; level?: number; size?: number }) {
  const col = rarityColor[rarity];
  const strong = rarity === 'legendary' || rarity === 'epic' || rarity === 'unique';
  return (
    <div
      className="item-icon"
      style={{
        width: size,
        height: size,
        borderColor: col,
        boxShadow: strong ? `0 0 12px ${col}66, inset 0 0 14px ${col}33` : `inset 0 0 8px ${col}22`,
      }}
    >
      <CategoryGlyph category={category} color={col} size={Math.round(size * 0.62)} />
      {level !== undefined && <span className="item-lvl">{level}</span>}
    </div>
  );
}

const resColors: Record<ResourceKey, string> = {
  coins: '#e0b23a',
  scrap: '#9aa4ad',
  techParts: '#6fd3ff',
  blueprints: '#4d8dff',
  energyCores: '#b46bff',
  crystals: '#4dffd2',
  stabilizers: '#5fd16a',
  bossPasses: '#ff4d6a',
  expansionKeys: '#f2b53a',
};

export function ResourceIcon({ type, size = 14 }: { type: ResourceKey; size?: number }) {
  const c = resColors[type];
  const p = { width: size, height: size, viewBox: '0 0 16 16' };
  switch (type) {
    case 'coins':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6.5" fill={c} stroke="#6b5212" />
          <rect x="6" y="5" width="4" height="6" fill="none" stroke="#6b5212" strokeWidth="1.4" />
        </svg>
      );
    case 'techParts':
      return (
        <svg {...p}>
          <path d="M8 1.5l1.4 2.2 2.5-.6.3 2.6 2.3 1.2-1.4 2.2 1 2.4-2.5.6-.6 2.5-2.4-1-2.2 1.4-1.2-2.3-2.6-.3.6-2.5L1.5 8l2.2-1.4-.6-2.5 2.6-.3L6.6 1.5z" fill={c} />
          <circle cx="8" cy="8" r="2.2" fill="#0d0f12" />
        </svg>
      );
    case 'blueprints':
      return (
        <svg {...p}>
          <rect x="2" y="2" width="12" height="12" rx="1.5" fill={c} />
          <path d="M4 5h8M4 8h5M4 11h7" stroke="#cfe0ff" strokeWidth="1" />
        </svg>
      );
    case 'energyCores':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.5" />
          <circle cx="8" cy="8" r="3" fill={c} />
        </svg>
      );
    case 'crystals':
      return (
        <svg {...p}>
          <path d="M8 1l5 5-5 9-5-9z" fill={c} stroke="#1a6b5a" />
          <path d="M3 6h10" stroke="#1a6b5a" />
        </svg>
      );
    case 'scrap':
      return (
        <svg {...p}>
          <path d="M2 11l3-6 4 2 2-4 3 5-2 5H4z" fill={c} stroke="#3d4248" />
        </svg>
      );
    case 'stabilizers':
      return (
        <svg {...p}>
          <path d="M8 1l6 2.5v4C14 11 11 14 8 15 5 14 2 11 2 7.5v-4z" fill={c} stroke="#1f5a24" />
          <path d="M5 8l2 2 4-4" stroke="#0d0f12" strokeWidth="1.6" fill="none" />
        </svg>
      );
    case 'expansionKeys':
      return (
        <svg {...p}>
          <circle cx="5" cy="8" r="3.5" fill="none" stroke={c} strokeWidth="2" />
          <path d="M8.5 8H15M12 8v3M14.5 8v2" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'bossPasses':
      return (
        <svg {...p}>
          <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" fill={c} />
          <circle cx="5.5" cy="8" r="2" fill="#2a0810" />
          <path d="M9 6.5h4M9 9.5h3" stroke="#2a0810" strokeWidth="1.2" />
        </svg>
      );
  }
}

type UiKind = 'shop' | 'gift' | 'battle' | 'bunker' | 'inventory' | 'tech' | 'map' | 'menu' | 'pause' | 'play' | 'close' | 'skull' | 'lock' | 'up' | 'bolt' | 'refresh';

export function UiIcon({ kind, size = 22 }: { kind: UiKind; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'battle':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
          <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
        </svg>
      );
    case 'shop':
      return (
        <svg {...p}>
          <path d="M4 8h16l-1.5 12h-13z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...p}>
          <rect x="3" y="9" width="18" height="12" rx="1.5" />
          <path d="M3 13h18M12 9v12" />
          <path d="M12 9c-2-4-7-4-6-1s6 1 6 1c0 0 5 2 6-1s-4-3-6 1" />
        </svg>
      );
    case 'bunker':
      return (
        <svg {...p}>
          <path d="M3 20h18M5 20v-7a7 7 0 0 1 14 0v7" />
          <path d="M9 20v-4h6v4" />
          <path d="M12 3v3M7 5l1.5 2M17 5l-1.5 2" />
        </svg>
      );
    case 'inventory':
      return (
        <svg {...p}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
        </svg>
      );
    case 'tech':
      return (
        <svg {...p}>
          <path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3L14 9V3" />
          <path d="M7.5 14h9" />
        </svg>
      );
    case 'map':
      return (
        <svg {...p}>
          <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...p}>
          <path d="M8 5v14M16 5v14" strokeWidth="3" />
        </svg>
      );
    case 'play':
      return (
        <svg {...p}>
          <path d="M7 4l13 8-13 8z" fill="currentColor" />
        </svg>
      );
    case 'close':
      return (
        <svg {...p}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'skull':
      return (
        <svg {...p}>
          <path d="M12 3a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14z" />
          <circle cx="9" cy="11" r="1.6" fill="currentColor" />
          <circle cx="15" cy="11" r="1.6" fill="currentColor" />
          <path d="M10 20v-2M14 20v-2" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...p}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      );
    case 'up':
      return (
        <svg {...p}>
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M13.5 2 4 14h6.5L9 22l10-13h-6.8z" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...p}>
          <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />
        </svg>
      );
  }
}
