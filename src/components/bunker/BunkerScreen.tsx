import { useMemo, useRef, useState } from 'react';
import { computeBunkerStats, type BunkerStats, type Warning } from '../../game/bunker/BunkerStats';
import { combatPower, upgradeHints } from '../../game/bunker/compare';
import { balanceConfig } from '../../game/config/balanceConfig';
import { modeConfig } from '../../game/config/gameConfig';
import { rarityIndex } from '../../game/items/ItemRarity';
import { upgradeBlock } from '../../game/items/ItemUpgrade';
import { isEquipped, xpForLevel, type Profile } from '../../game/profile/Profile';
import { RARITIES, SLOT_CATEGORY, type Item, type Rarity, type SlotId } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { colors, rarityColor } from '../../ui/theme';
import { Bar, ResourceStrip } from '../common/Common';
import { CategoryGlyph, ItemIcon, UiIcon } from '../common/Icons';
import { ItemCard } from '../inventory/ItemCard';
import { ItemTile } from '../inventory/ItemRow';
import { MassFuseSheet, PartCard, PartsGrid } from '../parts/Parts';
import { BunkerArt } from './BunkerArt';
import { ConsumableSheet, ConsumableTiles } from '../inventory/Consumables';
import { CONSUMABLES, type ConsumableKey } from '../../game/consumables';
import { Select, Sheet } from '../common/Sheet';
import { MassSellSheet } from './MassSell';


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

