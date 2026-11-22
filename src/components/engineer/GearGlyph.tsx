import type { GearKind } from '../../game/engineer/types';

/** Значок вида снаряжения инженера (контур цветом редкости). */
export function GearGlyph({ kind, color, size = 28 }: { kind: GearKind; color: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const fill = { fill: color, fillOpacity: 0.18 };
  switch (kind) {
    case 'weapon':
      return (
        <svg {...p}>
          <path d="M3 12h17l3-3h5v8h-5l-3-2h-4l-2 9H8l1.5-9H3z" {...fill} />
          <path d="M23 13h5" />
          <circle cx="18" cy="12" r="1.2" fill={color} />
        </svg>
      );
    case 'helmet':
      return (
        <svg {...p}>
          <path d="M5 20a11 11 0 0 1 22 0v3H5z" {...fill} />
          <path d="M9 17h14v4H9z" />
          <path d="M16 9v4" />
        </svg>
      );
    case 'armor':
      return (
        <svg {...p}>
          <path d="M10 4l-6 4 2 7 3-1v14h14V14l3 1 2-7-6-4c-1 3-3 4-6 4s-5-1-6-4z" {...fill} />
          <path d="M12 18h8M12 22h8" />
        </svg>
      );
    case 'pants':
      return (
        <svg {...p}>
          <path d="M8 4h16l2 24h-7l-3-14-3 14H6z" {...fill} />
          <path d="M8 8h16" />
        </svg>
      );
    case 'boots':
      return (
        <svg {...p}>
          <path d="M8 4h9v14l9 4v5H6v-5z" {...fill} />
          <path d="M6 24h20M8 10h9" />
        </svg>
      );
    case 'amulet':
      return (
        <svg {...p}>
          <path d="M8 4l8 12 8-12" />
          <path d="M16 15l6 6-6 7-6-7z" {...fill} />
          <circle cx="16" cy="21.5" r="1.6" fill={color} />
        </svg>
      );
    case 'ring':
      return (
        <svg {...p}>
          <circle cx="16" cy="19" r="8" {...fill} />
          <circle cx="16" cy="19" r="4.5" />
          <path d="M12.5 8l3.5-4 3.5 4-3.5 3z" fill={color} />
        </svg>
      );
  }
}
