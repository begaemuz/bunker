import { useState } from 'react';
import { effectiveMaxLevel } from '../../game/items/ItemUpgrade';
import { BOOST_NAME, BOOST_RANGE, BOOSTERS, type BoosterKey } from '../../game/items/Boost';
import { fmtNum } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { ResourceIcon } from '../common/Icons';

const pctText = (v: number) => `${v >= 0 ? '+' : '−'}${(Math.abs(v) * 100).toFixed(1).replace('.0', '')}%`;

/** Метка буста на вещи. */
export function BoostTag({ boost }: { boost: number }) {
  return <span className={`boost-tag ${boost >= 0 ? 'up' : 'down'}`}>буст {pctText(boost)}</span>;
}

/** Выбор бустера и подтверждение. */
export function BoostDialog({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const boostItem = useProfile((s) => s.boostItem);
  const toast = useUi((s) => s.toast);
  const item = profile.items[itemId];
  const have = BOOSTERS.filter((k) => profile.resources[k] > 0);
  const [pick, setPick] = useState<BoosterKey | null>(have[0] ?? null);
  const [result, setResult] = useState<number | null>(null);
  if (!item) return null;
  const notMax = item.level < effectiveMaxLevel(profile, item);

  const run = () => {
    if (!pick) return;
    const r = boostItem(itemId, pick);
    if (r.error || r.boost == null) {
      toast('Буст не удался', 'bad');
      onClose();
      return;
    }
    setResult(r.boost);
  };

  return (
    <div className="modal-back center" onClick={onClose}>
      <div className="dialog boost-dialog" onClick={(e) => e.stopPropagation()}>
        {result == null ? (
          <>
            <h3>Буст вещи</h3>
            <p className="small" style={{ margin: '4px 0 10px' }}>
              Бустер изменит основные характеристики «{item.name}» на случайную величину — <b>в плюс или в минус</b>.
            </p>
            <div className="boost-picks">
              {BOOSTERS.map((k) => {
                const n = profile.resources[k];
                const [lo, hi] = BOOST_RANGE[k];
                return (
                  <button key={k} className={`boost-pick${pick === k ? ' on' : ''}`} disabled={n < 1} onClick={() => setPick(k)}>
                    <ResourceIcon type={k} size={28} />
                    <b>{BOOST_NAME[k]}</b>
                    <span className="small">
                      ±{Math.round(lo * 100)}–{Math.round(hi * 100)}%
                    </span>
                    <span className="small muted">×{fmtNum(n)}</span>
                  </button>
                );
              })}
            </div>
            <div className="warn-box" style={{ marginTop: 10 }}>
              После буста вещь <b>нельзя улучшать</b> и бустить снова.
              {notMax && ` Сейчас уровень ${item.level} из ${effectiveMaxLevel(profile, item)} — лучше сначала заточить до максимума.`}
            </div>
            <div className="row">
              <button className="btn btn-ghost" onClick={onClose}>
                Нет
              </button>
              <button className="btn btn-boost" disabled={!pick} onClick={run}>
                Да, бустить
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>{result >= 0 ? 'Удачный буст!' : 'Неудачный буст'}</h3>
            <div className={`boost-result ${result >= 0 ? 'up' : 'down'}`}>{pctText(result)}</div>
            <p className="small muted" style={{ textAlign: 'center' }}>
              Основные характеристики «{item.name}» {result >= 0 ? 'выросли' : 'снизились'}. Вещь больше нельзя улучшать.
            </p>
            <div className="row">
              <button className="btn btn-gold" style={{ flex: 1 }} onClick={onClose}>
                Понятно
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
