import { bossesConfig } from '../../game/config/bossesConfig';
import { getLocation } from '../../game/config/locationsConfig';
import { robotsConfig, type RobotKind } from '../../game/config/enemiesConfig';
import { COIL_MODES, RESOURCE_KEYS } from '../../game/types';
import { modeConfig } from '../../game/config/gameConfig';
import { fmtNum, ru, uniqueText } from '../../i18n/ru';
import { useUi } from '../../stores/uiStore';
import { useProfile } from '../../stores/profileStore';
import { modeColor, rarityColor } from '../../ui/theme';
import { ItemIcon, ResourceIcon } from '../common/Icons';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function enemyName(kind: string): string {
  if (kind.startsWith('boss:')) return bossesConfig[kind.slice(5)]?.name ?? kind;
  return robotsConfig[kind as RobotKind]?.name ?? kind;
}

/** Экран после разрушения бункера. */
export function ResultScreen() {
  const result = useUi((s) => s.result);
  const newRun = useUi((s) => s.newRun);
  const setScreen = useUi((s) => s.setScreen);
  if (!result) return null;
  const { run } = result;
  const loc = getLocation(result.locationId);
  const gained = RESOURCE_KEYS.filter((k) => run.resources[k] > 0);
  const modes = [...COIL_MODES, 'dot' as const].filter((m) => run.damageByMode[m] > 0).sort((a, b) => run.damageByMode[b] - run.damageByMode[a]);

  const go = (screen: 'bunker' | 'tech') => {
    newRun();
    setScreen(screen);
  };

  return (
    <div className="result">
      <h1 style={{ color: '#ff5a4a' }}>БУНКЕР ПОВРЕЖДЁН</h1>
      <div className="subtitle">
        {loc.name}
        {result.duringBoss ? ' · босс отступил, условие вызова сохранено' : ''}
      </div>

      <div className="panel kv">
        <span>Уничтожено роботов</span>
        <span>{run.kills}</span>
        <span>Уничтожено групп</span>
        <span>{run.groupsCleared}</span>
        <span>Нанесено урона</span>
        <span>{fmtNum(run.damageDealt)}</span>
        <span>Получено урона</span>
        <span>{fmtNum(run.damageTaken)}</span>
        <span>Средний / макс. DPS</span>
        <span>
          {fmtNum(run.damageDealt / Math.max(1, run.time))} / {fmtNum(run.maxDps)}
        </span>
        <span>Импульсов</span>
        <span>{run.pulses}</span>
        <span>Модификаций найдено</span>
        <span>{run.parts}</span>
        <span>Перегревов</span>
        <span>{run.overheats}</span>
        <span>Время</span>
        <span>{fmtTime(run.time)}</span>
      </div>

      <div className="section-title">Получено (уже на складе)</div>
      <div className="panel">
        {gained.length === 0 && run.items.length === 0 && <div className="muted small">Ничего не получено.</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: run.items.length ? 8 : 0 }}>
          {gained.map((k) => (
            <span key={k} className="res">
              <ResourceIcon type={k} size={16} /> +{fmtNum(run.resources[k])}
            </span>
          ))}
        </div>
        {run.items.map((it) => (
          <div key={it.id} className="small" style={{ color: rarityColor[it.rarity] }}>
            {ru.rarity[it.rarity]}: {it.name}
          </div>
        ))}
      </div>

      {modes.length > 0 && (
        <>
          <div className="section-title">Урон по режимам</div>
          <div className="panel small">
            {modes.map((m) => (
              <div key={m} className="stat-line">
                <span style={{ color: modeColor(m) }}>{m === 'dot' ? 'Периодический (перегрев, отражение)' : modeConfig[m].name}</span>
                <span>{fmtNum(run.damageByMode[m])}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {Object.keys(run.killsByKind).length > 0 && (
        <>
          <div className="section-title">Уничтожено по типам</div>
          <div className="panel small">
            {Object.entries(run.killsByKind).map(([k, n]) => (
              <div key={k} className="stat-line">
                <span>{enemyName(k)}</span>
                <span>
                  {n} · урон {fmtNum(run.damageByEnemy[k] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary btn-block" onClick={newRun}>
          Восстановить и продолжить
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn grow" onClick={() => go('bunker')}>
            Мой бункер
          </button>
          <button className="btn grow" onClick={() => go('tech')}>
            Исследования
          </button>
        </div>
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
