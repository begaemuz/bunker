import type { EquipCategory, Rarity, ResourceKey } from '../../game/types';
import { rarityColor } from '../../ui/theme';

// Все игровые иконки — SVG. Цвет и свечение задают редкость.

export function CategoryGlyph({ category, color, size = 26 }: { category: EquipCategory; color: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round' as const };
  switch (category) {
    case 'generator':
      return (
        <svg {...common}>
          <rect x="5" y="9" width="22" height="16" rx="2" />
          <path d="M9 9V6h5v3M18 9V6h5v3" />
          <path d="M17 12l-4 6h5l-3 5" stroke="#ffd24a" />
        </svg>
      );
    case 'coil':
      return (
        <svg {...common}>
          <path d="M8 6h16M8 26h16" />
          <path d="M10 8c6 0 6 3 0 3s-6 3 0 3 6 3 0 3-6 3 0 3 6 3 0 3" transform="translate(6 0)" />
          <circle cx="16" cy="16" r="2" fill={color} />
        </svg>
      );
    case 'capacitor':
      return (
        <svg {...common}>
          <path d="M4 16h8M20 16h8" />
          <path d="M12 7v18M20 7v18" strokeWidth="3" />
          <path d="M23 9h4M25 7v4" strokeWidth="1.5" />
        </svg>
      );
    case 'reactor':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="11" />
          <circle cx="16" cy="16" r="3" fill={color} />
          <path d="M16 13l-3-7a10 10 0 0 1 6 0zM18.6 17.5l7 2.5a10 10 0 0 1-3 5.2zM13.4 17.5l-4.1 6.2a10 10 0 0 1-3-5.2z" fill={color} fillOpacity="0.5" />
        </svg>
      );
  }
}

export function ItemIcon({ category, rarity, level, size = 42 }: { category: EquipCategory; rarity: Rarity; level?: number; size?: number }) {
  const col = rarityColor[rarity];
  return (
    <div
      className="item-icon"
      style={{
        width: size,
        height: size,
        borderColor: col,
        boxShadow: rarity === 'legendary' || rarity === 'epic' ? `0 0 10px ${col}55, inset 0 0 12px ${col}33` : `inset 0 0 8px ${col}22`,
      }}
    >
      <CategoryGlyph category={category} color={col} size={Math.round(size * 0.62)} />
      {level !== undefined && <span className="item-lvl">{level}</span>}
    </div>
  );
}

const resColors: Record<ResourceKey, string> = {
  coins: '#e0b23a',
  techParts: '#6fd3ff',
  energyCores: '#b46bff',
  crystals: '#4dffd2',
  scrap: '#9aa4ad',
  stabilizers: '#5fd16a',
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
  }
}

type NavKind = 'battle' | 'inventory' | 'equipment' | 'menu' | 'pause' | 'play' | 'close' | 'back';

export function UiIcon({ kind, size = 22 }: { kind: NavKind; size?: number }) {
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
    case 'inventory':
      return (
        <svg {...p}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
        </svg>
      );
    case 'equipment':
      return (
        <svg {...p}>
          <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
          <path d="M13 7l-3 5h4l-3 5" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...p}>
          <path d="M4 6h16M4 12h16M4 18h16" />
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
    case 'back':
      return (
        <svg {...p}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      );
  }
}
