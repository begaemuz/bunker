import { useState } from 'react';
import { balanceConfig } from '../../game/config/balanceConfig';
import { modeConfig } from '../../game/config/gameConfig';
import { extraStatPools, itemTemplates, type ItemTemplate } from '../../game/config/itemsConfig';
import { elementConfig, partTemplates, RESONANCE_STEPS } from '../../game/config/partsConfig';
import { coilRangesAt, energyCostAt, statRangeAt } from '../../game/items/ItemGenerator';
import { partStatRange } from '../../game/items/Parts';
import { formatStatValue } from '../../game/items/statInfo';
import { playerTier } from '../../game/meta/Meta';
import { ELEMENTS, EQUIP_CATEGORIES, RARITIES, type Rarity, type StatKey } from '../../game/types';
import { ru, statLabel, uniqueText } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { rarityColor } from '../../ui/theme';
import { CategoryGlyph, PartGlyph, ResourceIcon } from '../common/Icons';
import { CONSUMABLES, consumableInfo } from '../../game/consumables';
import { Sheet } from '../common/Sheet';

const GRADES: Rarity[] = RARITIES.filter((r) => r !== 'unique' && r !== 'mythic');

function Range({ stat, min, max }: { stat: StatKey; min: number; max: number }) {
  const a = formatStatValue(stat, min);
  const b = formatStatValue(stat, max);
  return (
    <div className="cx-line">
      <span>{statLabel(stat)}</span>
      <b>{a === b ? a : `${a} – ${b}`}</b>
    </div>
  );
}

function num(a: number, b: number, d = 1, unit = ''): string {
  const x = a.toFixed(d);
  const y = b.toFixed(d);
  return x === y ? `${x}${unit}` : `${x} – ${y}${unit}`;
}

/** Ещё не найденная вещь или модификация: тёмный силуэт. */
function Unknown({ part, category }: { part?: boolean; category?: ItemTemplate['category'] }) {
  return (
    <div className="cx-entry unknown">
      <div className="cx-head">
        <span className="cx-icon">{part ? <PartGlyph color="#3a434b" size={24} /> : <CategoryGlyph category={category!} color="#3a434b" size={26} />}</span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="cx-name">???</span>
          <span className="cx-sub">Ещё не найдено — выбейте, чтобы узнать характеристики</span>
        </span>
      </div>
    </div>
  );
}

