import { CONSUMABLES, consumableInfo, type ConsumableKey } from '../../game/consumables';
import { canSummonBoss } from '../../game/profile/Profile';
import { fmtNum, ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { getActiveSession } from '../game/GameScreen';

/** Плитки расходников на складе: стопка с количеством. */
export function ConsumableTiles({ onOpen }: { onOpen: (k: ConsumableKey) => void }) {
  const r = useProfile((s) => s.profile!.resources);
  const have = CONSUMABLES.filter((k) => r[k] > 0);
  return (
    <>
      {have.map((k) => {
        const col = consumableInfo[k].color;
        return (
          <button key={k} className="item-tile cons-tile" style={{ borderColor: col, boxShadow: `inset 0 0 18px ${col}2a` }} onClick={() => onOpen(k)}>
            <span className="tile-glyph">
              <ResourceIcon type={k} size={34} />
            </span>
            <span className="tile-lvl">×{fmtNum(r[k])}</span>
            <span className="tile-name" style={{ color: col }}>
              {ru.resource[k]}
            </span>
          </button>
        );
      })}
    </>
  );
}

export function ConsumableSheet({ k, onClose }: { k: ConsumableKey; onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const setScreen = useUi((s) => s.setScreen);
  const toast = useUi((s) => s.toast);
  const info = consumableInfo[k];
  const n = profile.resources[k];
  const canBoss = k === 'bossPasses' && n > 0 && !canSummonBoss(profile, profile.locations.current);
  return (
    <Sheet
      title={<span style={{ color: info.color }}>{ru.resource[k]}</span>}
      subtitle={`Предмет · в инвентаре ${fmtNum(n)}`}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
          {k === 'bossPasses' && (
            <button
              className="btn btn-danger btn-hazard"
              style={{ flex: 2 }}
              disabled={!canBoss}
              onClick={() => {
                const ok = getActiveSession()?.summonBoss(true);
                if (!ok) toast('Сейчас вызвать босса нельзя', 'bad');
                else {
                  onClose();
                  setScreen('game');
                }
              }}
            >
              Вызвать босса
            </button>
          )}
        </>
      }
    >
      <div className="cons-hero" style={{ ['--rc' as string]: info.color }}>
        <ResourceIcon type={k} size={56} />
        <b>×{fmtNum(n)}</b>
      </div>
      <p className="small" style={{ margin: '12px 0 8px' }}>
        {info.description}
      </p>
      <div className="info-box">{info.use}</div>
      <div className="small muted" style={{ marginTop: 10 }}>
        Расходники не занимают место на складе и не продаются автопродажей.
      </div>
    </Sheet>
  );
}
