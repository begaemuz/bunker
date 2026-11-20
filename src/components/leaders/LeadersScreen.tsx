import { useMemo, useState } from 'react';
import { computeBunkerStats } from '../../game/bunker/BunkerStats';
import { combatPower } from '../../game/bunker/compare';
import { vipLevel } from '../../game/meta/vip';
import { fmtNum } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { ResourceStrip } from '../common/Common';
import { UiIcon } from '../common/Icons';
import { PlayerAvatar } from '../player/Avatar';
import { playerNick } from '../player/ProfileSheet';

type Board = 'power' | 'level' | 'bosses';

const BOARDS: { id: Board; label: string; unit: string }[] = [
  { id: 'power', label: 'Боевая мощь', unit: '' },
  { id: 'level', label: 'Уровень', unit: 'ур.' },
  { id: 'bosses', label: 'Боссы', unit: 'побед' },
];

/**
 * Таблица лидеров. Пока сервера нет, в ней только сам игрок;
 * список других игроков подключится вместе с базой данных.
 */
export function LeadersScreen() {
  const profile = useProfile((s) => s.profile)!;
  const tg = useProfile((s) => s.tg);
  const setProfileOpen = useUi((s) => s.setProfileOpen);
  const [board, setBoard] = useState<Board>('power');
  const power = useMemo(
    () => combatPower(computeBunkerStats(profile)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.equipment, profile.items, profile.parts, profile.techs],
  );
  const value = board === 'power' ? power : board === 'level' ? profile.bunker.level : profile.stats.bossesKilled;
  const b = BOARDS.find((x) => x.id === board)!;

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Лидеры</h2>
        <ResourceStrip />
      </div>
      <div className="seg quest-tabs" style={{ margin: '14px 10px 0' }}>
        {BOARDS.map((x) => (
          <button key={x.id} className={board === x.id ? 'on' : ''} onClick={() => setBoard(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="screen-body">
        <div className="lb-podium">
          {[2, 1, 3].map((place) => (
            <div key={place} className={`lb-step p${place}`}>
              <span className="lb-place">{place}</span>
              <span className="lb-empty">свободно</span>
            </div>
          ))}
        </div>

        <div className="section-title">Ваше место</div>
        <button className="lb-row me" onClick={() => setProfileOpen(true)}>
          <span className="lb-rank">—</span>
          <PlayerAvatar avatar={profile.player.avatar} frame={profile.player.frame} level={profile.bunker.level} vip={vipLevel(profile.vip.points)} size={44} />
          <span className="grow lb-who">
            <b>{playerNick(profile.player.nick, tg?.first_name)}</b>
            <span className="small muted">это вы</span>
          </span>
          <span className="lb-val">
            {board === 'power' && <UiIcon kind="bolt" size={13} />} {fmtNum(value)} {b.unit}
          </span>
        </button>

        <div className="info-box" style={{ marginTop: 14 }}>
          Общий рейтинг всех игроков появится, когда подключим сервер с базой данных. Ваш прогресс уже считается — после подключения вы сразу займёте своё место.
        </div>
      </div>
    </div>
  );
}
