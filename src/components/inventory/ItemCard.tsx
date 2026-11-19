import { useMemo, useState } from 'react';
import { computeBunkerStats, type BunkerStats } from '../../game/bunker/BunkerStats';
import { sellPrice } from '../../game/items/ItemGenerator';
import { formatStatValue, lowerIsBetter } from '../../game/items/statInfo';
import { balanceConfig } from '../../game/config/balanceConfig';
import { equipItem, isEquipped, needsSellWarning, type Profile } from '../../game/profile/Profile';
import type { Item, ItemSource, StatMod } from '../../game/types';
import { ru, statLabel } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ConfirmDialog } from '../common/Common';
import { ItemIcon, ResourceIcon } from '../common/Icons';

function sourceText(s: ItemSource): string {
  switch (s.kind) {
    case 'start':
      return 'Стартовое оборудование';
    case 'drop':
      return `Карта ${s.map}, волна ${s.wave} — ${s.enemy}`;
    case 'boss':
      return `Карта ${s.map} — награда за босса «${s.boss}»`;
  }
}

function StatLines({ mods, scaled }: { mods: StatMod[]; scaled?: number }) {
  return (
    <div className="stat-list">
      {mods.map((m, i) => {
        const v = scaled && m.stat !== 'effectSlots' ? m.value * scaled : m.value;
        const good = lowerIsBetter(m.stat) ? v < 0 : v > 0;
        return (
          <div className="stat-line" key={i}>
            <span>{statLabel(m.stat)}</span>
            <span className={good ? 'pos' : 'neg'}>{formatStatValue(m.stat, v)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Целевой слот при установке: выбранный, первый пустой или первый. */
function targetSlot(p: Profile, item: Item, forced?: { category: Item['category']; slot: number } | null): number {
  if (forced && forced.category === item.category) return forced.slot;
  const slots = p.equipment[item.category];
  const empty = slots.findIndex((s) => s === null);
  return empty >= 0 ? empty : 0;
}

function diffRow(key: string, label: string, a: number, b: number, fmt: (v: number) => string, invert = false) {
  const d = b - a;
  if (Math.abs(d) < 0.005) return null;
  const good = invert ? d < 0 : d > 0;
  return (
    <div className="stat-line" key={key}>
      <span>{label}</span>
      <span className={good ? 'pos' : 'neg'}>
        {fmt(b)} ({d > 0 ? '+' : '−'}
        {fmt(Math.abs(d))})
      </span>
    </div>
  );
}

function Comparison({ cur, next }: { cur: BunkerStats; next: BunkerStats }) {
  const rows = [
    diffRow('dps', 'DPS по цели', cur.singleTargetDps, next.singleTargetDps, (v) => v.toFixed(0)),
    diffRow('dmg', 'Урон импульса', cur.damage, next.damage, (v) => v.toFixed(0)),
    diffRow('rate', 'Частота', cur.pulseRate, next.pulseRate, (v) => `${v.toFixed(2)}/с`),
    diffRow('rad', 'Радиус', cur.radius, next.radius, (v) => v.toFixed(0)),
    diffRow('hp', 'Прочность', cur.maxHp, next.maxHp, (v) => v.toFixed(0)),
    diffRow('reg', 'Регенерация', cur.regen, next.regen, (v) => `${v.toFixed(1)}/с`),
    diffRow('en', 'Баланс энергии', cur.energy.balance, next.energy.balance, (v) => v.toFixed(1)),
    diffRow('bat', 'Энергорезерв', cur.energy.batteryCap, next.energy.batteryCap, (v) => v.toFixed(0)),
    diffRow('crit', 'Шанс крита', cur.critChance * 100, next.critChance * 100, (v) => `${v.toFixed(0)}%`),
  ].filter(Boolean);
  const curFx = cur.effects.map((e) => e.kind).join();
  const nextFx = next.effects.map((e) => e.kind).join();
  return (
    <>
      {rows.length === 0 && curFx === nextFx ? <div className="muted small">Характеристики бункера не изменятся.</div> : rows}
      {curFx !== nextFx && (
        <div className="stat-line">
          <span>Эффекты</span>
          <span>{next.effects.map((e) => ru.effect[e.kind]).join(', ') || 'нет'}</span>
        </div>
      )}
      {next.energy.balance < 0 && (
        <div className="warn-box" style={{ marginTop: 8, marginBottom: 0 }}>
          Выработки энергии не хватит: после разряда резерва бонусы оборудования ослабнут до{' '}
          {Math.round((next.energy.generation / next.energy.consumption) * 100)}%.
        </div>
      )}
    </>
  );
}

export function ItemCard({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const equip = useProfile((s) => s.equip);
  const unequip = useProfile((s) => s.unequip);
  const sell = useProfile((s) => s.sell);
  const equipTarget = useUi((s) => s.equipTarget);
  const setEquipTarget = useUi((s) => s.setEquipTarget);
  const toast = useUi((s) => s.toast);
  const [confirmSell, setConfirmSell] = useState(false);

  const item = profile.items[itemId];
  const equipped = item ? isEquipped(profile, item.id) : false;
  const slot = item ? targetSlot(profile, item, equipTarget) : 0;

  const preview = useMemo(() => {
    if (!item || equipped) return null;
    const cur = computeBunkerStats(profile);
    const r = equipItem(profile, item.id, item.category, slot);
    if (r.error) return null;
    return { cur, next: computeBunkerStats(r.profile) };
  }, [profile, item, equipped, slot]);

  if (!item) return null;
  const col = rarityColor[item.rarity];
  const replacing = !equipped ? profile.equipment[item.category][slot] : null;
  const replacingItem = replacing ? profile.items[replacing] : null;
  const lvlMult = 1 + balanceConfig.item.statPerLevel * (item.level - 1);
  const price = sellPrice(item);

  const doEquip = () => {
    const err = equip(item.id, item.category, slot);
    if (err) toast('Этот предмет нельзя установить в выбранный слот', 'bad');
    else {
      toast(`Установлено: ${item.name}`, 'good');
      setEquipTarget(null);
      onClose();
    }
  };

  const doSell = () => {
    const r = sell(item.id);
    setConfirmSell(false);
    if (r.error) toast('Сначала снимите предмет с бункера', 'bad');
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
            <ItemIcon category={item.category} rarity={item.rarity} size={60} />
            <div className="grow">
              <div style={{ color: col, fontWeight: 700, fontSize: 16 }}>{item.name}</div>
              <div className="item-sub">
                {ru.rarity[item.rarity]} {ru.category[item.category].toLowerCase()}
                {equipped && <span className="tag">Установлен</span>}
              </div>
              <div className="item-sub">
                Уровень {item.level} / {item.maxLevel}
              </div>
            </div>
          </div>

          <div className="section-title">Базовые характеристики</div>
          <StatLines mods={item.baseStats} scaled={lvlMult} />

          {item.extraStats.length > 0 && (
            <>
              <div className="section-title">Дополнительные свойства</div>
              <StatLines mods={item.extraStats} />
            </>
          )}

          <div className="section-title">Энергия</div>
          <div className="stat-line">
            <span>Энергопотребление</span>
            <span className={item.energyCost > 0 ? 'neg' : 'muted'}>{item.energyCost > 0 ? `${item.energyCost.toFixed(1)}/с` : 'нет'}</span>
          </div>

          <div className="section-title">
            <span>Слоты деталей</span>
            <span>{item.slots.length}</span>
          </div>
          {item.slots.length === 0 ? (
            <div className="muted small">У этого предмета нет слотов для деталей.</div>
          ) : (
            <div className="stat-list">
              {item.slots.map((s, i) => (
                <div className="stat-line" key={i}>
                  <span>Слот {i + 1}</span>
                  <span className="muted">{s.locked ? 'Заблокирован — нужен ключ расширения' : s.partId ? 'Деталь установлена' : 'Свободен'}</span>
                </div>
              ))}
            </div>
          )}

          {preview && (
            <>
              <div className="section-title">
                <span>Если установить</span>
                {replacingItem && <span style={{ color: rarityColor[replacingItem.rarity] }}>вместо: {replacingItem.name}</span>}
              </div>
              <Comparison cur={preview.cur} next={preview.next} />
            </>
          )}

          <div className="section-title">Происхождение</div>
          <div className="small muted">
            {sourceText(item.source)}
            <br />
            {new Date(item.obtainedAt).toLocaleString('ru-RU')}
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            ID: {item.id.slice(0, 8)}
          </div>
        </div>

        <div className="sheet-actions">
          {equipped ? (
            <button
              className="btn"
              onClick={() => {
                unequip(item.id);
                toast(`Снято: ${item.name}`);
                onClose();
              }}
            >
              Снять
            </button>
          ) : (
            <>
              <button className="btn btn-rust" onClick={() => setConfirmSell(true)}>
                Продать <ResourceIcon type="coins" /> {price}
              </button>
              <button className="btn btn-primary" onClick={doEquip}>
                {replacingItem ? 'Заменить' : 'Установить'}
              </button>
            </>
          )}
        </div>
      </div>

      {confirmSell && (
        <ConfirmDialog
          title="Продать предмет?"
          text={
            <>
              <span style={{ color: col }}>{item.name}</span> будет продан за {price} монет. Отменить продажу нельзя.
            </>
          }
          warning={
            needsSellWarning(item)
              ? `Это ${ru.rarity[item.rarity].toLowerCase()} предмет. Такие выпадают редко — убедитесь, что он вам не нужен.`
              : undefined
          }
          confirmLabel="Продать"
          danger
          onConfirm={doSell}
          onCancel={() => setConfirmSell(false)}
        />
      )}
    </div>
  );
}