function SlotTile({ slot, profile, side, onClick }: { slot: SlotId; profile: Profile; side: 'l' | 'r'; onClick: () => void }) {
  const id = profile.equipment[slot];
  const it = id ? profile.items[id] : null;
  const canUp = it ? !upgradeBlock(profile, it, false) : false;
  const col = it ? rarityColor[it.rarity] : undefined;
  return (
    <button className={`doll-slot ${side}${it ? '' : ' empty'}`} style={col ? { ['--rc' as string]: col } : undefined} onClick={onClick}>
      <span className="doll-socket">
        {it ? (
          <ItemIcon category={it.category} rarity={it.rarity} level={it.level} size={44} />
        ) : (
          <CategoryGlyph category={SLOT_CATEGORY[slot]} color="#4a5560" size={24} />
        )}
        {canUp && (
          <span className="up" title="Можно улучшить">
            <UiIcon kind="up" size={10} />
          </span>
        )}
      </span>
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

const LEFT: SlotId[] = ['coil1', 'generator', 'capacitor', 'converter'];
const RIGHT: SlotId[] = ['coil2', 'cooling', 'sensor', 'shield'];

export function BunkerScreen() {
  const profile = useProfile((s) => s.profile)!;
  const selected = useUi((s) => s.selectedItemId);
  const selectItem = useUi((s) => s.selectItem);
  const equipTarget = useUi((s) => s.equipTarget);
  const setEquipTarget = useUi((s) => s.setEquipTarget);
  const [showStats, setShowStats] = useState(false);
  const [view, setView] = useState<'items' | 'parts'>('items');
  const [partId, setPartId] = useState<string | null>(null);
  const setAutoSell = useProfile((s) => s.setAutoSell);
  const [massSell, setMassSell] = useState(false);
  const [massFuse, setMassFuse] = useState(false);
  const [cons, setCons] = useState<ConsumableKey | null>(null);
  const [kind, setKind] = useState<'all' | 'gear' | 'cons'>('all');
  const freeParts = Object.values(profile.parts).filter((p) => !p.installedIn).length;
  const listRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => computeBunkerStats(profile), [profile]);
  const hints = useMemo(() => upgradeHints(profile), [profile]);
  const power = combatPower(stats);
  const forSlot = equipTarget && !profile.equipment[equipTarget] ? SLOT_CATEGORY[equipTarget] : null;

  const items = useMemo(() => {
    let list = Object.values(profile.items).filter((i) => !isEquipped(profile, i.id));
    if (forSlot) list = list.filter((i) => i.category === forSlot);
    const byRarity = (a: Item, b: Item) => rarityIndex(b.rarity) - rarityIndex(a.rarity) || b.tier - a.tier || b.level - a.level;
    return list.sort((a, b) => (hints.get(b.id)?.gain ?? -1) - (hints.get(a.id)?.gain ?? -1) || byRarity(a, b));
  }, [profile, forSlot, hints]);

  /** Показать на складе предметы для пустого слота. */
  const pickFor = (slot: SlotId) => {
    setEquipTarget(slot);
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

  const stored = Object.keys(profile.items).length - Object.values(profile.equipment).filter(Boolean).length;
  const alarm = stats.warnings.some((w) => w.kind !== 'no_sensor' && w.kind !== 'second_coil_free');

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Бункер</h2>
        <span className="power" title="Боевая мощь">
          <UiIcon kind="bolt" size={15} /> {fmtNum(power)}
        </span>
        <span className="lvl-badge">УР {profile.bunker.level}</span>
        <ResourceStrip />
      </div>
      <div className="screen-body">
        <div className="doll">
          <div className="doll-col">
            {LEFT.map((s) => (
              <SlotTile key={s} slot={s} side="l" profile={profile} onClick={() => openSlot(s)} />
            ))}
          </div>
          <div className="doll-center">
            <BunkerArt profile={profile} highlight={equipTarget} />
          </div>
          <div className="doll-col">
            {RIGHT.map((s) => (
              <SlotTile key={s} slot={s} side="r" profile={profile} onClick={() => openSlot(s)} />
            ))}
          </div>
        </div>

        <button className="doll-stats" onClick={() => setShowStats(true)}>
          <span>
            <i>Урон/с</i>
            <b>{fmtNum(Math.round(stats.sustainedDps))}</b>
          </span>
          <span>
            <i>Прочность</i>
            <b>{fmtNum(stats.maxHp)}</b>
          </span>
          <span>
            <i>Энергия</i>
            <b>{stats.usablePower.toFixed(1)}/с</b>
          </span>
          <span className="more">
            {alarm && <span className="nav-dot" style={{ background: '#ff7a3d', top: 6, right: 6 }} />}
            Все
            <br />
            данные
          </span>
        </button>

        <div ref={listRef} className="tabs storage-tabs">
          <button className={`tab${view === 'items' ? ' on' : ''}`} onClick={() => setView('items')}>
            Склад {stored}/{balanceConfig.inventoryLimit}
            {hints.size > 0 && <span className="tab-up"> ↑{hints.size}</span>}
          </button>
          <button className={`tab${view === 'parts' ? ' on' : ''}`} onClick={() => setView('parts')}>
            Модификации {freeParts}
          </button>
        </div>

        {view === 'parts' && (
          <>
            <div className="storage-actions">
              <button className="btn btn-gold btn-sm grow" onClick={() => setMassFuse(true)}>
                Массовое объединение
              </button>
            </div>
            <PartsGrid onOpen={setPartId} />
          </>
        )}
        {view === 'items' && (
          <>
            <div className="storage-actions">
              <button className="btn btn-rust btn-sm" onClick={() => setMassSell(true)}>
                Продать
              </button>
              <Select
                className="grow"
                title="Автопродажа"
                prefix={<span className="muted">Автопродажа: </span>}
                value={profile.autoSell.maxRarity ?? 'off'}
                onChange={(v) => setAutoSell(v === 'off' ? null : (v as Rarity))}
                options={[
                  { value: 'off', label: 'выкл.', hint: 'Ничего не продаётся автоматически' },
                  ...RARITIES.filter((r) => r !== 'unique').map((r) => ({
                    value: r as string,
                    label: `до «${ru.rarity[r]}»`,
                    color: rarityColor[r],
                    hint: 'Новое оборудование этой редкости и ниже продаётся сразу. Лучшее, чем установлено, и уникальное не продаётся.',
                  })),
                ]}
              />
            </div>
            {!forSlot && (
              <div className="seg kind-tabs">
                {(
                  [
                    ['all', 'Все'],
                    ['gear', 'Оборудование'],
                    ['cons', 'Чертежи и др.'],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} className={kind === id ? 'on' : ''} onClick={() => setKind(id)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {forSlot && equipTarget && (
              <div className="info-box" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="grow">Подходит для слота «{ru.slot[equipTarget]}»</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setEquipTarget(null)}>
                  Весь склад
                </button>
              </div>
            )}
            {!forSlot && kind !== 'gear' && CONSUMABLES.some((k) => profile.resources[k] > 0) && (
              <div className="item-grid" style={{ marginBottom: 7 }}>
                <ConsumableTiles onOpen={setCons} />
              </div>
            )}
            {kind === 'cons' && !forSlot ? (
              !CONSUMABLES.some((k) => profile.resources[k] > 0) && <div className="empty">Чертежи, ключи, стабилизаторы, энергоядра и пропуски выпадают с роботов и боссов.</div>
            ) : items.length === 0 ? (
              <div className="empty">{forSlot ? 'Для этого слота на складе ничего нет. Оборудование выпадает с роботов и боссов.' : 'Здесь появится оборудование, выпавшее с роботов и боссов.'}</div>
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
      {cons && <ConsumableSheet k={cons} onClose={() => setCons(null)} />}
      {massFuse && <MassFuseSheet onClose={() => setMassFuse(false)} />}
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
