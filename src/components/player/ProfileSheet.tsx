import { useState } from 'react';
import { computeBunkerStats } from '../../game/bunker/BunkerStats';
import { combatPower } from '../../game/bunker/compare';
import { AVATARS, FRAMES, frameUnlocked, vipLevel, vipNext, vipPerkLines } from '../../game/meta/vip';
import { xpForLevel } from '../../game/profile/Profile';
import { fmtNum } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { UiIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { EngineerFace, PlayerAvatar } from './Avatar';

export function playerNick(nick: string, tgName?: string): string {
  return nick.trim() || tgName || 'Инженер';
}

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const tg = useProfile((s) => s.tg);
  const setPlayer = useProfile((s) => s.setPlayer);
  const openShop = useUi((s) => s.openShop);
  const toast = useUi((s) => s.toast);
  const [nick, setNick] = useState(playerNick(profile.player.nick, tg?.first_name));
  const lvl = profile.bunker.level;
  const vip = vipLevel(profile.vip.points);
  const next = vipNext(profile.vip.points);
  const power = combatPower(computeBunkerStats(profile));

  const saveNick = () => {
    const v = nick.trim().slice(0, 16);
    if (v.length < 2) {
      toast('Ник — от 2 символов', 'bad');
      return;
    }
    setPlayer({ nick: v });
    toast('Ник сохранён', 'good');
  };

  return (
    <Sheet
      title="Профиль"
      onClose={onClose}
      actions={
        <button className="btn btn-ghost grow" onClick={onClose}>
          Закрыть
        </button>
      }
    >
      <div className="prof-head">
        <PlayerAvatar avatar={profile.player.avatar} frame={profile.player.frame} level={lvl} progress={profile.bunker.xp / xpForLevel(lvl)} vip={vip} size={84} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="prof-nick">{playerNick(profile.player.nick, tg?.first_name)}</div>
          <div className="small muted">
            Уровень {lvl} · опыт {fmtNum(Math.floor(profile.bunker.xp))} / {fmtNum(xpForLevel(lvl))}
          </div>
          <div className="power" style={{ marginTop: 4 }}>
            <UiIcon kind="bolt" size={14} /> {fmtNum(power)} боевой мощи
          </div>
        </div>
      </div>

      <div className="section-title">Ник</div>
      <div className="nick-row">
        <input className="nick-input" value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} placeholder="Ваш ник" />
        <button className="btn btn-primary btn-sm" onClick={saveNick}>
          Сохранить
        </button>
      </div>

      <div className="section-title">Аватар</div>
      <div className="pick-grid">
        {AVATARS.map((a) => (
          <button key={a.id} className={`pick${profile.player.avatar === a.id ? ' on' : ''}`} onClick={() => setPlayer({ avatar: a.id })}>
            <span className="pick-face">
              <EngineerFace id={a.id} size={56} />
            </span>
            <span className="pick-name">{a.name}</span>
          </button>
        ))}
      </div>

      <div className="section-title">Рамка</div>
      <div className="pick-grid">
        {FRAMES.map((f) => {
          const open = frameUnlocked(f, lvl, vip);
          return (
            <button
              key={f.id}
              className={`pick${profile.player.frame === f.id ? ' on' : ''}${open ? '' : ' locked'}`}
              onClick={() => (open ? setPlayer({ frame: f.id }) : toast(f.req.vip ? `Нужен VIP ${f.req.vip}` : `Нужен уровень ${f.req.level}`, 'bad'))}
            >
              <PlayerAvatar avatar={profile.player.avatar} frame={f.id} size={56} />
              <span className="pick-name">{open ? f.name : f.req.vip ? `VIP ${f.req.vip}` : `Ур. ${f.req.level}`}</span>
            </button>
          );
        })}
      </div>

      <div className="section-title">VIP-статус</div>
      <div className="vip-card">
        <div className="vip-top">
          <span className="vip-badge">VIP {vip}</span>
          <div className="grow">
            {next ? (
              <>
                <div className="small">
                  До VIP {next.level}: {fmtNum(profile.vip.points)} / {fmtNum(next.need)} очков
                </div>
                <div className="vip-bar">
                  <i style={{ width: `${((profile.vip.points - next.from) / (next.need - next.from)) * 100}%` }} />
                </div>
              </>
            ) : (
              <div className="small">Максимальный VIP</div>
            )}
          </div>
        </div>
        <div className="small muted" style={{ margin: '8px 0' }}>
          Очки VIP начисляются за покупку кристаллов: 1 кристалл = 1 очко.
        </div>
        <ul className="vip-perks">
          {(vip > 0 ? vipPerkLines(vip) : ['Пока без бонусов']).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {next && (
          <div className="small muted" style={{ marginTop: 6 }}>
            На VIP {next.level}: {vipPerkLines(next.level).join(', ')}
          </div>
        )}
        <button className="btn btn-gold btn-hazard" style={{ width: '100%', marginTop: 10 }} onClick={() => openShop('special')}>
          Купить кристаллы
        </button>
      </div>
    </Sheet>
  );
}
