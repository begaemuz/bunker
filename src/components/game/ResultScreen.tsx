import { getLocation } from '../../game/config/locationsConfig';
import { RESOURCE_KEYS } from '../../game/types';
import { fmtNum, ru, uniqueText } from '../../i18n/ru';
import { useUi } from '../../stores/uiStore';
import { useProfile } from '../../stores/profileStore';
import { rarityColor } from '../../ui/theme';
import { ItemIcon, ResourceIcon, UiIcon } from '../common/Icons';

/** Окно после разрушения бункера: коротко и по делу. */
export function ResultScreen() {
  const result = useUi((s) => s.result);
  const newRun = useUi((s) => s.newRun);
  const setScreen = useUi((s) => s.setScreen);
  if (!result) return null;
  return (
    <div className="modal-back center">
      <div className="dialog defeat-dialog">
        <div className="defeat-icon">
          <UiIcon kind="skull" size={34} />
        </div>
        <h3>Бункер повреждён</h3>
        <p>
          {result.duringBoss
            ? 'Босс оказался сильнее. Вызов сохранён — усильте бункер и попробуйте снова.'
            : 'Роботы прорвались к бункеру. Всё добытое осталось у вас.'}
        </p>
        <button className="btn btn-gold btn-hazard btn-block" onClick={newRun}>
          Попробовать ещё раз
        </button>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => {
            newRun();
            setScreen('bunker');
          }}
        >
          Усилить бункер
        </button>
      </div>
    </div>
  );
}

/** Окно награды за победу над боссом. */
export function BossRewardModal() {
  const reward = useUi((s) => s.bossReward);
  const setBossReward = useUi((s) => s.setBossReward);
  const setScreen = useUi((s) => s.setScreen);
  if (!reward) return null;
  const res = RESOURCE_KEYS.filter((k) => (reward.loot.resources[k] ?? 0) > 0);
  const next = reward.unlocked ? getLocation(reward.unlocked) : null;
  return (
    <div className="modal-back center">
      <div className="dialog">
        <h3 style={{ textAlign: 'center', color: '#5fd16a', letterSpacing: '0.1em' }}>БОСС УНИЧТОЖЕН</h3>
        <p style={{ textAlign: 'center' }}>{reward.bossName} больше не угрожает этому району.</p>
        {next && (
          <div className="info-box" style={{ marginBottom: 10 }}>
            Открыта новая локация: <b>{next.name}</b>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10, justifyContent: 'center' }}>
          {res.map((k) => (
            <span key={k} className="res">
              <ResourceIcon type={k} size={16} /> +{fmtNum(reward.loot.resources[k]!)}
            </span>
          ))}
        </div>
        {reward.loot.parts.length > 0 && (
          <div className="small" style={{ textAlign: 'center', marginBottom: 8, color: '#e6d1ff' }}>
            Модификации: {reward.loot.parts.map((p) => `${p.name} (${ru.rarity[p.rarity].toLowerCase()})`).join(', ')}
          </div>
        )}
        {reward.loot.items.map((it) => (
          <div key={it.id} className="item-row" style={{ borderLeftColor: rarityColor[it.rarity] }}>
            <ItemIcon category={it.category} rarity={it.rarity} size={40} />
            <div className="grow">
              <div className="item-name" style={{ color: rarityColor[it.rarity] }}>
                {it.name}
              </div>
              <div className="item-sub">{ru.rarity[it.rarity]}</div>
              {it.unique && <div className="small" style={{ color: '#ffc2cf' }}>★ {uniqueText(it.unique)}</div>}
            </div>
          </div>
        ))}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn btn-ghost" onClick={() => setBossReward(null)}>
            Остаться
          </button>
          {next ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                setBossReward(null);
                setScreen('locations');
              }}
            >
              К локациям
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => {
                setBossReward(null);
                setScreen('bunker');
              }}
            >
              В бункер
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtAway(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

/** Окно награды за время отсутствия. */
export function OfflineRewardModal() {
  const reward = useProfile((s) => s.offlineReward);
  const claim = useProfile((s) => s.claimOffline);
  const toast = useUi((s) => s.toast);
  if (!reward) return null;
  const res = RESOURCE_KEYS.filter((k) => (reward.resources[k] ?? 0) > 0);
  return (
    <div className="modal-back center">
      <div className="dialog">
        <h3 style={{ textAlign: 'center', color: '#3fc8ff', letterSpacing: '0.08em' }}>ПОКА ВАС НЕ БЫЛО</h3>
        <p style={{ textAlign: 'center' }}>
          Бункер держал оборону {fmtAway(reward.seconds)} ({getLocation(reward.location).name}).
          <br />
          <span className="small muted">Без присмотра комплекс работает на 50% эффективности, максимум 8 часов.</span>
        </p>
        <div className="panel kv" style={{ marginBottom: 10 }}>
          <span>Уничтожено роботов</span>
          <span>{fmtNum(reward.kills)}</span>
          <span>Уничтожено групп</span>
          <span>{fmtNum(reward.groups)}</span>
          <span>Опыт</span>
          <span>+{fmtNum(reward.xp)}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10, justifyContent: 'center' }}>
          {res.map((k) => (
            <span key={k} className="res">
              <ResourceIcon type={k} size={16} /> +{fmtNum(reward.resources[k]!)}
            </span>
          ))}
        </div>
        {(reward.items.length > 0 || reward.parts.length > 0) && (
          <div className="small muted" style={{ textAlign: 'center', marginBottom: 10 }}>
            Оборудование: {reward.items.length} · модификации: {reward.parts.length}
          </div>
        )}
        <button
          className="btn btn-gold btn-block"
          onClick={() => {
            const r = claim();
            if (r.sold > 0) toast(`Автопродажа: ${r.sold} шт.`, 'info');
            if (r.levels > 0) toast(`Уровень бункера ${useProfile.getState().profile!.bunker.level}`, 'good');
          }}
        >
          Забрать
        </button>
      </div>
    </div>
  );
}
