import { useMemo, useState } from 'react';
import { computeBunkerStats, type BunkerStats } from '../../game/bunker/BunkerStats';
import { modeConfig } from '../../game/config/gameConfig';
import { getLocation } from '../../game/config/locationsConfig';
import { coilProps, itemModifiers, sellPrice } from '../../game/items/ItemGenerator';
import { upgradeBlock } from '../../game/items/ItemUpgrade';
import { formatStatValue, lowerIsBetter } from '../../game/items/statInfo';
import { defaultSlotFor, equipItem, needsSellWarning, slotOf } from '../../game/profile/Profile';
import { SLOT_CATEGORY, SLOT_IDS, type ItemSource, type SlotId, type StatMod } from '../../game/types';
import { ru, statLabel, uniqueText } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ConfirmDialog } from '../common/Common';
import { ItemIcon, ResourceIcon } from '../common/Icons';
import { UpgradeDialog } from './UpgradeDialog';

function sourceText(s: ItemSource): string {
  switch (s.kind) {
    case 'start':
      return 'Стартовое оборудование';
    case 'drop':
      return `${getLocation(s.location).name} — ${s.enemy}`;
    case 'boss':
      return `${getLocation(s.location).name} — трофей босса «${s.boss}»`;
  }
}

function StatLines({ mods }: { mods: StatMod[] }) {
  return (
    <div className="stat-list">
      {mods.map((m, i) => {
        const good = m.stat === 'conversion' || (lowerIsBetter(m.stat) ? m.value < 0 : m.value > 0);
        return (
          <div className="stat-line" key={i}>
            <span>{statLabel(m.stat)}</span>
            <span className={good ? 'pos' : 'neg'}>{formatStatValue(m.stat, m.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function diffRow(key: string, label: string, a: number, b: number, fmt: (v: number) => string) {
  const d = b - a;
  if (Math.abs(d) < 0.005 * Math.max(1, Math.abs(a))) return null;
  return (
    <div className="stat-line" key={key}>
      <span>{label}</span>
      <span className={d > 0 ? 'pos' : 'neg'}>
        {fmt(a)} → {fmt(b)}
      </span>
    </div>
  );
}

function Comparison({ cur, next }: { cur: BunkerStats; next: BunkerStats }) {
  const rows = [
    diffRow('dps', 'Устойчивый DPS', cur.sustainedDps, next.sustainedDps, (v) => v.toFixed(0)),
    diffRow('en', 'Обеспечение энергией', cur.energyFactor * 100, next.energyFactor * 100, (v) => `${v.toFixed(0)}%`),
    diffRow('heat', 'Обеспечение охлаждением', cur.heatFactor * 100, next.heatFactor * 100, (v) => `${v.toFixed(0)}%`),
    diffRow('pow', 'Полезная мощность', cur.usablePower, next.usablePower, (v) => `${v.toFixed(1)}/с`),
    diffRow('cap', 'Ёмкость накопителя', cur.capacity, next.capacity, (v) => v.toFixed(0)),
    diffRow('cool', 'Охлаждение', cur.coolRate, next.coolRate, (v) => `${v.toFixed(1)}/с`),
    diffRow('hp', 'Прочность', cur.maxHp, next.maxHp, (v) => v.toFixed(0)),
    diffRow('dr', 'Снижение урона', cur.damageReduction * 100, next.damageReduction * 100, (v) => `${v.toFixed(0)}%`),
    diffRow('reg', 'Ремонт', cur.regen, next.regen, (v) => `${v.toFixed(1)}/с`),
    diffRow('det', 'Обнаружение', cur.detectRange, next.detectRange, (v) => v.toFixed(0)),
  ].filter(Boolean);
  return rows.length ? <div className="stat-list">{rows}</div> : <div className="muted small">Характеристики комплекса не изменятся.</div>;
}

export function ItemCard({ itemId, onClose, onReplace }: { itemId: string; onClose: () => void; onReplace?: (slot: SlotId) => void }) {
  const profile = useProfile((s) => s.profile)!;
  const equip = useProfile((s) => s.equip);
  const unequip = useProfile((s) => s.unequip);
  const sell = useProfile((s) => s.sell);
  const equipTarget = useUi((s) => s.equipTarget);
  const setEquipTarget = useUi((s) => s.setEquipTarget);
  const toast = useUi((s) => s.toast);
  const [confirmSell, setConfirmSell] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [details, setDetails] = useState(false);
  const [chosenSlot, setChosenSlot] = useState<SlotId | null>(null);

  const item = profile.items[itemId];
  const equippedSlot = item ? slotOf(profile, item.id) : null;
  const fits = item ? SLOT_IDS.filter((s) => SLOT_CATEGORY[s] === item.category) : [];
  const slot: SlotId | null = item
    ? (chosenSlot ?? (equipTarget && SLOT_CATEGORY[equipTarget] === item.category ? equipTarget : defaultSlotFor(profile, item)))
    : null;

  const preview = useMemo(() => {
    if (!item || equippedSlot || !slot) return null;
    const r = equipItem(profile, item.id, slot);
    if (r.error) return null;
    return { cur: computeBunkerStats(profile), next: computeBunkerStats(r.profile) };
  }, [profile, item, equippedSlot, slot]);

  if (!item) return null;
  const col = rarityColor[item.rarity];
  const replacingId = !equippedSlot && slot ? profile.equipment[slot] : null;
  const replacing = replacingId ? profile.items[replacingId] : null;
  const coil = coilProps(item);
  const price = sellPrice(item);
  const canUpgrade = !upgradeBlock(profile, item, false) || !upgradeBlock(profile, item, true);
  const mods = itemModifiers(item);

  const doEquip = () => {
    if (!slot) return;
    const err = equip(item.id, slot);
    if (err) toast('Это оборудование не подходит для слота', 'bad');
    else {
      toast(`Установлено: ${item.name}`, 'good');
      setEquipTarget(null);
      onClose();
    }
  };

  const doSell = () => {
    const r = sell(item.id);
    setConfirmSell(false);
    if (r.error) toast('Сначала снимите оборудование с бункера', 'bad');
    else {
      toast(`Продано за ${r.coins} монет`, 'good');
      onClose();
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-body">
          <div className="card-head">
            <ItemIcon category={item.category} rarity={item.rarity} size={64} />
            <div className="grow">
              <div style={{ color: col, fontWeight: 900, fontSize: 17 }}>{item.name}</div>
              <div className="item-sub">
                {ru.rarity[item.rarity]} · {ru.category[item.category].toLowerCase()}
                {equippedSlot && <span className="tag">{ru.slot[equippedSlot]}</span>}
              </div>
              <div className="item-sub">
                Уровень {item.level} / {item.maxLevel} · технологический уровень {item.tier}
              </div>
            </div>
          </div>
          <div className="small muted" style={{ lineHeight: 1.45, marginBottom: 8 }}>
            {item.description}
          </div>

          {item.unique && <div className="unique-box">★ {uniqueText(item.unique)}</div>}

          {coil && (
            <>
              <div className="section-title">Режим: {modeConfig[coil.mode].name}</div>
              <div className="small muted" style={{ marginBottom: 6, lineHeight: 1.4 }}>
                {modeConfig[coil.mode].description}
              </div>
              <div className="stat-list">
                <div className="stat-line">
                  <span>Мощность импульса</span>
                  <span>{coil.power.toFixed(1)}</span>
                </div>
                <div className="stat-line">
                  <span>Радиус воздействия</span>
                  <span>{coil.radius.toFixed(0)}</span>
                </div>
                <div className="stat-line">
                  <span>Интервал</span>
                  <span>{coil.interval.toFixed(2)} с</span>
                </div>
                <div className="stat-line">
                  <span>Энергия на импульс</span>
                  <span className="neg">{coil.energyPerPulse.toFixed(1)}</span>
                </div>
                <div className="stat-line">
                  <span>Нагрев за импульс</span>
                  <span className="neg">{coil.heatPerPulse.toFixed(1)}</span>
                </div>
              </div>
            </>
          )}

          {item.baseStats.length > 0 && (
            <>
              <div className="section-title">Характеристики (с учётом уровня)</div>
              <StatLines mods={mods.slice(0, item.baseStats.length)} />
            </>
          )}
          {item.extraStats.length > 0 && (
            <>
              <div className="section-title">Дополнительные свойства</div>
              <StatLines mods={item.extraStats} />
            </>
          )}
          {item.energyCost > 0 && (
            <div className="stat-line">
              <span>Постоянное потребление</span>
              <span className="neg">{item.energyCost.toFixed(1)}/с</span>
            </div>
          )}

          <div className="section-title">
            <span>Слоты модификаций</span>
            <span>{item.slots.length}</span>
          </div>
          {item.slots.length === 0 ? (
            <div className="muted small">Нет слотов для модификаций.</div>
          ) : (
            <div className="stat-list">
              {item.slots.map((s, i) => (
                <div className="stat-line" key={i}>
                  <span>Слот {i + 1}</span>
                  <span className="muted">{s.locked ? 'Заблокирован (ключ расширения)' : s.partId ? 'Модификация установлена' : 'Свободен'}</span>
                </div>
              ))}
            </div>
          )}

          {!equippedSlot && fits.length > 1 && (
            <>
              <div className="section-title">Куда установить</div>
              <div className="seg">
                {fits.map((s) => (
                  <button key={s} className={slot === s ? 'on' : ''} onClick={() => setChosenSlot(s)} style={{ flex: 1 }}>
                    {ru.slot[s]}
                    {profile.equipment[s] ? '' : ' (пусто)'}
                  </button>
                ))}
              </div>
            </>
          )}

          {preview && (
            <>
              <div className="section-title">
                <span>Если установить</span>
                {replacing && <span style={{ color: rarityColor[replacing.rarity], textTransform: 'none' }}>вместо: {replacing.name}</span>}
              </div>
              <Comparison cur={preview.cur} next={preview.next} />
            </>
          )}

          <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 12 }} onClick={() => setDetails(!details)}>
            {details ? 'Скрыть подробности' : 'Подробная информация'}
          </button>
          {details && (
            <div className="small muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
              Источник: {sourceText(item.source)}
              <br />
              Получено: {new Date(item.obtainedAt).toLocaleString('ru-RU')}
              <br />
              Цена продажи: {price} монет
              <br />
              ID: {item.id}
            </div>
          )}
        </div>

        <div className="sheet-actions">
          <button className="btn btn-gold" disabled={!canUpgrade} onClick={() => setUpgrading(true)}>
            Улучшить
          </button>
          {equippedSlot ? (
            <>
              {onReplace && (
                <button className="btn" onClick={() => onReplace(equippedSlot)}>
                  Заменить
                </button>
              )}
              <button
                className="btn btn-ghost"
                onClick={() => {
                  unequip(item.id);
                  toast(`Снято: ${item.name}`);
                  onClose();
                }}
              >
                Снять
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-rust" onClick={() => setConfirmSell(true)}>
                <ResourceIcon type="coins" /> {price}
              </button>
              <button className="btn btn-primary" onClick={doEquip} style={{ flexBasis: '100%' }}>
                {replacing ? `Заменить: ${ru.slot[slot!]}` : `Установить: ${ru.slot[slot!]}`}
              </button>
            </>
          )}
        </div>
      </div>

      {upgrading && <UpgradeDialog itemId={item.id} onClose={() => setUpgrading(false)} onDestroyed={onClose} />}
      {confirmSell && (
        <ConfirmDialog
          title="Продать оборудование?"
          text={
            <>
              <span style={{ color: col }}>{item.name}</span> будет продано за {price} монет. Отменить нельзя.
            </>
          }
          warning={needsSellWarning(item) ? `Это ${ru.rarity[item.rarity].toLowerCase()} оборудование. Такое выпадает редко.` : undefined}
          confirmLabel="Продать"
          danger
          onConfirm={doSell}
          onCancel={() => setConfirmSell(false)}
        />
      )}
    </div>
  );
}
