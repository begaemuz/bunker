import { useEffect } from 'react';
import { dailyRewards, questAllBonus } from '../../game/config/metaConfig';
import { canClaimDaily, canClaimQuestBonus, dailyReward } from '../../game/meta/Meta';
import { RESOURCE_KEYS, type Resources } from '../../game/types';
import { fmtNum } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { Bar } from '../common/Common';
import { ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';

function Res({ r }: { r: Partial<Resources> }) {
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 8, fontWeight: 800, fontSize: 12 }}>
      {RESOURCE_KEYS.filter((k) => r[k]).map((k) => (
        <span key={k} className="res">
          <ResourceIcon type={k} /> {fmtNum(r[k]!)}
        </span>
      ))}
    </span>
  );
}

/** Есть ли что забрать: для значка на кнопке. */
export function useQuestBadge(): number {
  return useProfile((s) => {
    const p = s.profile!;
    return (canClaimDaily(p) ? 1 : 0) + p.quests.list.filter((q) => !q.claimed && q.progress >= q.target).length + (canClaimQuestBonus(p) ? 1 : 0);
  });
}

export function QuestsSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const ensureMeta = useProfile((s) => s.ensureMeta);
  const claimDaily = useProfile((s) => s.claimDaily);
  const claimQuest = useProfile((s) => s.claimQuest);
  const claimBonus = useProfile((s) => s.claimQuestBonus);
  const toast = useUi((s) => s.toast);

  useEffect(() => ensureMeta(), [ensureMeta]);
  const daily = canClaimDaily(profile);
  const today = profile.daily.cycle;

  return (
    <Sheet
      title="Задания и награды"
      onClose={onClose}
      actions={
        <button className="btn btn-ghost btn-block" onClick={onClose}>
          Закрыть
        </button>
      }
    >
      <div className="section-title" style={{ marginTop: 0 }}>
        <span>Награда за вход</span>
        <span>день {today + 1} из 7</span>
      </div>
      <div className="day-grid">
        {dailyRewards.map((_, i) => {
          const r = dailyReward(profile, i);
          const done = i < today;
          const isToday = i === today && daily;
          const main = RESOURCE_KEYS.find((k) => k !== 'coins' && r[k]) ?? 'coins';
          return (
            <div key={i} className={`day${isToday ? ' today' : ''}${done && !isToday ? ' done' : ''}`}>
              <div style={{ fontWeight: 900, marginBottom: 4 }}>День {i + 1}</div>
              <ResourceIcon type={main} size={22} />
              <div style={{ marginTop: 3 }}>{fmtNum(r[main]!)}</div>
            </div>
          );
        })}
      </div>
      <button
        className={`btn btn-block ${daily ? 'btn-gold btn-pulse' : ''}`}
        style={{ marginTop: 8 }}
        disabled={!daily}
        onClick={() => {
          const r = claimDaily();
          if (r) {
            sfx.levelUp();
            toast('Награда за вход получена', 'good');
          }
        }}
      >
        {daily ? 'Забрать награду дня' : 'Возвращайтесь завтра'}
      </button>

      <div className="section-title">Ежедневные задания</div>
      {profile.quests.list.map((q) => {
        const done = q.progress >= q.target;
        return (
          <div key={q.id} className="quest" style={{ opacity: q.claimed ? 0.5 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b style={{ fontSize: 13 }}>
                {q.title}: {fmtNum(q.target)}
              </b>
              <span className="small">
                {fmtNum(q.progress)}/{fmtNum(q.target)}
              </span>
            </div>
            <div style={{ margin: '6px 0' }}>
              <Bar value={q.progress} max={q.target} color={done ? '#5fd16a' : '#d9772e'} thin />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="grow">
                <Res r={q.reward} />
              </span>
              <button
                className={`btn btn-sm ${done && !q.claimed ? 'btn-green' : ''}`}
                disabled={!done || q.claimed}
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
      <div className="quest" style={{ borderColor: '#5e4a16' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="grow">
            <b style={{ fontSize: 13 }}>Все задания дня</b>
            <br />
            <Res r={questAllBonus} />
          </span>
          <button
            className="btn btn-sm btn-gold"
            disabled={!canClaimQuestBonus(profile)}
            onClick={() => {
              if (claimBonus()) {
                sfx.victory();
                toast('Бонус за все задания получен', 'rare');
              }
            }}
          >
            {profile.quests.bonusClaimed ? 'Получено' : 'Забрать'}
          </button>
        </div>
      </div>
      <div className="small muted" style={{ textAlign: 'center' }}>
        Задания и награды обновляются каждый день по времени устройства.
      </div>
    </Sheet>
  );
}
