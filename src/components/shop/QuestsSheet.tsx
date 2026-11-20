import { gameNow, serverClock, SERVER_TZ_NAME } from '../../game/meta/clock';
import { useEffect, useState } from 'react';
import { loginCalendar, questConfig, type QuestPeriod } from '../../game/config/metaConfig';
import { canClaimDaily, canClaimQuestBonus, dailyReward, LOGIN_DAYS, periodEnds, questBonus, questClaimable, QUEST_PERIODS } from '../../game/meta/Meta';
import { RESOURCE_KEYS, type Resources } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { Bar } from '../common/Common';
import { ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';

function Res({ r }: { r: Partial<Resources> }) {
  return (
    <span className="res-list">
      {RESOURCE_KEYS.filter((k) => r[k]).map((k) => (
        <span key={k} className="res">
          <ResourceIcon type={k} /> {fmtNum(r[k]!)}
        </span>
      ))}
    </span>
  );
}

function fmtLeft(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d} д ${h} ч`;
  return `${h} ч ${m % 60} мин`;
}

/** Значок на кнопке «Вход». */
export function useLoginBadge(): boolean {
  return useProfile((s) => canClaimDaily(s.profile!));
}

/** Значок на кнопке «Задания»: сколько наград можно забрать. */
export function useQuestBadge(): number {
  return useProfile((s) => QUEST_PERIODS.reduce((n, per) => n + questClaimable(s.profile!, per), 0));
}

// ───────────── Ежедневный вход: календарь на 30 дней ─────────────

/** Время сервера и сколько осталось до обновления. */
function ServerTime({ now, label = 'Новый день через', left }: { now: number; label?: string; left?: number }) {
  const rest = left ?? periodEnds('day', now) - now;
  return (
    <div className="server-time">
      <span>
        {label} <b>{fmtLeft(rest)}</b>
      </span>
      <span className="muted">
        время сервера {serverClock(now)} {SERVER_TZ_NAME}
      </span>
    </div>
  );
}

export function LoginSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const claimDaily = useProfile((s) => s.claimDaily);
  const toast = useUi((s) => s.toast);
  const can = canClaimDaily(profile);
  const cur = profile.daily.cycle;
  const todayReward = dailyReward(profile, cur);
  const [now, setNow] = useState(gameNow());
  useEffect(() => {
    const t = setInterval(() => setNow(gameNow()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <Sheet
      title="Ежедневный вход"
      subtitle={`День ${can ? cur + 1 : cur} из ${LOGIN_DAYS}`}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
          <button
            className={`btn ${can ? 'btn-gold btn-pulse btn-hazard' : ''}`}
            style={{ flex: 2 }}
            disabled={!can}
            onClick={() => {
              const r = claimDaily();
              if (r) {
                sfx.levelUp();
                toast(`День ${cur + 1}: награда получена`, 'good');
              }
            }}
          >
            {can ? 'Забрать награду' : 'Возвращайтесь завтра'}
          </button>
        </>
      }
    >
      <ServerTime now={now} />
      <div className="login-today">
        <div className="small muted">{can ? `Сегодня — день ${cur + 1}` : `Завтра — день ${(cur % LOGIN_DAYS) + 1}`}</div>
        <Res r={can ? todayReward : dailyReward(profile, cur)} />
      </div>
      <div className="login-grid">
        {loginCalendar.map((d, i) => {
          const r = dailyReward(profile, i);
          const done = i < cur;
          const today = i === cur && can;
          const main = RESOURCE_KEYS.find((k) => r[k] && (k === 'crystals' || k === 'expansionKeys' || k === 'bossPasses')) ?? RESOURCE_KEYS.find((k) => k !== 'coins' && r[k]) ?? 'coins';
          return (
            <div key={i} className={`lday${done ? ' done' : ''}${today ? ' today' : ''}${d.milestone ? ` ${d.milestone}` : ''}`} title={RESOURCE_KEYS.filter((k) => r[k]).map((k) => `${ru.resource[k]} ${r[k]}`).join(', ')}>
              <span className="lday-n">{i + 1}</span>
              <ResourceIcon type={main} size={d.milestone === 'grand' ? 24 : 18} />
              <span className="lday-v">{fmtNum(r[main]!)}</span>
              {done && <span className="lday-check">✓</span>}
            </div>
          );
        })}
      </div>
      <div className="small muted" style={{ marginTop: 10, textAlign: 'center' }}>
        Одна награда в день. Пропуск дня не сбрасывает прогресс. После 30-го дня календарь начинается заново. Дни 7, 14, 21 и 28 — особые, 30-й — главный приз.
      </div>
    </Sheet>
  );
}

// ───────────── Задания: день / неделя / месяц ─────────────

export function QuestsSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const ensureMeta = useProfile((s) => s.ensureMeta);
  const claimQuest = useProfile((s) => s.claimQuest);
  const claimBonus = useProfile((s) => s.claimQuestBonus);
  const claimAll = useProfile((s) => s.claimAllQuests);
  const toast = useUi((s) => s.toast);
  const [tab, setTab] = useState<QuestPeriod>('day');
  const [now, setNow] = useState(gameNow());

  useEffect(() => ensureMeta(), [ensureMeta]);
  useEffect(() => {
    const t = setInterval(() => setNow(gameNow()), 30000);
    return () => clearInterval(t);
  }, []);

  const set = profile.quests[tab];
  const done = set.list.filter((q) => q.claimed).length;
  const bonusReady = canClaimQuestBonus(profile, tab);
  const anyReady = QUEST_PERIODS.some((per) => questClaimable(profile, per) > 0 || canClaimQuestBonus(profile, per));

  return (
    <Sheet
      title="Задания"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
          <button
            className={`btn ${anyReady ? 'btn-gold btn-hazard' : ''}`}
            style={{ flex: 2 }}
            disabled={!anyReady}
            onClick={() => {
              const n = claimAll();
              if (n > 0) {
                sfx.victory();
                toast(`Получено наград: ${n}`, 'rare');
              }
            }}
          >
            Забрать всё
          </button>
        </>
      }
    >
      <div className="seg quest-tabs">
        {QUEST_PERIODS.map((per) => {
          const n = questClaimable(profile, per);
          return (
            <button key={per} className={tab === per ? 'on' : ''} onClick={() => setTab(per)}>
              {per === 'day' ? 'День' : per === 'week' ? 'Неделя' : 'Месяц'}
              {n > 0 && <span className="tab-count">{n}</span>}
            </button>
          );
        })}
      </div>

      <div className={`quest-chest${bonusReady ? ' ready' : ''}`}>
        <div className="grow">
          <div className="quest-chest-t">
            {questConfig[tab].title}: {done}/{set.list.length}
          </div>
          <div style={{ margin: '6px 0' }}>
            <Bar value={done} max={Math.max(1, set.list.length)} color="#ffb347" thin />
          </div>
          <Res r={questBonus(tab)} />
        </div>
        <button
          className={`btn btn-sm ${bonusReady ? 'btn-gold btn-pulse' : ''}`}
          disabled={!bonusReady}
          onClick={() => {
            if (claimBonus(tab)) {
              sfx.victory();
              toast('Бонус за все задания получен', 'rare');
            }
          }}
        >
          {set.bonusClaimed ? 'Получено' : 'Сундук'}
        </button>
      </div>
      <ServerTime now={now} label="Новые задания через" left={periodEnds(tab, now) - now} />

      {set.list.map((q) => {
        const ok = q.progress >= q.target;
        return (
          <div key={q.id} className={`quest${q.claimed ? ' claimed' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b className="quest-t">
                {q.title}: {fmtNum(q.target)}
              </b>
              <span className="small">
                {fmtNum(q.progress)}/{fmtNum(q.target)}
              </span>
            </div>
            <div style={{ margin: '6px 0' }}>
              <Bar value={q.progress} max={q.target} color={ok ? '#5fd16a' : '#d9772e'} thin />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="grow">
                <Res r={q.reward} />
              </span>
              <button
                className={`btn btn-sm ${ok && !q.claimed ? 'btn-green' : ''}`}
                disabled={!ok || q.claimed}
                onClick={() => {
                  if (claimQuest(q.id)) {
                    sfx.item(true);
                    toast('Награда получена', 'good');
                  }
                }}
              >
                {q.claimed ? 'Получено' : 'Забрать'}
              </button>
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}
