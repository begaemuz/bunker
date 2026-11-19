import { enemiesConfig, type EnemyKind } from '../../game/config/enemiesConfig';
import { getMap } from '../../game/config/mapsConfig';
import { DAMAGE_TYPES, RESOURCE_KEYS } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { useUi } from '../../stores/uiStore';
import { damageColor, rarityColor } from '../../ui/theme';
import { ResourceIcon } from '../common/Icons';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ResultScreen() {
  const result = useUi((s) => s.result);
  const newRun = useUi((s) => s.newRun);
  const setScreen = useUi((s) => s.setScreen);
  if (!result) return null;
  const { run, outcome } = result;
  const map = getMap(result.mapId);
  const win = outcome === 'victory';
  const gained = RESOURCE_KEYS.filter((k) => run.resources[k] > 0);
  const dmgTypes = DAMAGE_TYPES.filter((t) => run.damageByType[t] > 0).sort((a, b) => run.damageByType[b] - run.damageByType[a]);

  const go = (screen: 'inventory' | 'equipment') => {
    newRun();
    setScreen(screen);
  };

  return (
    <div className="result">
      <h1 style={{ color: win ? '#5fd16a' : '#ff5a4a' }}>{win ? 'ПОБЕДА' : 'БУНКЕР ПАЛ'}</h1>
      <div className="subtitle">
        {map.name} · {win ? `босс уничтожен` : `волна ${result.wave}`}
      </div>

      <div className="panel kv">
        <span>Уничтожено роботов</span>
        <span>{run.kills}</span>
        <span>Пройдено волн</span>
        <span>{run.wavesCleared}</span>
        <span>Нанесено урона</span>
        <span>{fmtNum(run.damageDealt)}</span>
        <span>Получено урона</span>
        <span>{fmtNum(run.damageTaken)}</span>
        <span>Средний DPS</span>
        <span>{fmtNum(run.damageDealt / Math.max(1, run.time))}</span>
        <span>Максимальный DPS</span>
        <span>{fmtNum(run.maxDps)}</span>
        <span>Импульсов</span>
        <span>{run.pulses}</span>
        <span>Урон от эффектов</span>
        <span>{fmtNum(run.effectDamage)}</span>
        <span>Время боя</span>
        <span>{fmtTime(run.time)}</span>
      </div>

      <div className="section-title">Получено (уже сохранено)</div>
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

      {dmgTypes.length > 0 && (
        <>
          <div className="section-title">Урон по типам</div>
          <div className="panel small">
            {dmgTypes.map((t) => (
              <div key={t} className="stat-line">
                <span style={{ color: damageColor[t] }}>{ru.damage[t]}</span>
                <span>{fmtNum(run.damageByType[t])}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {Object.keys(run.killsByKind).length > 0 && (
        <>
          <div className="section-title">Уничтожено по типам</div>
          <div className="panel small">
            {(Object.entries(run.killsByKind) as [EnemyKind, number][]).map(([k, n]) => (
              <div key={k} className="stat-line">
                <span>{enemiesConfig[k].name}</span>
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
          {win ? 'Пройти карту снова' : 'Повторить попытку'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn grow" onClick={() => go('equipment')}>
            Экипировка
          </button>
          <button className="btn grow" onClick={() => go('inventory')}>
            Инвентарь
          </button>
        </div>
      </div>
    </div>
  );
}
