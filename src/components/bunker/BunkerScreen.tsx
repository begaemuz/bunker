import { useMemo, useRef, useState } from 'react';
import { computeBunkerStats, type BunkerStats, type Warning } from '../../game/bunker/BunkerStats';
import { upgradeHints } from '../../game/bunker/compare';
import { balanceConfig } from '../../game/config/balanceConfig';
import { modeConfig } from '../../game/config/gameConfig';
import { rarityIndex } from '../../game/items/ItemRarity';
import { upgradeBlock } from '../../game/items/ItemUpgrade';
import { isEquipped, xpForLevel, type Profile } from '../../game/profile/Profile';
import { EQUIP_CATEGORIES, RARITIES, SLOT_CATEGORY, type EquipCategory, type Item, type Rarity, type SlotId } from '../../game/types';
import { ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { colors, rarityColor } from '../../ui/theme';
import { Bar } from '../common/Common';
import { CategoryGlyph, ItemIcon, UiIcon } from '../common/Icons';
import { ItemCard } from '../inventory/ItemCard';
import { ItemTile } from '../inventory/ItemRow';
import { PartCard, PartsGrid } from '../parts/Parts';
import { Select, Sheet } from '../common/Sheet';
import { MassSellSheet } from './MassSell';

const GRID: SlotId[] = ['generator', 'coil1', 'coil2', 'capacitor', 'converter', 'cooling', 'sensor', 'shield'];
type Sort = 'better' | 'rarity' | 'tier' | 'new';

function warningText(w: Warning): string {
  switch (w.kind) {
    case 'no_generator':
      return 'Нет генератора: катушкам нечем питаться.';
    case 'no_coil':
      return 'Не установлено ни одной катушки — бункер не может атаковать.';
    case 'passive_deficit':
      return `Генератор не тянет даже постоянные модули: охлаждение, сенсоры и защита работают на ${Math.round(w.efficiency * 100)}%.`;
    case 'energy_limit':
      return `Энергии хватает на ${Math.round(w.factor * 100)}% темпа катушек. Нужен генератор мощнее, преобразователь или накопитель с быстрой зарядкой.`;
    case 'heat_limit':
      return `Охлаждение покрывает ${Math.round(w.factor * 100)}% нагрева — катушки будут перегреваться.`;
    case 'no_sensor':
      return 'Нет сенсорного комплекса: цели не опознаются, бонус урона и поражение узлов недоступны.';
    case 'second_coil_free':
      return 'Слот катушки №2 свободен. Вторая катушка работает одновременно с первой.';
  }
}

function SlotTile({ slot, profile, onClick }: { slot: SlotId; profile: Profile; onClick: () => void }) {
  const id = profile.equipment[slot];
  const it = id ? profile.items[id] : null;
  const canUp = it ? !upgradeBlock(profile, it, false) : false;
  return (
    <button
      className={`slot-tile${it ? '' : ' empty'}`}
      style={it ? { borderColor: rarityColor[it.rarity], boxShadow: `inset 0 0 14px ${rarityColor[it.rarity]}22` } : undefined}
      onClick={onClick}
    >
      {canUp && (
        <span className="up" title="Можно улучшить">
          <UiIcon kind="up" size={11} />
        </span>
      )}
      {it ? (
        <ItemIcon category={it.category} rarity={it.rarity} level={it.level} size={40} />
      ) : (
        <div className="item-icon" style={{ width: 40, height: 40, borderColor: '#2c343d', borderStyle: 'dashed' }}>
          <CategoryGlyph category={SLOT_CATEGORY[slot]} color="#46515c" size={22} />
        </div>
      )}
      <span className="sname">{ru.slotShort[slot]}</span>
    </button>
  );
}

function StatsSheet({ profile, stats, onClose }: { profile: Profile; stats: BunkerStats; onClose: () => void }) {
  const lvl = profile.bunker.level;
  return (
    <Sheet title="Характеристики" onClose={onClose}>
        <div>
          <div className="panel">
            <div className="hud-row">
              <span className="lvl-badge">УР {lvl}</span>
              <div className="grow">
                <Bar value={profile.bunker.xp} max={xpForLevel(lvl)} color={colors.xp} thin />
              </div>
              <span>
                {Math.floor(profile.bunker.xp)} / {xpForLevel(lvl)}
              </span>
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>
              Уровень открывает исследования и повышает предел улучшения оборудования (сейчас до {lvl + balanceConfig.item.levelOverBunker}).
            </div>
          </div>

          <div className="section-title">Состояние комплекса</div>
          <div className="warn-list">
            {stats.warnings.length === 0 && <div className="warn-item ok">Все системы обеспечены энергией и охлаждением.</div>}
            {stats.warnings.map((w, i) => (
              <div key={i} className="warn-item">
                {warningText(w)}
              </div>
            ))}
          </div>

          <div className="section-title">Катушки</div>
          {stats.coils.length === 0 && <div className="empty">Катушки не установлены.</div>}
          {stats.coils.map((c) => (
            <div key={c.slot} className="panel" style={{ marginBottom: 6, borderLeft: `3px solid ${modeConfig[c.mode].color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b>{ru.slot[c.slot]}</b>
                <span style={{ color: modeConfig[c.mode].color, fontWeight: 800, fontSize: 12 }}>{modeConfig[c.mode].name}</span>
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                Мощность {c.power.toFixed(0)} · радиус {c.radius.toFixed(0)} · раз в {c.interval.toFixed(2)} с · {c.energyPerSec.toFixed(1)} эн/с · нагрев {c.heatPerSec.toFixed(1)}/с
              </div>
              {c.effects.length > 0 && (
                <div className="small" style={{ marginTop: 4 }}>
                  {c.effects.map((e) => `${ru.effect[e.kind]} ${Math.round(e.chance * 100)}%`).join(' · ')}
                </div>
              )}
            </div>
          ))}

          <div className="section-title">Показатели</div>
          <div className="bunker-stats">
            <div className="bstat">
              <div className="k">Устойчивый DPS</div>
              <div className="v">{stats.sustainedDps.toFixed(0)}</div>
            </div>
            <div className="bstat">
              <div className="k">Прочность</div>
              <div className="v">{stats.maxHp}</div>
            </div>
            <div className="bstat">
              <div className="k">Полезная мощность</div>
              <div className="v">{stats.usablePower.toFixed(1)}/с</div>
              <div className="small muted">
                {stats.generation.toFixed(1)} × КПД {Math.round(stats.conversion * 100)}%
              </div>
            </div>
            <div className="bstat">
              <div className="k">Потребление</div>
              <div className="v">{(stats.passiveDrain + stats.coils.reduce((s, c) => s + c.energyPerSec, 0)).toFixed(1)}/с</div>
              <div className="small muted">модули {stats.passiveDrain.toFixed(1)} + катушки</div>
            </div>
            <div className="bstat">
              <div className="k">Накопитель</div>
              <div className="v">{stats.capacity.toFixed(0)}</div>
              <div className="small muted">
                зарядка {stats.chargeRate.toFixed(0)}/с · разряд +{Math.round(stats.dischargeBonus * 100)}%
              </div>
            </div>
            <div className="bstat">
              <div className="k">Охлаждение</div>
              <div className="v">{stats.coolRate.toFixed(1)}/с</div>
              <div className="small muted">запас тепла {stats.heatCap.toFixed(0)}</div>
            </div>
            <div className="bstat">
              <div className="k">Снижение урона</div>
              <div className="v">{Math.round(stats.damageReduction * 100)}%</div>
              <div className="small muted">ремонт {stats.regen.toFixed(1)}/с</div>
            </div>
            <div className="bstat">
              <div className="k">Сенсоры</div>
              <div className="v">{stats.detectRange > 0 ? stats.detectRange.toFixed(0) : '—'}</div>
              <div className="small muted">
                +{Math.round((stats.identifiedBonus + stats.markBonus) * 100)}% по опознанным · узлы {Math.round(stats.critChance * 100)}%
              </div>
            </div>
          </div>
        </div>
    </Sheet>
  );
}

export function BunkerScreen() {
  const profile = useProfile((s) => s.profile)!;
  const selected = useUi((s) => s.selectedItemId);
  const selectItem = useUi((s) => s.selectItem);
  const equipTarget = useUi((s) => s.equipTarget);
  const setEquipTarget = useUi((s) => s.setEquipTarget);
  const [showStats, setShowStats] = useState(false);
  const [cat, setCat] = useState<EquipCategory | 'all'>('all');
  const [rar, setRar] = useState<Rarity | 'all'>('all');
  const [sort, setSort] = useState<Sort>('better');
  const [view, setView] = useState<'items' | 'parts'>('items');
  const [partId, setPartId] = useState<string | null>(null);
  const setAutoSell = useProfile((s) => s.setAutoSell);
  const [massSell, setMassSell] = useState(false);
  const freeParts = Object.values(profile.parts).filter((p) => !p.installedIn).length;
  const listRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => computeBunkerStats(profile), [profile]);
  const hints = useMemo(() => upgradeHints(profile), [profile]);

  const items = useMemo(() => {
    let list = Object.values(profile.items).filter((i) => !isEquipped(profile, i.id));
    if (cat !== 'all') list = list.filter((i) => i.category === cat);
    if (rar !== 'all') list = list.filter((i) => i.rarity === rar);
    const byRarity = (a: Item, b: Item) => rarityIndex(b.rarity) - rarityIndex(a.rarity) || b.tier - a.tier || b.level - a.level;
    const cmp: Record<Sort, (a: Item, b: Item) => number> = {
      better: (a, b) => (hints.get(b.id)?.gain ?? -1) - (hints.get(a.id)?.gain ?? -1) || byRarity(a, b),
      rarity: byRarity,
      tier: (a, b) => b.tier - a.tier || byRarity(a, b),
      new: (a, b) => b.obtainedAt - a.obtainedAt,
    };
    return list.sort(cmp[sort]);
  }, [profile, cat, rar, sort, hints]);

  /** Показать на складе предметы для слота. */
  const pickFor = (slot: SlotId) => {
    setEquipTarget(slot);
    setCat(SLOT_CATEGORY[slot]);
    setView('items');
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openSlot = (slot: SlotId) => {
    const id = profile.equipment[slot];
    if (id) {
      setEquipTarget(slot);
      selectItem(id);
    } else pickFor(slot);
  };

  const total = Object.keys(profile.items).length;

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Бункер</h2>
        <button className="btn btn-sm stats-fab" onClick={() => setShowStats(true)}>
          Характеристики
          {stats.warnings.some((w) => w.kind !== 'no_sensor' && w.kind !== 'second_coil_free') && <span className="nav-dot" style={{ background: '#ff7a3d', top: -2, right: -2 }} />}
        </button>
        <span className="lvl-badge">УР {profile.bunker.level}</span>
      </div>
      <div className="screen-body">
        <div className="section-title" style={{ marginTop: 0 }}>
          <span>Установлено</span>
          <span>DPS {stats.sustainedDps.toFixed(0)} · прочность {stats.maxHp}</span>
        </div>
        <div className="equip-grid">
          {GRID.map((s) => (
            <SlotTile key={s} slot={s} profile={profile} onClick={() => openSlot(s)} />
          ))}
        </div>

        <div ref={listRef} className="seg" style={{ marginTop: 14, marginBottom: 8 }}>
          <button className={view === 'items' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setView('items')}>
            Склад {total - Object.values(profile.equipment).filter(Boolean).length}/{balanceConfig.inventoryLimit}
            {hints.size > 0 && <span style={{ color: '#7be38a' }}> ↑{hints.size}</span>}
          </button>
          <button className={view === 'parts' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setView('parts')}>
            Модификации {freeParts}
          </button>
        </div>
        {view === 'parts' && <PartsGrid onOpen={setPartId} />}
        {view === 'items' && (
        <>
        <div className="toggle-row" style={{ marginBottom: 8, padding: '6px 10px' }}>
          <span className="small">
            <b>Автопродажа</b>
            <br />
            <span className="muted">новое оборудование до выбранной редкости (лучшее и уникальное не продаётся)</span>
          </span>
          <Select
            title="Автопродажа"
            value={profile.autoSell.maxRarity ?? 'off'}
            onChange={(v) => setAutoSell(v === 'off' ? null : (v as Rarity))}
            options={[
              { value: 'off', label: 'Выкл.', hint: 'Ничего не продаётся автоматически' },
              ...RARITIES.filter((r) => r !== 'unique').map((r) => ({
                value: r as string,
                label: `до «${ru.rarity[r]}»`,
                color: rarityColor[r],
                hint: 'Новое оборудование этой редкости и ниже продаётся сразу',
              })),
            ]}
          />
        </div>
        {equipTarget && cat === SLOT_CATEGORY[equipTarget] && (
          <div className="info-box" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="grow">Выберите оборудование для слота «{ru.slot[equipTarget]}»</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEquipTarget(null);
                setCat('all');
              }}
            >
              Все
            </button>
          </div>
        )}
        <div className="tabs" style={{ padding: '0 0 8px' }}>
          <button className={`tab${cat === 'all' ? ' on' : ''}`} onClick={() => setCat('all')}>
            Все
          </button>
          {EQUIP_CATEGORIES.map((c) => (
            <button key={c} className={`tab${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
              {ru.category[c]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <Select
            className="grow"
            title="Редкость"
            value={rar}
            onChange={(v) => setRar(v)}
            options={[{ value: 'all' as Rarity | 'all', label: 'Любая редкость' }, ...RARITIES.map((r) => ({ value: r as Rarity | 'all', label: ru.rarity[r], color: rarityColor[r] }))]}
          />
          <Select
            className="grow"
            title="Сортировка"
            value={sort}
            onChange={(v) => setSort(v)}
            options={[
              { value: 'better', label: 'Сначала лучшие' },
              { value: 'rarity', label: 'По редкости' },
              { value: 'tier', label: 'По тех. уровню' },
              { value: 'new', label: 'Сначала новые' },
            ]}
          />
          <button className="btn btn-rust btn-sm" onClick={() => setMassSell(true)}>
            Продать…
          </button>
        </div>
        {items.length === 0 ? (
          <div className="empty">Здесь появится оборудование, выпавшее с роботов и боссов.</div>
        ) : (
          <div className="item-grid">
            {items.map((it) => (
              <ItemTile key={it.id} item={it} better={hints.has(it.id)} onClick={() => selectItem(it.id)} />
            ))}
          </div>
        )}
        </>
        )}
      </div>

      {massSell && <MassSellSheet onClose={() => setMassSell(false)} hints={hints} />}
      {partId && <PartCard partId={partId} onClose={() => setPartId(null)} />}
      {showStats && <StatsSheet profile={profile} stats={stats} onClose={() => setShowStats(false)} />}
      {selected && (
        <ItemCard
          itemId={selected}
          onClose={() => selectItem(null)}
          onReplace={(slot) => {
            selectItem(null);
            pickFor(slot);
          }}
        />
      )}
    </div>
  );
}