function ItemEntry({ t, rarity, tier }: { t: ItemTemplate; rarity: Rarity; tier: number }) {
  const [open, setOpen] = useState(false);
  const r: Rarity = t.unique ? 'legendary' : rarity;
  const col = rarityColor[r];
  const coil = coilRangesAt(t, r, tier);
  const energy = energyCostAt(t, r, tier);
  const [eMin, eMax] = balanceConfig.rarityExtraCount[r];
  const [sMin, sMax] = balanceConfig.raritySlots[r];
  const mainN = t.unique ? t.base.length : balanceConfig.rarityMainCount[r];
  const used = new Set([...t.base, ...(t.traits ?? [])].map((b) => b.stat));
  const pool = extraStatPools[t.category].filter((x) => !used.has(x.stat));
  return (
    <div className={`cx-entry${open ? ' open' : ''}`} style={{ ['--rc' as string]: col }}>
      <button className="cx-head" onClick={() => setOpen(!open)}>
        <span className="cx-icon">
          <CategoryGlyph category={t.category} color={col} size={26} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="cx-name" style={{ color: col }}>
            {t.name}
          </span>
          <span className="cx-sub">
            {t.unique ? 'Золотое · эксклюзив VIP' : `${ru.rarity[r]} · Т${tier}`}
          </span>
        </span>
        <span className="cx-chev">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="cx-body">
          <div className="small muted" style={{ marginBottom: 6 }}>
            {t.description}
          </div>
          {t.unique && <div className="info-box" style={{ marginBottom: 6 }}>{uniqueText(t.unique)}</div>}
          {coil && (
            <>
              <div className="cx-h">Катушка · {modeConfig[coil.mode].name}</div>
              <div className="cx-line">
                <span>Мощность импульса</span>
                <b>{num(coil.power[0], coil.power[1])}</b>
              </div>
              <div className="cx-line">
                <span>Радиус</span>
                <b>{num(coil.radius[0], coil.radius[1], 0)}</b>
              </div>
              <div className="cx-line">
                <span>Интервал</span>
                <b>{num(coil.interval[0], coil.interval[1], 2, ' с')}</b>
              </div>
              <div className="cx-line">
                <span>Энергия / нагрев на импульс</span>
                <b>
                  {num(coil.energy[0], coil.energy[1])} / {num(coil.heat[0], coil.heat[1])}
                </b>
              </div>
            </>
          )}
          {(t.traits ?? []).length > 0 && <div className="cx-h">Особенность</div>}
          {(t.traits ?? []).map((b) => {
            const x = statRangeAt(b, r, tier);
            return <Range key={b.stat} stat={b.stat} min={x.min} max={x.max} />;
          })}
          {t.base.length > 0 && (
            <div className="cx-h">
              Основные характеристики: {Math.min(mainN, t.base.length)} из {t.base.length}
            </div>
          )}
          {t.base.map((b, i) => {
            const x = statRangeAt(b, r, tier);
            return i < mainN ? (
              <Range key={b.stat} stat={b.stat} min={x.min} max={x.max} />
            ) : (
              <div key={b.stat} className="cx-line cx-off">
                <span>{statLabel(b.stat)}</span>
                <b>с {i === 1 ? 'зелёной' : 'синей'}</b>
              </div>
            );
          })}
          {energy[1] > 0 && (
            <div className="cx-line">
              <span>Постоянное потребление</span>
              <b>{num(energy[0], energy[1], 1, '/с')}</b>
            </div>
          )}
          <div className="cx-h">
            Случайные дополнительные: {eMin === eMax ? eMin : `${eMin}–${eMax}`} шт.
          </div>
          {eMax === 0 ? (
            <div className="small muted">Появляются с фиолетовой редкости: фиолетовая +1, золотая +2.</div>
          ) : (
            pool.map((b) => {
              const x = statRangeAt(b, r, tier);
              return <Range key={b.stat} stat={b.stat} min={x.min} max={x.max} />;
            })
          )}
          <div className="cx-line" style={{ marginTop: 6 }}>
            <span>Заточка</span>
            <b>до 10 уровня, потом бустер</b>
          </div>
          <div className="cx-line">
            <span>Гнёзда модификаций</span>
            <b>{sMin === sMax ? sMin : `${sMin}–${sMax}`}</b>
          </div>
        </div>
      )}
    </div>
  );
}

function PartEntry({ id, rarity }: { id: string; rarity: Rarity }) {
  const [open, setOpen] = useState(false);
  const t = partTemplates.find((x) => x.id === id)!;
  const col = rarityColor[rarity];
  const main = partStatRange(rarity, t.stat, true)!;
  return (
    <div className={`cx-entry${open ? ' open' : ''}`} style={{ ['--rc' as string]: col }}>
      <button className="cx-head" onClick={() => setOpen(!open)}>
        <span className="cx-icon">
          <PartGlyph color={col} size={24} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="cx-name" style={{ color: col }}>
            {t.name}
          </span>
          <span className="cx-sub">
            {ru.rarity[rarity]} · {statLabel(t.stat).toLowerCase()}
          </span>
        </span>
        <span className="cx-chev">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="cx-body">
          <div className="small muted" style={{ marginBottom: 6 }}>
            {t.description} Ставится в: {t.fits.map((c) => ru.category[c].toLowerCase()).join(', ')}.
          </div>
          <div className="cx-h">Эффект</div>
          <Range stat={t.stat} min={main.min} max={main.max} />
          <div className="small muted" style={{ marginTop: 6 }}>Стихия случайная: Ток, Холод, Магнит или Плазма.</div>
        </div>
      )}
    </div>
  );
}

