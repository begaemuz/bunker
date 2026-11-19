import { Fragment, useState } from 'react';
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

  const rows: [string, string | number][] = [
    ['Уничтожено роботов', fmtNum(stats.robotsKilled)],
    ['Уничтожено групп', fmtNum(stats.groupsKilled)],
    ['Побед над боссами', stats.bossesKilled],
    ['Мини-боссов', stats.minibossesKilled],
    ['Открыто локаций', stats.mapsCompleted + 1],
    ['Время в бою', fmtDuration(stats.playTime)],
    ['Нанесено урона', fmtNum(stats.damageDealt)],
    ['Получено урона', fmtNum(stats.damageTaken)],
    ['Найдено оборудования', stats.itemsFound],
    ['Легендарного / уникального', `${stats.legendaryFound} / ${stats.uniquesFound}`],
    ['Улучшений: успех / неудача', `${stats.upgradesSucceeded} / ${stats.upgradesFailed}`],
    ['Уничтожено при улучшении', stats.itemsDestroyed],
    ['Изучено уровней технологий', stats.techsResearched],
    ['Использовано пропусков', stats.bossPassesUsed],
    ['Повреждений бункера', stats.defeats],
  ];

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Меню</h2>
      </div>
      <div className="screen-body">
        <div className="menu-list">
          <button className="btn btn-primary btn-block" onClick={() => setScreen('game')}>
            Вернуться в бой
          </button>
          <button className="btn btn-danger btn-block" onClick={() => setConfirm('surrender')}>
            Отступить (завершить заход)
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

        <div className="section-title">Статистика</div>
        <div className="panel kv">
          {rows.map(([k, v]) => (
            <Fragment key={k}>
              <span>{k}</span>
              <span>{v}</span>
            </Fragment>
          ))}
        </div>

        <div className="section-title">Прогресс</div>
        <div className="small muted" style={{ marginBottom: 8 }}>
          Прогресс сохраняется автоматически на этом устройстве.
        </div>
        <button className="btn btn-ghost btn-block" style={{ color: '#ff9a8a' }} onClick={() => setConfirm('reset')}>
          Начать игру заново
        </button>
      </div>

      {confirm === 'surrender' && (
        <ConfirmDialog
          title="Отступить?"
          text="Заход завершится, угроза на локации сбросится. Всё собранное останется у вас."
          confirmLabel="Отступить"
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
          text="Будут удалены оборудование, ресурсы, технологии, уровень, локации и статистика."
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
