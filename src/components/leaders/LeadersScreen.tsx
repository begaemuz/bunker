import { useEffect, useMemo, useState } from 'react';
import { serverAvailable, serverLeaders, type LeaderRow } from '../../services/server';
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
  const online = serverAvailable();
  const [data, setData] = useState<{ list: LeaderRow[]; rank: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!online) return;
    let alive = true;
    setLoading(true);
    void serverLeaders(board).then((r) => {
      if (!alive) return;
      setData(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [board, online]);
  const list = data?.list ?? [];
  const top3 = [list[1], list[0], list[2]];
  const rest = list.slice(3);
  const nickOf = (r: LeaderRow) => (r.me ? playerNick(profile.player.nick, tg?.first_name) : r.nick || 'Инженер');

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
          {[2, 1, 3].map((place, i) => {
            const r = top3[i];
            return (
              <div key={place} className={`lb-step p${place}${r?.me ? ' me' : ''}`}>
                {r && <PlayerAvatar avatar={r.avatar} frame={r.frame} level={r.level} vip={vipLevel(r.vip)} size={place === 1 ? 52 : 44} />}
                <span className="lb-place">{place}</span>
                {r ? (
                  <span className="lb-pname">
                    <b>{nickOf(r)}</b>
                    <span className="small">{fmtNum(r.value)} {b.unit}</span>
                  </span>
                ) : (
                  <span className="lb-empty">{loading ? '…' : 'свободно'}</span>
                )}
              </div>
            );
          })}
        </div>

        {rest.length > 0 && (
          <div className="lb-list">
            {rest.map((r, i) => (
              <div key={i} className={`lb-row${r.me ? ' me' : ''}`}>
                <span className="lb-rank">{i + 4}</span>
                <PlayerAvatar avatar={r.avatar} frame={r.frame} level={r.level} vip={vipLevel(r.vip)} size={38} />
                <span className="grow lb-who">
                  <b>{nickOf(r)}</b>
                </span>
                <span className="lb-val">
                  {board === 'power' && <UiIcon kind="bolt" size={13} />} {fmtNum(r.value)} {b.unit}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="section-title">Ваше место</div>
        <button className="lb-row me" onClick={() => setProfileOpen(true)}>
          <span className="lb-rank">{data?.rank ?? '—'}</span>
          <PlayerAvatar avatar={profile.player.avatar} frame={profile.player.frame} level={profile.bunker.level} vip={vipLevel(profile.vip.points)} size={44} />
          <span className="grow lb-who">
            <b>{playerNick(profile.player.nick, tg?.first_name)}</b>
            <span className="small muted">это вы</span>
          </span>
          <span className="lb-val">
            {board === 'power' && <UiIcon kind="bolt" size={13} />} {fmtNum(value)} {b.unit}
          </span>
        </button>

        {!online && (
          <div className="info-box" style={{ marginTop: 14 }}>
            Общий рейтинг виден при запуске игры через Telegram-бота.
          </div>
        )}
        {online && !loading && !data && (
          <div className="info-box" style={{ marginTop: 14 }}>
            Не удалось загрузить рейтинг. Проверьте интернет и откройте вкладку ещё раз.
          </div>
        )}
      </div>
    </div>
  );
}
