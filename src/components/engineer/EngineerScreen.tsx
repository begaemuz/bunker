import { useMemo, useState } from 'react';
import engineerFull from '../../assets/engineer-full.webp';
import {
  craftCoins,
  craftPreview,
  engineerLevel,
  engineerStats,
  GEAR_DEFS,
  gearSellPrice,
  gearSlotOf,
  PERCENT_STATS,
  slotKind,
  statPointsFree,
  statPointsSpent,
} from '../../game/engineer/Engineer';
import { ENG_STATS, GEAR_KINDS, type EngStat, type Gear, type GearKind, type GearSlot, type GearStatKey } from '../../game/engineer/types';
import { itemQuality } from '../../game/items/ItemGenerator';
import { rarityIndex } from '../../game/items/ItemRarity';
import { isEquipped, xpForLevel } from '../../game/profile/Profile';
import type { EquipCategory, Item } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ItemIcon, ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { qualityColor } from '../inventory/Roll';
import { GearGlyph } from './GearGlyph';

const LEFT: GearSlot[] = ['weapon', 'helmet', 'armor', 'pants'];
const RIGHT: GearSlot[] = ['boots', 'amulet', 'ring1', 'ring2'];

const SLOT_NAME: Record<GearSlot, string> = {
  weapon: 'Оружие',
  helmet: 'Шлем',
  armor: 'Броня',
  pants: 'Штаны',
  boots: 'Обувь',
  amulet: 'Амулет',
  ring1: 'Кольцо',
  ring2: 'Кольцо',
};

const STAT_INFO: Record<EngStat, { name: string; hint: string }> = {
  str: { name: 'Сила', hint: '+3% урона оружия за единицу' },
  end: { name: 'Выносливость', hint: '+20 жизней за единицу' },
  agi: { name: 'Ловкость', hint: '+0,3% крита и +0,2% уклонения за единицу' },
  int: { name: 'Интеллект', hint: '+1% к силе навыков (навыки скоро)' },
};

const GEAR_STAT: Record<GearStatKey, string> = {
  damage: 'Урон',
  hp: 'Жизни',
  armor: 'Броня',
  crit: 'Крит',
  dodge: 'Уклонение',
  str: 'Сила',
  end: 'Выносливость',
  agi: 'Ловкость',
  int: 'Интеллект',
};

const fmtGearStat = (key: GearStatKey, v: number) => (PERCENT_STATS.includes(key) ? `+${String(v).replace('.', ',')}%` : `+${fmtNum(v)}`);

type Tab = 'stats' | 'gear' | 'craft';
const TAB_KEY = 'bls-eng-tab';
function savedTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return v === 'gear' || v === 'craft' ? v : 'stats';
  } catch {
    return 'stats';
  }
}

