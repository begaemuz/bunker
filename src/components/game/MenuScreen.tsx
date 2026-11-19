import { useState } from 'react';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { fmtNum } from '../../i18n/ru';
import { ConfirmDialog, Switch } from '../common/Common';
import { getActiveSession } from './GameScreen';

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

export function MenuScreen() {
  const settings = useUi((s) => s.settings);
  const toggleSound = useUi((s) => s.toggleSound);
  const toggleNumbers = useUi((s) => s.toggleDamageNumbers);
  const setScreen = useUi((s) => s.setScreen);
  const newRun = useUi((s) => s.newRun);
  const reset = useProfile((s) => s.reset);
  const stats = useProfile((s) => s.profile!.stats);
  const [confirm, setConfirm] = useState<'surrender' | 'reset' | null>(null);

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Меню</h2>
      </div>
      <div className="screen-body">
        <div className="section-title">Бой</div>
        <div className="menu-list">
          <button className="btn btn-block" onClick={() => setScreen('game')}>
            Продолжить бой
          </button>
          <button className="btn btn-danger btn-block" onClick={() => setConfirm('surrender')}>
            Завершить попытку
          </button>
        </div>

        <div className="section-title">Настройки</div>
        <div className="menu-list">
          <div className="toggle-row">
            <span>Звук</span>
            <Switch on={settings.soundOn} onChange={toggleSound} />
          </div>
          <div className="toggle-row">
            <span>Числа урона</span>
            <Switch on={settings.showDamageNumbers} onChange={toggleNumbers} />
          </div>
        </div>

        <div className="section-title">Общая статистика</div>
        <div className="panel kv">
          <span>Уничтожено роботов</span>
          <span>{fmtNum(stats.robotsKilled)}</span>
          <span>Уничтожено боссов</span>
          <span>{stats.bossesKilled}</span>
          <span>Мини-боссов</span>
          <span>{stats.minibossesKilled}</span>
          <span>Пройдено волн</span>
          <span>{stats.wavesCompleted}</span>
          <span>Пройдено карт</span>
          <span>{stats.mapsCompleted}</span>
          <span>Попыток / поражений</span>
          <span>
            {stats.runs} / {stats.defeats}
          </span>
          <span>Время в бою</span>
          <span>{fmtDuration(stats.playTime)}</span>
          <span>Нанесено урона</span>
          <span>{fmtNum(stats.damageDealt)}</span>
          <span>Получено урона</span>
          <span>{fmtNum(stats.damageTaken)}</span>
          <span>Найдено предметов</span>
          <span>{stats.itemsFound}</span>
          <span>Легендарных</span>
          <span>{stats.legendaryFound}</span>
          <span>Продано предметов</span>
          <span>{stats.itemsSold}</span>
        </div>

        <div className="section-title">Прогресс</div>
        <div className="small muted" style={{ marginBottom: 8 }}>
          Прогресс сохраняется автоматически на этом устройстве.
        </div>
        <button className="btn btn-block" style={{ borderColor: '#7a2a20', color: '#ff9a8a' }} onClick={() => setConfirm('reset')}>
          Начать игру заново
        </button>
      </div>

      {confirm === 'surrender' && (
        <ConfirmDialog
          title="Завершить попытку?"
          text="Бой закончится поражением. Всё собранное в этом бою останется у вас."
          confirmLabel="Завершить"
          danger
          onConfirm={() => {
            setConfirm(null);
            setScreen('game');
            getActiveSession()?.surrender();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'reset' && (
        <ConfirmDialog
          title="Удалить весь прогресс?"
          text="Будут удалены все предметы, ресурсы, уровень и статистика. Это действие нельзя отменить."
          warning="Восстановить прогресс после удаления невозможно."
          confirmLabel="Удалить всё"
          danger
          onConfirm={async () => {
            setConfirm(null);
            await reset();
            newRun();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
