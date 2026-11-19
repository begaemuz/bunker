import { useMemo, useState } from 'react';
import { balanceConfig } from '../../game/config/balanceConfig';
import { rarityIndex } from '../../game/items/ItemRarity';
import { isEquipped } from '../../game/profile/Profile';
import { EQUIP_CATEGORIES, RARITIES, RESOURCE_KEYS, SLOT_CATEGORY, type EquipCategory, type Item, type Rarity } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ResourceIcon } from '../common/Icons';
import { ItemCard } from './ItemCard';
import { ItemRow } from './ItemRow';

type Tab = 'equipment' | 'resources' | 'mods' | 'history';
type Sort = 'rarity' | 'level' | 'tier' | 'new';

const tabs: { id: Tab; label: string }[] = [
  { id: 'equipment', label: 'Оборудование' },
  { id: 'resources', label: 'Ресурсы' },
  { id: 'mods', label: 'Модификации' },
  { id: 'history', label: 'История' },
];

export function InventoryScreen() {
  const profile = useProfile((s) => s.profile)!;
  const selected = useUi((s) => s.selectedItemId);
  const selectItem = useUi((s) => s.selectItem);
  const equipTarget = useUi((s) => s.equipTarget);
  const [tab, setTab] = useState<Tab>('equipment');
  const [cat, setCat] = useState<EquipCategory | 'all'>(equipTarget ? SLOT_CATEGORY[equipTarget] : 'all');
  const [rar, setRar] = useState<Rarity | 'all'>('all');
  const [sort, setSort] = useState<Sort>('rarity');
  const [hideEquipped, setHideEquipped] = useState(false);

  const items = useMemo(() => {
    let list = Object.values(profile.items);
    if (cat !== 'all') list = list.filter((i) => i.category === cat);
    if (rar !== 'all') list = list.filter((i) => i.rarity === rar);
    if (hideEquipped) list = list.filter((i) => !isEquipped(profile, i.id));
    const cmp: Record<Sort, (a: Item, b: Item) => number> = {
      rarity: (a, b) => rarityIndex(b.rarity) - rarityIndex(a.rarity) || b.tier - a.tier || b.level - a.level,
      level: (a, b) => b.level - a.level || rarityIndex(b.rarity) - rarityIndex(a.rarity),
      tier: (a, b) => b.tier - a.tier || rarityIndex(b.rarity) - rarityIndex(a.rarity),
      new: (a, b) => b.obtainedAt - a.obtainedAt,
    };
    return list.sort(cmp[sort]);
  }, [profile, cat, rar, sort, hideEquipped]);

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Склад</h2>
        <span className="small muted">
          {Object.keys(profile.items).length} / {balanceConfig.inventoryLimit}
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
          {equipTarget && (
            <div className="info-box" style={{ margin: '8px 10px 0' }}>
              Выберите оборудование для слота «{ru.slot[equipTarget]}»
            </div>
          )}
          <div className="toolbar">
            <select className="select" value={cat} onChange={(e) => setCat(e.target.value as EquipCategory | 'all')}>
              <option value="all">Все типы</option>
              {EQUIP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {ru.category[c]}
                </option>
              ))}
            </select>
            <select className="select" value={rar} onChange={(e) => setRar(e.target.value as Rarity | 'all')}>
              <option value="all">Любая редкость</option>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {ru.rarity[r]}
                </option>
              ))}
            </select>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="rarity">По редкости</option>
              <option value="tier">По тех. уровню</option>
              <option value="level">По уровню</option>
              <option value="new">Сначала новые</option>
            </select>
            <button className={`tab${hideEquipped ? ' on' : ''}`} onClick={() => setHideEquipped(!hideEquipped)}>
              Скрыть установленное
            </button>
          </div>
          <div className="screen-body" style={{ paddingTop: 0 }}>
            {items.length === 0 ? (
              <div className="empty">Ничего не найдено. Оборудование выпадает с роботов и боссов.</div>
            ) : (
              items.map((it) => <ItemRow key={it.id} item={it} equipped={isEquipped(profile, it.id)} onClick={() => selectItem(it.id)} />)
            )}
          </div>
        </>
      )}

      {tab === 'resources' && (
        <div className="screen-body">
          {RESOURCE_KEYS.map((k) => (
            <div key={k} className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              <ResourceIcon type={k} size={28} />
              <div className="grow">
                <div style={{ fontWeight: 800 }}>{ru.resource[k]}</div>
                <div className="small muted">{ru.resourceHint[k]}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{fmtNum(profile.resources[k])}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'mods' && (
        <div className="screen-body">
          <div className="empty">
            Модификаций пока нет.
            <br />
            Они устанавливаются в слоты оборудования (видны в карточке предмета) и объединяются по три одинаковых.
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
                <span className={h.action === 'obtained' || h.action === 'upgraded' ? 'pos' : h.action === 'destroyed' ? 'neg' : 'muted'}>
                  {{ obtained: 'получено', sold: 'продано', scrapped: 'разобрано', upgraded: 'улучшено', destroyed: 'уничтожено' }[h.action]}
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
