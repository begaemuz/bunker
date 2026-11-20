import type { ReactNode } from 'react';

/** Цвет качества броска: от серого к золотому. */
export function qualityColor(q: number): string {
  if (q >= 0.95) return '#ffd06a';
  if (q >= 0.75) return '#7be38a';
  if (q >= 0.4) return '#9aa4ad';
  return '#ff8a7a';
}

/**
 * Строка характеристики со значением, диапазоном «мин – макс» и полоской
 * качества: видно, насколько удачно выпало свойство.
 */
export function RollLine({
  label,
  value,
  valueClass,
  min,
  max,
  quality,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClass?: string;
  min?: string;
  max?: string;
  quality?: number;
}) {
  const has = quality !== undefined && min !== undefined && max !== undefined;
  return (
    <div className="roll-line">
      <div className="roll-top">
        <span>{label}</span>
        <span className={valueClass}>{value}</span>
      </div>
      {has && (
        <div className="roll-range">
          <span className="roll-bar">
            <i style={{ width: `${Math.max(4, quality! * 100)}%`, background: qualityColor(quality!) }} />
          </span>
          <span className="roll-mm">
            {min} – {max}
          </span>
          <span className="roll-q" style={{ color: qualityColor(quality!) }}>
            {Math.round(quality! * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

export function qualityWord(q: number): string {
  if (q >= 0.95) return 'Идеал';
  if (q >= 0.85) return 'Отличное';
  if (q >= 0.7) return 'Хорошее';
  if (q >= 0.45) return 'Среднее';
  return 'Слабое';
}

/** Круглый индикатор общего качества вещи или модификации. */
export function QualityBadge({ q }: { q: number }) {
  const col = qualityColor(q);
  const R = 20;
  const C = 2 * Math.PI * R;
  return (
    <div className="qbadge" title="Общее качество: насколько близко все свойства к максимуму">
      <svg width="50" height="50" viewBox="0 0 50 50" aria-hidden>
        <circle cx="25" cy="25" r={R} fill="#0b0e11" stroke="#262d34" strokeWidth="5" />
        <circle cx="25" cy="25" r={R} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${C * Math.max(0.02, q)} ${C}`} transform="rotate(-90 25 25)" />
        <text x="25" y="29" textAnchor="middle" fontSize="12" fill={col} style={{ fontFamily: 'var(--display)' }}>
          {Math.round(q * 100)}%
        </text>
      </svg>
      <span style={{ color: col }}>{qualityWord(q)}</span>
    </div>
  );
}
