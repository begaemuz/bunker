import { Fragment, useState } from 'react';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { fmtNum, ru } from '../../i18n/ru';
import { RESOURCE_KEYS } from '../../game/types';
import { rarityColor } from '../../ui/theme';
import { ResourceIcon } from '../common/Icons';
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
  const profile = useProfile((s) => s.profile)!;
  const tg = useProfile((s) => s.tg);
  const cloud = useProfile((s) => s.cloud);
  const setIntroOpen = useUi((s) => s.setIntroOpen);
  const stats = profile.stats;
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
    ['Модификаций на складе', Object.values(profile.parts).filter((p) => !p.installedIn).length],
  ];

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Меню</h2>
      </div>
      <div className="screen-body">
        <div className="panel tg-card" style={{ marginBottom: 10 }}>
          {tg?.photo_url ? (
            <img className="tg-avatar" src={tg.photo_url} alt="" />
          ) : (
            <div className="tg-avatar" style={{ background: tg ? '#229ed9' : '#3a434c' }}>
              {tg ? tg.first_name.slice(0, 1) : '?'}
            </div>
          )}
          <div className="grow">
            <div style={{ fontWeight: 900 }}>{tg ? [tg.first_name, tg.last_name].filter(Boolean).join(' ') : 'Гость'}</div>
            <div className="small muted">
              {tg
                ? `Вход через Telegram${tg.username ? ` · @${tg.username}` : ''}${cloud ? ' · прогресс в облаке Telegram' : ''}`
                : 'Прогресс сохраняется на этом устройстве. В Telegram вход выполняется автоматически.'}
            </div>
          </div>
        </div>
        <div className="menu-list">
          <button className="btn btn-primary btn-block" onClick={() => setScreen('game')}>
            Вернуться в бой
          </button>
          <button className="btn btn-danger btn-block" onClick={() => setConfirm('surrender')}>
            Отступить (завершить заход)
          </button>
        </div>

        <div className="section-title">Ресурсы</div>
        {RESOURCE_KEYS.map((k) => (
          <div key={k} className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            <ResourceIcon type={k} size={26} />
            <div className="grow">
              <div style={{ fontWeight: 800 }}>{ru.resource[k]}</div>
              <div className="small muted">{ru.resourceHint[k]}</div>
            </div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{fmtNum(profile.resources[k])}</div>
          </div>
        ))}

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

        <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setIntroOpen(true)}>
          Посмотреть вступление
        </button>

        <div className="section-title">История оборудования</div>
        <div className="panel">
          {profile.history.length === 0 && <div className="muted small">История пуста.</div>}
          {profile.history.slice(0, 40).map((h, i) => (
            <div key={i} className="stat-line">
              <span>
                <span style={{ color: rarityColor[h.rarity] }}>{h.itemName}</span>
                <br />
                <span className="small muted">
                  {new Date(h.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {h.detail ? ` · ${h.detail}` : ''}
                </span>
              </span>
              <span className={h.action === 'obtained' || h.action === 'upgraded' ? 'pos' : h.action === 'destroyed' ? 'neg' : 'muted'}>
                {{ obtained: 'получено', sold: 'продано', scrapped: 'разобрано', upgraded: 'улучшено', destroyed: 'уничтожено' }[h.action]}
              </span>
            </div>
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