/** Резонанс стихий в базе. */
function ElementsInfo() {
  return (
    <>
      <div className="section-title">Резонанс стихий</div>
      <div className="small muted" style={{ marginBottom: 6 }}>
        Каждая модификация имеет стихию. 2, 4 и 6 модификаций одной стихии в надетых вещах включают бонусы.
      </div>
      {ELEMENTS.map((el) => (
        <div key={el} className="cx-entry open" style={{ ['--rc' as string]: elementConfig[el].color }}>
          <div className="cx-body">
            <b style={{ color: elementConfig[el].color }}>{elementConfig[el].name}</b>
            {RESONANCE_STEPS.map((n, i) => (
              <div key={n} className="cx-line">
                <span>{n} шт.</span>
                <b>{elementConfig[el].text[i]}</b>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** База: все вещи и модификации со всеми диапазонами свойств. */
export function CodexSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const [tab, setTab] = useState<'items' | 'parts' | 'other'>('items');
  const [rarity, setRarity] = useState<Rarity>('legendary');
  const [tier, setTier] = useState(playerTier(profile));
  const known = { items: new Set(profile.codex?.items ?? []), parts: new Set(profile.codex?.parts ?? []) };
  const itemTotal = itemTemplates.filter((t) => !t.unique || t.id.startsWith('v_')).length;
  const itemFound = itemTemplates.filter((t) => (!t.unique || t.id.startsWith('v_')) && known.items.has(t.id)).length;
  const partFound = partTemplates.filter((t) => known.parts.has(t.id)).length;
  return (
    <Sheet
      title="База"
      onClose={onClose}
      actions={
        <button className="btn btn-ghost grow" onClick={onClose}>
          Закрыть
        </button>
      }
    >
      <div className="seg quest-tabs">
        <button className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>
          Вещи {itemFound}/{itemTotal}
        </button>
        <button className={tab === 'parts' ? 'on' : ''} onClick={() => setTab('parts')}>
          Модиф. {partFound}/{partTemplates.length}
        </button>
        <button className={tab === 'other' ? 'on' : ''} onClick={() => setTab('other')}>
          Предметы
        </button>
      </div>
      {tab !== 'other' && (
      <div className="cx-grades">
        {GRADES.map((r) => (
          <button key={r} className={`cx-grade${rarity === r ? ' on' : ''}`} style={{ ['--rc' as string]: rarityColor[r] }} onClick={() => setRarity(r)}>
            {ru.rarity[r]}
          </button>
        ))}
      </div>
      )}
      {tab === 'items' && (
        <div className="cx-grades">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((t) => (
            <button key={t} className={`cx-grade tier${tier === t ? ' on' : ''}`} onClick={() => setTier(t)}>
              Т{t}
            </button>
          ))}
        </div>
      )}
      {tab === 'other' && (
        <div style={{ marginTop: 10 }}>
          {CONSUMABLES.map((k) => (
            <div key={k} className="cx-entry open" style={{ ['--rc' as string]: consumableInfo[k].color }}>
              <div className="cx-body" style={{ display: 'flex', gap: 10 }}>
                <ResourceIcon type={k} size={28} />
                <div className="grow">
                  <b style={{ color: consumableInfo[k].color }}>{ru.resource[k]}</b>
                  <div className="small muted">{consumableInfo[k].description}</div>
                  <div className="small" style={{ marginTop: 3 }}>{consumableInfo[k].use}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab !== 'other' && (
      <div className="small muted" style={{ margin: '4px 2px 10px' }}>
        {tab === 'items'
          ? 'Вещи одинаковые во всех зонах, отличается Т-уровень зоны. С роботов падают белые и зелёные, синие — редко; с боссов — синие, фиолетовые и очень редко золотые. Белая — 1 основная характеристика, зелёная — 2, синяя — 3, фиолетовая — 3 + 1 случайная, золотая — 3 + 2. Значения без учёта заточки и буста.'
          : 'У модификации один эффект: он меняет поведение бункера. Редкость усиливает эффект, качество показывает, насколько удачно он выпал.'}
      </div>
      )}
      {tab === 'items' &&
        EQUIP_CATEGORIES.map((c) => (
          <div key={c}>
            <div className="section-title">{ru.category[c]}</div>
            {itemTemplates
              .filter((t) => t.category === c && (!t.unique || t.id.startsWith('v_')))
              .sort((a, b) => Number(!!a.unique) - Number(!!b.unique))
              .map((t) =>
                known.items.has(t.id) ? <ItemEntry key={t.id} t={t} rarity={rarity} tier={tier} /> : <Unknown key={t.id} category={t.category} />,
              )}
          </div>
        ))}
      {tab === 'parts' && partTemplates.map((t) => (known.parts.has(t.id) ? <PartEntry key={t.id} id={t.id} rarity={rarity} /> : <Unknown key={t.id} part />))}
      {tab === 'parts' && <ElementsInfo />}
    </Sheet>
  );
}
