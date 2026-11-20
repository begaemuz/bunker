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
