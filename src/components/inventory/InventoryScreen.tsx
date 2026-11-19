import { useMemo, useState } from 'react';
import { balanceConfig } from '../../game/config/balanceConfig';
import { rarityIndex } from '../../game/items/ItemRarity';
import { isEquipped } from '../../game/profile/Profile';
import { EQUIP_CATEGORIES, RESOURCE_KEYS, type EquipCategory, type Item } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ResourceIcon } from '../common/Icons';
import { ItemCard } from './ItemCard';
import { ItemRow } from './ItemRow';

type Tab = 'equipment' | 'parts' | 'resources' | 'protection' | 'special' | 'history';
type Sort = 'rarity' | 'level' | 'new';

const tabs: { id: Tab; label: string }[] = [
  { id: 'equipment', label: 'Оборудование' },
  { id: 'parts', label: 'Детали' },
  { id: 'resources', label: 'Ресурсы' },
  { id: 'protection', label: 'Защита' },
  { id: 'special', label: 'Особые' },
  { id: 'history', label: 'История' },
];

export function InventoryScreen() {
  const profile = useProfile((s) => s.profile)!;
  const selected = useUi((s) => s.selectedItemId);
  const selectItem = useUi((s) => s.selectItem);
  const [tab, setTab] = useState<Tab>('equipment');
  const [cat, setCat] = useState<EquipCategory | 'all'>('all');
  const [sort, setSort] = useState<Sort>('rarity');

  const items = useMemo(() => {
    let list = Object.values(profile.items);
    if (cat !== 'all') list = list.filter((i) => i.category === cat);
    const cmp: Record<Sort, (a: Item, b: Item) => number> = {
      rarity: (a, b) => rarityIndex(b.rarity) - rarityIndex(a.rarity) || b.level - a.level || b.obtainedAt - a.obtainedAt,
      level: (a, b) => b.level - a.level || rarityIndex(b.rarity) - rarityIndex(a.rarity),
      new: (a, b) => b.obtainedAt - a.obtainedAt,
    };
    return list.sort(cmp[sort]);
  }, [profile.items, cat, sort]);

  const total = Object.keys(profile.items).length;

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Инвентарь</h2>
        <span className="small muted">
          {total} / {balanceConfig.inventoryLimit}
        </span>
      </div>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'equipment' && (
        <>
          <div className="toolbar">
            <select className="select" value={cat} onChange={(e) => setCat(e.target.value as EquipCategory | 'all')}>
              <option value="all">Все категории</option>
              {EQUIP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {ru.categoryPlural[c]}
                </option>
              ))}
            </select>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="rarity">По редкости</option>
              <option value="level">По уровню</option>
              <option value="new">Сначала новые</option>
            </select>
          </div>
          <div className="screen-body" style={{ paddingTop: 0 }}>
            {items.length === 0 ? (
              <div className="empty">Нет оборудования этой категории. Оно выпадает с роботов и боссов.</div>
            ) : (
              items.map((it) => <ItemRow key={it.id} item={it} equipped={isEquipped(profile, it.id)} onClick={() => selectItem(it.id)} />)
            )}
          </div>
        </>
      )}

      {tab === 'parts' && (
        <div className="screen-body">
          <div className="empty">
            Деталей пока нет.
            <br />
            Детали устанавливаются в слоты оборудования и усиливают его. Количество слотов видно в карточке предмета.
          </div>
        </div>
      )}

      {tab === 'resources' && (
        <div className="screen-body">
          {RESOURCE_KEYS.map((k) => (
            <div key={k} className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              <ResourceIcon type={k} size={28} />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{ru.resource[k]}</div>
                <div className="small muted">{ru.resourceHint[k]}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtNum(profile.resources[k])}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'protection' && (
        <div className="screen-body">
          <div className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ResourceIcon type="stabilizers" size={32} />
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Стабилизатор улучшения</div>
              <div className="small muted">
                Гарантированно предотвращает уничтожение предмета при неудачном улучшении. Не повышает шанс успеха,
                расходуется при каждой попытке.
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>×{profile.resources.stabilizers}</div>
          </div>
        </div>
      )}

      {tab === 'special' && (
        <div className="screen-body">
          <div className="empty">
            Особых предметов пока нет.
            <br />
            Сюда попадут ключи расширения слотов и уникальные детали боссов.
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="screen-body">
          {profile.history.length === 0 ? (
            <div className="empty">История пуста.</div>
          ) : (
            profile.history.map((h, i) => (
              <div key={i} className="stat-line">
                <span>
                  <span style={{ color: rarityColor[h.rarity] }}>{h.itemName}</span>
                  <br />
                  <span className="small muted">
                    {new Date(h.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {h.detail ? ` · ${h.detail}` : ''}
                  </span>
                </span>
                <span className={h.action === 'obtained' ? 'pos' : 'muted'}>
                  {h.action === 'obtained' ? 'получен' : h.action === 'sold' ? 'продан' : 'разобран'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {selected && <ItemCard itemId={selected} onClose={() => selectItem(null)} />}
    </div>
  );
}