export function EngineerScreen() {
  const profile = useProfile((s) => s.profile)!;
  const [tab, setTabState] = useState<Tab>(savedTab);
  const [gearId, setGearId] = useState<string | null>(null);
  const [slotPick, setSlotPick] = useState<GearSlot | null>(null);
  const [crafting, setCrafting] = useState<GearKind | null>(null);
  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* хранилище недоступно */
    }
  };
  const lvl = engineerLevel(profile);
  const free = statPointsFree(profile);

  const openSlot = (slot: GearSlot) => {
    const id = profile.engineer.equip[slot];
    if (id) setGearId(id);
    else setSlotPick(slot);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Инженер</h2>
        <span className="lvl-badge">УР {lvl}</span>
      </div>
      <div className="screen-body">
        <div className="doll">
          <div className="doll-col">
            {LEFT.map((s) => (
              <GearSlotTile key={s} slot={s} onClick={() => openSlot(s)} />
            ))}
          </div>
          <div className="doll-center eng-center">
            <img className="eng-figure" src={engineerFull} alt="" draggable={false} />
            <div className="eng-xp">
              <div className="eng-xp-fill" style={{ width: `${Math.min(100, (profile.bunker.xp / xpForLevel(lvl)) * 100)}%` }} />
              <span>
                Опыт {fmtNum(Math.floor(profile.bunker.xp))} / {fmtNum(xpForLevel(lvl))}
              </span>
            </div>
          </div>
          <div className="doll-col">
            {RIGHT.map((s) => (
              <GearSlotTile key={s} slot={s} onClick={() => openSlot(s)} />
            ))}
          </div>
        </div>

        <div className="seg quest-tabs" style={{ margin: '14px 0 10px' }}>
          {(
            [
              ['stats', 'Характеристики'],
              ['gear', 'Снаряжение'],
              ['craft', 'Мастерская'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
              {id === 'stats' && free > 0 && <span className="eng-tab-badge">{free}</span>}
            </button>
          ))}
        </div>

        {tab === 'stats' && <StatsTab />}
        {tab === 'gear' && <GearTab onOpen={setGearId} />}
        {tab === 'craft' && <CraftTab onCraft={setCrafting} />}
      </div>

      {gearId && profile.engineer.gear[gearId] && <GearCard gear={profile.engineer.gear[gearId]} onClose={() => setGearId(null)} />}
      {slotPick && <SlotPicker slot={slotPick} onClose={() => setSlotPick(null)} onCraft={(k) => (setSlotPick(null), setTab('craft'), setCrafting(k))} />}
      {crafting && <CraftSheet kind={crafting} onClose={() => setCrafting(null)} onDone={(id) => (setCrafting(null), setGearId(id))} />}
    </div>
  );
}

