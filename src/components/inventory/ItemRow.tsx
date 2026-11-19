import { modeConfig } from '../../game/config/gameConfig';
import { coilProps, itemModifiers } from '../../game/items/ItemGenerator';
import { formatStatValue } from '../../game/items/statInfo';
import type { Item } from '../../game/types';
import { ru, statLabel } from '../../i18n/ru';
import { rarityColor } from '../../ui/theme';
import { CategoryGlyph, ItemIcon } from '../common/Icons';

export function SlotDots({ item }: { item: Item }) {
  if (item.slots.length === 0) return null;
  return (
    <span className="slot-dots" title="Слоты модификаций">
      {item.slots.map((s, i) => (
        <span key={i} className={`slot-dot${s.locked ? ' locked' : ''}`} />
      ))}
    </span>
  );
}

/** Краткая строка главных характеристик. */
export function shortStats(item: Item, max = 3): string {
  const c = coilProps(item);
  if (c) {
    return `${modeConfig[c.mode].short} · мощность ${Math.round(c.power)} · радиус ${Math.round(c.radius)} · ${c.interval.toFixed(2)} с`;
  }
  return itemModifiers(item)
    .slice(0, max)
    .map((m) => `${statLabel(m.stat)} ${formatStatValue(m.stat, m.value)}`)
    .join(' · ');
}

export function ItemRow({ item, equipped, better, onClick }: { item: Item; equipped?: boolean; better?: number; onClick: () => void }) {
  const col = rarityColor[item.rarity];
  return (
    <button className="item-row" style={{ borderLeftColor: col }} onClick={onClick}>
      <div style={{ position: 'relative' }}>
        <ItemIcon category={item.category} rarity={item.rarity} level={item.level} />
        {better !== undefined && (
          <span className="better-arrow" title="Лучше установленного">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V5M5 11l7-7 7 7" />
            </svg>
          </span>
        )}
      </div>
      <div className="grow">
        <div className="item-name" style={{ color: col }}>
          {item.name}
          {equipped && <span className="tag">Уст.</span>}
        </div>
        <div className="item-sub">
          {ru.rarity[item.rarity]} · Т{item.tier} · ур. {item.level} <SlotDots item={item} />
        </div>
        <div className="item-stats">{shortStats(item)}</div>
        {better !== undefined && (
          <div className="small" style={{ color: 'var(--good)', fontWeight: 800 }}>
            {better >= 1 ? 'Свободный слот — установите' : `Лучше установленного: +${Math.max(1, Math.round(better * 100))}% к мощи комплекса`}
          </div>
        )}
      </div>
    </button>
  );
}

/** Квадратная плитка предмета для сетки склада. */
export function ItemTile({ item, better, onClick }: { item: Item; better?: boolean; onClick: () => void }) {
  const col = rarityColor[item.rarity];
  return (
    <button
      className="item-tile"
      style={{ borderColor: col, boxShadow: `inset 0 0 18px ${col}2a${item.rarity === 'legendary' || item.rarity === 'unique' ? `, 0 0 10px ${col}55` : ''}` }}
      onClick={onClick}
    >
      <span className="tile-glyph">
        <CategoryGlyph category={item.category} color={col} size={34} />
      </span>
      <span className="tile-lvl">{item.level}</span>
      <span className="tile-tier">Т{item.tier}</span>
      {better && (
        <span className="tile-better" title="Лучше установленного">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V5M5 11l7-7 7 7" />
          </svg>
        </span>
      )}
      <span className="tile-name" style={{ color: col }}>
        {item.name}
      </span>
    </button>
  );
}
