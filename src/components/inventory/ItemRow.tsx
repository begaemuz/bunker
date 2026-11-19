import type { Item } from '../../game/types';
import { formatStatValue } from '../../game/items/statInfo';
import { itemModifiers } from '../../game/items/ItemGenerator';
import { ru, statLabel } from '../../i18n/ru';
import { rarityColor } from '../../ui/theme';
import { ItemIcon } from '../common/Icons';

export function SlotDots({ item }: { item: Item }) {
  if (item.slots.length === 0) return null;
  return (
    <span className="slot-dots" title="Слоты деталей">
      {item.slots.map((s, i) => (
        <span key={i} className={`slot-dot${s.locked ? ' locked' : ''}`} />
      ))}
    </span>
  );
}

/** Краткая строка главных характеристик. */
export function shortStats(item: Item, max = 3): string {
  return itemModifiers(item)
    .slice(0, max)
    .map((m) => `${statLabel(m.stat)} ${formatStatValue(m.stat, m.value)}`)
    .join(' · ');
}

export function ItemRow({ item, equipped, onClick }: { item: Item; equipped?: boolean; onClick: () => void }) {
  const col = rarityColor[item.rarity];
  return (
    <button className="item-row" style={{ borderLeftColor: col }} onClick={onClick}>
      <ItemIcon category={item.category} rarity={item.rarity} level={item.level} />
      <div className="grow">
        <div className="item-name" style={{ color: col }}>
          {item.name}
          {equipped && <span className="tag">Уст.</span>}
        </div>
        <div className="item-sub">
          {ru.rarity[item.rarity]} · {ru.category[item.category].toLowerCase()} · ур. {item.level}/{item.maxLevel}{' '}
          <SlotDots item={item} />
        </div>
        <div className="item-stats">{shortStats(item)}</div>
      </div>
    </button>
  );
}