function GearSlotTile({ slot, onClick }: { slot: GearSlot; onClick: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const id = profile.engineer.equip[slot];
  const g = id ? profile.engineer.gear[id] : null;
  const col = g ? rarityColor[g.rarity] : undefined;
  return (
    <button className={`doll-slot${g ? '' : ' empty'}`} style={col ? { ['--rc' as string]: col } : undefined} onClick={onClick}>
      <span className="doll-socket">
        <GearGlyph kind={slotKind(slot)} color={col ?? '#4a5560'} size={g ? 36 : 26} />
        {g && (
          <span className="slot-q" style={{ color: qualityColor(g.quality) }}>
            {Math.round(g.quality * 100)}%
          </span>
        )}
      </span>
      <span className="sname">{SLOT_NAME[slot]}</span>
    </button>
  );
}

function StatsTab() {
  const profile = useProfile((s) => s.profile)!;
  const add = useProfile((s) => s.engAddPoints);
  const reset = useProfile((s) => s.engResetPoints);
  const toast = useUi((s) => s.toast);
  const st = useMemo(() => engineerStats(profile), [profile]);
  const free = statPointsFree(profile);
  const spent = statPointsSpent(profile);
  const resets = profile.resources.statResets;
  const pct = (v: number) => `${(Math.round(v * 1000) / 10).toString().replace('.', ',')}%`;
  const summary: [string, string][] = [
    ['Жизни', fmtNum(st.hp)],
    ['Урон', fmtNum(st.damage)],
    ['Броня', fmtNum(st.armor)],
    ['Крит', pct(st.crit)],
    ['Уклонение', pct(st.dodge)],
    ['Сила навыков', `+${pct(st.skillPower)}`],
  ];
  return (
    <>
      <div className="eng-summary">
        {summary.map(([k, v]) => (
          <div key={k} className="eng-sum">
            <span className="small muted">{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="section-title">
        <span>Характеристики</span>
        <span style={{ color: free > 0 ? 'var(--amber)' : undefined }}>Свободно очков: {free}</span>
      </div>
      <div className="eng-attrs">
        {ENG_STATS.map((k) => (
          <div key={k} className="eng-attr">
            <div className="grow">
              <div className="eng-attr-name">
                {STAT_INFO[k].name} <b>{st.attrs[k]}</b>
              </div>
              <div className="small muted">{STAT_INFO[k].hint}</div>
            </div>
            <button className="btn btn-sm" disabled={free < 1} onClick={() => add(k, 1)}>
              +1
            </button>
            <button className="btn btn-sm btn-gold" disabled={free < 5} onClick={() => add(k, 5)}>
              +5
            </button>
          </div>
        ))}
      </div>
      <div className="eng-row" style={{ marginTop: 10, alignItems: 'center', gap: 8 }}>
        <span className="small muted grow">
          {POINTS_HINT} Сбросов: <ResourceIcon type="statResets" /> {resets}
        </span>
        <button
          className="btn btn-sm"
          disabled={spent === 0}
          onClick={() => {
            if (resets < 1) return toast('Нужен «Сброс характеристик» — есть в магазине за кристаллы', 'bad');
            if (reset()) toast('Очки возвращены', 'good');
          }}
        >
          Сбросить
        </button>
      </div>
      <div className="info-box" style={{ marginTop: 12 }}>
        Инженер управляет бункером. Скоро — навыки и арена: инженер будет сражаться с другими игроками своим оружием и снаряжением. На бой бункера характеристики инженера не влияют.
      </div>
    </>
  );
}

const POINTS_HINT = '5 очков за каждый уровень.';

function GearTab({ onOpen }: { onOpen: (id: string) => void }) {
  const profile = useProfile((s) => s.profile)!;
  const list = Object.values(profile.engineer.gear).sort(
    (a, b) => Number(!!gearSlotOf(profile, b.id)) - Number(!!gearSlotOf(profile, a.id)) || rarityIndex(b.rarity) - rarityIndex(a.rarity) || b.tier - a.tier || b.quality - a.quality,
  );
  if (!list.length) return <div className="empty">Снаряжения пока нет. Его создают в «Мастерской» из оборудования бункера по свиткам.</div>;
  return (
    <div className="item-grid">
      {list.map((g) => (
        <GearTile key={g.id} gear={g} equipped={!!gearSlotOf(profile, g.id)} onClick={() => onOpen(g.id)} />
      ))}
    </div>
  );
}

function GearTile({ gear, equipped, onClick }: { gear: Gear; equipped?: boolean; onClick: () => void }) {
  const col = rarityColor[gear.rarity];
  return (
    <button className="item-tile bare gear-tile" style={{ ['--rc' as string]: col }} onClick={onClick}>
      <span className="tile-glyph">
        <GearGlyph kind={gear.kind} color={col} size={44} />
      </span>
      {equipped && <span className="gear-on">надето</span>}
      <span className="tile-tier">
        Т{gear.tier} · <b style={{ color: qualityColor(gear.quality) }}>{Math.round(gear.quality * 100)}%</b>
      </span>
      <span className="tile-name" style={{ color: col }}>
        {gear.name}
      </span>
    </button>
  );
}

function GearCard({ gear, onClose }: { gear: Gear; onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const equip = useProfile((s) => s.engEquip);
  const unequip = useProfile((s) => s.engUnequip);
  const sell = useProfile((s) => s.engSell);
  const toast = useUi((s) => s.toast);
  const slot = gearSlotOf(profile, gear.id);
  const col = rarityColor[gear.rarity];
  return (
    <Sheet
      onClose={onClose}
      head={
        <div className="eng-row" style={{ alignItems: 'center', gap: 10 }}>
          <GearGlyph kind={gear.kind} color={col} size={40} />
          <div>
            <div className="sheet-title" style={{ color: col }}>
              {gear.name}
            </div>
            <div className="small muted">
              {ru.rarity[gear.rarity]} · Т{gear.tier} · качество <b style={{ color: qualityColor(gear.quality) }}>{Math.round(gear.quality * 100)}%</b>
            </div>
          </div>
        </div>
      }
      actions={
        <>
          {!slot && (
            <button
              className="btn"
              onClick={() => {
                const r = sell(gear.id);
                if (r !== null) toast(`Продано: +${fmtNum(r)} монет`, 'good');
                onClose();
              }}
            >
              Продать +{fmtNum(gearSellPrice(gear))}
            </button>
          )}
          {slot ? (
            <button className="btn grow" onClick={() => (unequip(slot), onClose())}>
              Снять
            </button>
          ) : (
            <button className="btn btn-gold grow" onClick={() => (equip(gear.id), onClose())}>
              Надеть
            </button>
          )}
        </>
      }
    >
      <div className="eng-gear-stats">
        {gear.stats.map((s) => (
          <div key={s.key} className="eng-kv">
            <span className="muted">{GEAR_STAT[s.key]}</span>
            <b>{fmtGearStat(s.key, s.value)}</b>
          </div>
        ))}
      </div>
      {gear.kind === 'ring' && slot && <div className="small muted" style={{ marginTop: 8 }}>Колец можно надеть два.</div>}
    </Sheet>
  );
}

/** Пустой слот: выбрать подходящее снаряжение или перейти в мастерскую. */
function SlotPicker({ slot, onClose, onCraft }: { slot: GearSlot; onClose: () => void; onCraft: (k: GearKind) => void }) {
  const profile = useProfile((s) => s.profile)!;
  const equip = useProfile((s) => s.engEquip);
  const kind = slotKind(slot);
  const list = Object.values(profile.engineer.gear)
    .filter((g) => g.kind === kind && !gearSlotOf(profile, g.id))
    .sort((a, b) => rarityIndex(b.rarity) - rarityIndex(a.rarity) || b.tier - a.tier || b.quality - a.quality);
  return (
    <Sheet title={SLOT_NAME[slot]} subtitle="Слот пуст" onClose={onClose}>
      {list.length ? (
        <div className="item-grid">
          {list.map((g) => (
            <GearTile key={g.id} gear={g} onClick={() => (equip(g.id, slot), onClose())} />
          ))}
        </div>
      ) : (
        <>
          <div className="empty">Нет снаряжения для этого слота.</div>
          <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => onCraft(kind)}>
            Создать в мастерской: {GEAR_DEFS[kind].name}
          </button>
        </>
      )}
    </Sheet>
  );
}

/** Состав рецепта: каждое название отдельным узлом, чтобы оно переводилось. */
const inputText = (kind: GearKind) =>
  Object.entries(GEAR_DEFS[kind].inputs).map(([c, n], i) => (
    <span key={c}>
      {i > 0 && ' + '}
      {n! > 1 && `${n}× `}
      <span>{ru.category[c as EquipCategory]}</span>
    </span>
  ));

function CraftTab({ onCraft }: { onCraft: (k: GearKind) => void }) {
  const profile = useProfile((s) => s.profile)!;
  const buy = useProfile((s) => s.engBuyScroll);
  const toast = useUi((s) => s.toast);
  return (
    <>
      <div className="small muted" style={{ marginBottom: 10 }}>
        Снаряжение создаётся по свитку из оборудования бункера. Качество результата выпадает в диапазоне качества вложенных вещей, тех. уровень и редкость —
        средние по ним. Свитки выпадают с боссов или покупаются за кристаллы.
      </div>
      <div className="eng-recipes">
        {GEAR_KINDS.map((k) => {
          const def = GEAR_DEFS[k];
          const have = profile.resources[def.scroll];
          return (
            <div key={k} className="eng-recipe">
              <GearGlyph kind={k} color="#c9d1d8" size={34} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="eng-recipe-name">{def.name}</div>
                <div className="small muted">{inputText(k)}</div>
                <div className="small">
                  <ResourceIcon type={def.scroll} /> свитков: <b>{have}</b>
                </div>
              </div>
              <div className="eng-recipe-btns">
                <button className="btn btn-sm btn-gold" disabled={have < 1} onClick={() => onCraft(k)}>
                  Создать
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    if (buy(k)) toast(`Куплен свиток: ${def.name}`, 'good');
                    else toast('Не хватает кристаллов', 'bad');
                  }}
                >
                  <ResourceIcon type="crystals" /> {def.scrollPrice}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CraftSheet({ kind, onClose, onDone }: { kind: GearKind; onClose: () => void; onDone: (gearId: string) => void }) {
  const profile = useProfile((s) => s.profile)!;
  const craft = useProfile((s) => s.engCraft);
  const toast = useUi((s) => s.toast);
  const def = GEAR_DEFS[kind];
  const [picked, setPicked] = useState<string[]>([]);
  const pre = craftPreview(profile, kind, picked);
  const cats = Object.entries(def.inputs) as [EquipCategory, number][];
  const scrolls = profile.resources[def.scroll];
  const coins = pre ? craftCoins(pre.tier) : null;

  const toggle = (it: Item, need: number) => {
    if (picked.includes(it.id)) return setPicked(picked.filter((x) => x !== it.id));
    const same = picked.filter((id) => profile.items[id]?.category === it.category);
    // Нужное число уже выбрано — заменяем первую выбранную вещь этой категории.
    setPicked(same.length >= need ? [...picked.filter((x) => x !== same[0]), it.id] : [...picked, it.id]);
  };

  return (
    <Sheet
      title={`Создать: ${def.name}`}
      subtitle={inputText(kind)}
      onClose={onClose}
      actions={
        <button
          className="btn btn-gold grow"
          disabled={!pre || scrolls < 1 || profile.resources.coins < (coins ?? 0)}
          onClick={() => {
            const r = craft(kind, picked);
            if (r.gear) {
              toast(`Создано: ${r.gear.name} · ${Math.round(r.gear.quality * 100)}%`, 'rare');
              onDone(r.gear.id);
            } else toast(r.error === 'scroll' ? 'Нет свитка' : r.error === 'coins' ? 'Не хватает монет' : 'Выберите вещи', 'bad');
          }}
        >
          Создать
        </button>
      }
    >
      <div className="eng-preview">
        {pre ? (
          <>
            <div className="eng-kv">
              <span className="muted">Качество</span>
              <b>
                <span style={{ color: qualityColor(pre.qMin) }}>{Math.round(pre.qMin * 100)}%</span> –{' '}
                <span style={{ color: qualityColor(pre.qMax) }}>{Math.round(pre.qMax * 100)}%</span>
              </b>
            </div>
            <div className="eng-kv">
              <span className="muted">Редкость · тех. уровень</span>
              <b style={{ color: rarityColor[pre.rarity] }}>
                {ru.rarity[pre.rarity]} · Т{pre.tier}
              </b>
            </div>
            {pre.stats.map((s) => (
              <div key={s.key} className="eng-kv">
                <span className="muted">{GEAR_STAT[s.key]}</span>
                <b>
                  {fmtGearStat(s.key, s.min)}
                  {s.max !== s.min && ` … ${fmtGearStat(s.key, s.max)}`}
                </b>
              </div>
            ))}
            <div className="eng-kv">
              <span className="muted">Цена</span>
              <b>
                <ResourceIcon type={def.scroll} /> 1 · <ResourceIcon type="coins" /> {fmtNum(coins!)}
              </b>
            </div>
          </>
        ) : (
          <span className="small muted">Выберите вещи со склада — здесь появится, что получится.</span>
        )}
      </div>
      {scrolls < 1 && <div className="small" style={{ color: '#ff8a7a', marginBottom: 8 }}>Нет свитка «{def.name}». Купите его в мастерской или выбейте с босса.</div>}
      {cats.map(([cat, need]) => {
        const list = Object.values(profile.items)
          .filter((it) => it.category === cat && !isEquipped(profile, it.id))
          .sort((a, b) => itemQuality(b) - itemQuality(a));
        const chosen = picked.filter((id) => profile.items[id]?.category === cat).length;
        return (
          <div key={cat}>
            <div className="section-title">
              <span>{ru.category[cat]}</span>
              <span style={{ color: chosen === need ? '#7be38a' : undefined }}>
                {chosen} / {need}
              </span>
            </div>
            {list.length ? (
              <div className="eng-inputs">
                {list.map((it) => {
                  const q = itemQuality(it);
                  return (
                    <button key={it.id} className={`eng-input${picked.includes(it.id) ? ' on' : ''}`} onClick={() => toggle(it, need)}>
                      <ItemIcon category={it.category} rarity={it.rarity} level={it.level} size={36} />
                      <span className="eng-input-q" style={{ color: qualityColor(q) }}>
                        {Math.round(q * 100)}%
                      </span>
                      <span className="eng-input-t">Т{it.tier}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="small muted">На складе нет: {ru.category[cat].toLowerCase()}. Установленные в бункер не используются.</div>
            )}
          </div>
        );
      })}
    </Sheet>
  );
}
