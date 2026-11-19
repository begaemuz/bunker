import { useMemo, useState } from 'react';
import type { UpgradeHint } from '../../game/bunker/compare';
import { sellPrice } from '../../game/items/ItemGenerator';
import { isEquipped } from '../../game/profile/Profile';
import { RARITIES, type Rarity } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ConfirmDialog, Switch } from '../common/Common';
import { ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';

/** Массовая продажа: выбрать редкости и продать всё неустановленное разом. */
export function MassSellSheet({ onClose, hints }: { onClose: () => void; hints: Map<string, UpgradeHint> }) {
  const profile = useProfile((s) => s.profile)!;
  const massSell = useProfile((s) => s.massSell);
  const toast = useUi((s) => s.toast);
  const [picked, setPicked] = useState<Set<Rarity>>(new Set(['common']));
  const [keepBetter, setKeepBetter] = useState(true);
  const [keepMods, setKeepMods] = useState(true);
  const [confirm, setConfirm] = useState(false);

  const free = useMemo(() => Object.values(profile.items).filter((i) => !isEquipped(profile, i.id) && i.rarity !== 'unique'), [profile]);
  const countBy = (r: Rarity) => free.filter((i) => i.rarity === r).length;

  const list = useMemo(
    () =>
      free.filter(
        (i) => picked.has(i.rarity) && !(keepBetter && hints.has(i.id)) && !(keepMods && i.slots.some((s) => s.partId)),
      ),
    [free, picked, keepBetter, keepMods, hints],
  );
  const coins = list.reduce((s, i) => s + sellPrice(i), 0);

  const toggle = (r: Rarity) => {
    const n = new Set(picked);
    if (n.has(r)) n.delete(r);
    else n.add(r);
    setPicked(n);
  };

  return (
    <>
      <Sheet
        title="Продажа оборудования"
        subtitle="Установленное и уникальное не продаётся"
        onClose={onClose}
        actions={
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Закрыть
            </button>
            <button className="btn btn-rust" disabled={list.length === 0} onClick={() => setConfirm(true)}>
              Продать {list.length} · <ResourceIcon type="coins" /> {fmtNum(coins)}
            </button>
          </>
        }
      >
        <div className="section-title" style={{ marginTop: 0 }}>
          Какие продать
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {RARITIES.filter((r) => r !== 'unique').map((r) => (
            <button key={r} className={`chip-toggle${picked.has(r) ? ' on' : ''}`} style={{ color: rarityColor[r] }} onClick={() => toggle(r)}>
              {picked.has(r) ? '✓ ' : ''}Все {ru.rarity[r].toLowerCase()} ({countBy(r)})
            </button>
          ))}
        </div>
        <div className="menu-list" style={{ marginTop: 12 }}>
          <div className="toggle-row">
            <span>
              Оставить лучше установленного
              <br />
              <span className="small muted">с зелёной стрелкой</span>
            </span>
            <Switch on={keepBetter} onChange={() => setKeepBetter(!keepBetter)} />
          </div>
          <div className="toggle-row">
            <span>
              Оставить с модификациями
              <br />
              <span className="small muted">иначе модификации пропадут</span>
            </span>
            <Switch on={keepMods} onChange={() => setKeepMods(!keepMods)} />
          </div>
        </div>
      </Sheet>
      {confirm && (
        <ConfirmDialog
          title="Продать оборудование?"
          text={`Будет продано ${list.length} шт. за ${fmtNum(coins)} монет. Отменить нельзя.`}
          warning={list.some((i) => RARITIES.indexOf(i.rarity) >= 2) ? 'Среди них есть редкое и выше.' : undefined}
          confirmLabel="Продать"
          danger
          onConfirm={() => {
            const r = massSell(list.map((i) => i.id));
            sfx.item(false);
            toast(`Продано ${r.count} шт. за ${fmtNum(r.coins)} монет`, 'good');
            setConfirm(false);
            onClose();
          }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}
