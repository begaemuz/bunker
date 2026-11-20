import { ResonanceInfo } from '../parts/Parts';
import { ELEMENTS } from '../../game/types';
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
import { Bar } from '../common/Common';
import { CategoryGlyph, ItemIcon, ResourceIcon, UiIcon } from '../common/Icons';
import { ItemCard } from '../inventory/ItemCard';
import { ItemTile } from '../inventory/ItemRow';
import { PartCard, PartsGrid } from '../parts/Parts';
import { MassAssembleSheet, MassDismantleSheet } from '../parts/MassParts';
import { BunkerArt } from './BunkerArt';
import { itemQuality } from '../../game/items/ItemGenerator';
import { qualityColor } from '../inventory/Roll';
import { ConsumableSheet, ConsumableTiles } from '../inventory/Consumables';
import { CONSUMABLES, type ConsumableKey } from '../../game/consumables';
import { Sheet } from '../common/Sheet';
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
        {it && (
          <span className="slot-q" style={{ color: qualityColor(itemQuality(it)) }}>
            {Math.round(itemQuality(it) * 100)}%
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
              Уровень открывает исследования и повышает предел улучшения оборудования (сейчас до {Math.min(10, lvl + balanceConfig.item.levelOverBunker)}, максимум 10).
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

          <div className="section-title">Резонанс стихий</div>
          <div className="reso-grid">
            {ELEMENTS.map((el) => (
              <ResonanceInfo key={el} el={el} />
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

type SortKey = 'better' | 'quality' | 'rarity' | 'level' | 'tier' | 'new';
const SORTS: [SortKey, string, string][] = [
  ['better', 'Сначала лучшие', 'Вещи, которые лучше установленных, — первыми'],
  ['quality', 'По качеству', 'От самого высокого процента к низкому'],
  ['rarity', 'По редкости', 'Уникальные и легендарные сверху'],
  ['level', 'По уровню улучшения', 'Самые прокачанные сверху'],
  ['tier', 'По тех. уровню', 'Т7 → Т1'],
  ['new', 'Сначала новые', 'Недавно полученные сверху'],
];

const LEFT: SlotId[] = ['coil1', 'generator', 'capacitor', 'converter'];
const RIGHT: SlotId[] = ['coil2', 'cooling', 'sensor', 'shield'];

export function BunkerScreen() {
  const profile = useProfile((s) => s.profile)!;
  const selected = useUi((s) => s.selectedItemId);
  const selectItem = useUi((s) => s.selectItem);
  const equipTarget = useUi((s) => s.equipTarget);
  const setEquipTarget = useUi((s) => s.setEquipTarget);
  const [showStats, setShowStats] = useState(false);
  const [partId, setPartId] = useState<string | null>(null);
  const setAutoSell = useProfile((s) => s.setAutoSell);
  const [massSell, setMassSell] = useState(false);
  const [massScrap, setMassScrap] = useState(false);
  const [cons, setCons] = useState<ConsumableKey | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [massDismantle, setMassDismantle] = useState(false);
  const [massAssemble, setMassAssemble] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('better');
  const [kind, setKind] = useState<'all' | 'gear' | 'parts' | 'cons'>('all');
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
    const q = new Map(list.map((i) => [i.id, itemQuality(i)]));
    const cmp: Record<SortKey, (a: Item, b: Item) => number> = {
      better: (a, b) => (hints.get(b.id)?.gain ?? -1) - (hints.get(a.id)?.gain ?? -1) || byRarity(a, b),
      quality: (a, b) => q.get(b.id)! - q.get(a.id)! || byRarity(a, b),
      rarity: byRarity,
      level: (a, b) => b.level - a.level || byRarity(a, b),
      tier: (a, b) => b.tier - a.tier || byRarity(a, b),
      new: (a, b) => b.obtainedAt - a.obtainedAt,
    };
    return list.sort(cmp[sortKey]);
  }, [profile, forSlot, hints, sortKey]);

  /** Показать на складе предметы для пустого слота. */
  const pickFor = (slot: SlotId) => {
    setEquipTarget(slot);
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
            <button className="bunker-info" onClick={() => setShowStats(true)} aria-label="Все данные бункера">
              <UiIcon kind="info" size={18} />
              {alarm && <span className="bunker-info-dot" />}
            </button>
          </div>
          <div className="doll-col">
            {RIGHT.map((s) => (
              <SlotTile key={s} slot={s} side="r" profile={profile} onClick={() => openSlot(s)} />
            ))}
          </div>
        </div>


        <div ref={listRef} className="storage-head">
          <div className="grow">
            <div className="storage-name">
              Склад {stored}/{balanceConfig.inventoryLimit}
            </div>
            {kind === 'parts' ? (
              <div className="small muted">
                <ResourceIcon type="components" /> {fmtNum(profile.resources.components)} компонентов
              </div>
            ) : (
              hints.size > 0 && <div className="tab-up small">↑ {hints.size} лучше установленного</div>
            )}
          </div>
          {(kind === 'gear' || forSlot) && (
            <>
              <button className="btn btn-sm" onClick={() => setMassScrap(true)}>
                Разобрать
              </button>
              <button className="btn btn-rust btn-sm" onClick={() => setMassSell(true)}>
                Продать
              </button>
            </>
          )}
          {kind === 'parts' && !forSlot && (
            <>
              <button className="btn btn-rust btn-sm" onClick={() => setMassDismantle(true)}>
                Разобрать
              </button>
              <button className="btn btn-gold btn-sm" onClick={() => setMassAssemble(true)}>
                Собрать
              </button>
            </>
          )}
          <button className="btn btn-sm gear-btn" onClick={() => setSortOpen(true)} aria-label="Сортировка">
            <UiIcon kind="filter" size={18} />
            {sortKey !== 'better' && <span className="gear-dot" style={{ background: '#f2a93b' }} />}
          </button>
          {kind !== 'parts' && kind !== 'cons' && (
            <button className="btn btn-sm gear-btn" onClick={() => setAutoOpen(true)} aria-label="Автопродажа">
              <UiIcon kind="menu" size={18} />
              {profile.autoSell.maxRarity && <span className="gear-dot" style={{ background: rarityColor[profile.autoSell.maxRarity] }} />}
            </button>
          )}
        </div>
        {forSlot && equipTarget ? (
          <div className="info-box" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="grow">Подходит для слота «{ru.slot[equipTarget]}»</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setEquipTarget(null)}>
              Весь склад
            </button>
          </div>
        ) : (
          <div className="seg kind-tabs">
            {(
              [
                ['all', 'Все'],
                ['gear', 'Вещи'],
                ['parts', `Модификации${freeParts ? ` ${freeParts}` : ''}`],
                ['cons', 'Чертежи и др.'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={kind === id ? 'on' : ''} onClick={() => setKind(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {(() => {
          const k = forSlot ? 'gear' : kind;
          const showGear = k === 'all' || k === 'gear';
          const showParts = k === 'all' || k === 'parts';
          const showCons = k === 'all' || k === 'cons';
          const hasCons = CONSUMABLES.some((x) => profile.resources[x] > 0);
          const empty = !(showGear && items.length) && !(showParts && freeParts) && !(showCons && hasCons);
          if (empty)
            return (
              <div className="empty">
                {forSlot
                  ? 'Для этого слота на складе ничего нет. Оборудование выпадает с роботов и боссов.'
                  : k === 'parts'
                    ? 'Модификации выпадают с роботов и боссов. Вставляются в оборудование, три одинаковые можно объединить в более редкую.'
                    : k === 'cons'
                      ? 'Чертежи, ключи, стабилизаторы, энергоядра и пропуски выпадают с роботов и боссов.'
                      : 'Здесь появятся вещи, выпавшие с роботов и боссов.'}
              </div>
            );
          return (
            <div className="item-grid">
              {showGear && items.map((it) => <ItemTile key={it.id} item={it} better={hints.has(it.id)} onClick={() => selectItem(it.id)} />)}
              {showParts && <PartsGrid bare onOpen={setPartId} sort={sortKey} />}
              {showCons && <ConsumableTiles onOpen={setCons} />}
            </div>
          );
        })()}
      </div>

      {massSell && <MassSellSheet onClose={() => setMassSell(false)} hints={hints} />}
      {massScrap && <MassSellSheet mode="dismantle" onClose={() => setMassScrap(false)} hints={hints} />}
      {massDismantle && <MassDismantleSheet onClose={() => setMassDismantle(false)} />}
      {massAssemble && <MassAssembleSheet onClose={() => setMassAssemble(false)} />}
      {sortOpen && (
        <Sheet title="Сортировка склада" onClose={() => setSortOpen(false)}>
          <div className="option-list">
            {SORTS.map(([k, label, hint]) => (
              <button
                key={k}
                className={`option${sortKey === k ? ' on' : ''}`}
                onClick={() => {
                  setSortKey(k);
                  setSortOpen(false);
                }}
              >
                <span className="radio" />
                <span className="grow">
                  <span style={{ fontWeight: 800 }}>{label}</span>
                  <span className="small muted" style={{ display: 'block' }}>
                    {hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {autoOpen && (
        <Sheet title="Автопродажа" onClose={() => setAutoOpen(false)}>
          <div className="small muted" style={{ marginBottom: 10 }}>
            Новые вещи выбранной редкости и ниже продаются сразу при выпадении. Лучшие, чем установленные, и уникальные не продаются. Модификации и расходники не продаются никогда.
          </div>
          <div className="option-list">
            {[null, ...RARITIES.filter((r) => r !== 'unique' && r !== 'mythic')].map((r) => (
              <button
                key={r ?? 'off'}
                className={`option${profile.autoSell.maxRarity === r ? ' on' : ''}`}
                onClick={() => {
                  setAutoSell(r as Rarity | null);
                  setAutoOpen(false);
                }}
              >
                <span className="radio" />
                <span className="grow" style={{ color: r ? rarityColor[r] : undefined, fontWeight: 800 }}>
                  {r ? `До «${ru.rarity[r]}» включительно` : 'Выключена'}
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {cons && <ConsumableSheet k={cons} onClose={() => setCons(null)} />}
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
