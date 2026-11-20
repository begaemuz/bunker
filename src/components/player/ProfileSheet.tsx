import { useState } from 'react';
import { computeBunkerStats } from '../../game/bunker/BunkerStats';
import { combatPower } from '../../game/bunker/compare';
import { AVATARS, FRAMES, frameUnlocked, VIP_THRESHOLDS, vipLevel, vipNext, vipPerkLines } from '../../game/meta/vip';
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

/** Окно ввода ника: используется в профиле и при создании бункера. */
export function NickDialog({ initial, title, onSave, onCancel }: { initial: string; title: string; onSave: (nick: string) => void; onCancel?: () => void }) {
  const [nick, setNick] = useState(initial);
  const v = nick.trim();
  const ok = v.length >= 2 && v.length <= 16;
  return (
    <div className="modal-back center" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="small muted">От 2 до 16 символов. Его увидят другие игроки.</p>
        <input
          className="nick-input"
          style={{ width: '100%', margin: '6px 0 12px' }}
          value={nick}
          maxLength={16}
          autoFocus
          onChange={(e) => setNick(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ok) onSave(v);
          }}
          placeholder="Ваш ник"
        />
        <div className="row">
          {onCancel && (
            <button className="btn" onClick={onCancel}>
              Отмена
            </button>
          )}
          <button className="btn btn-gold" disabled={!ok} onClick={() => onSave(v)}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

/** Листалка уровней VIP: что даёт каждый уровень. */
function VipTab() {
  const profile = useProfile((s) => s.profile)!;
  const openShop = useUi((s) => s.openShop);
  const cur = vipLevel(profile.vip.points);
  const max = VIP_THRESHOLDS.length - 1;
  const [view, setView] = useState(Math.min(max, Math.max(1, cur + 1)));
  const next = vipNext(profile.vip.points);
  const need = VIP_THRESHOLDS[view];
  const reached = cur >= view;
  const frames = FRAMES.filter((f) => f.req.vip === view);
  return (
    <>
      <div className="vip-card">
        <div className="vip-top">
          <span className="vip-badge">VIP {cur}</span>
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
        <div className="small muted" style={{ marginTop: 8 }}>
          Очки VIP начисляются за покупку кристаллов: 1 кристалл = 1 очко.
        </div>
      </div>

      <div className="vip-browser">
        <button className="btn vip-arrow" disabled={view <= 1} onClick={() => setView(view - 1)} aria-label="Предыдущий VIP">
          ‹
        </button>
        <div className={`vip-page${reached ? ' reached' : ''}`}>
          <div className="vip-page-head">
            <span className="vip-badge big">VIP {view}</span>
            <span className="small">{reached ? 'Получено' : `${fmtNum(need)} очков`}</span>
          </div>
          <ul className="vip-perks">
            {vipPerkLines(view)
              .filter((l) => l !== 'VIP-рамки аватара')
              .map((l) => (
                <li key={l}>{l}</li>
              ))}
            {frames.map((f) => (
              <li key={f.id}>Рамка «{f.name}»</li>
            ))}
          </ul>
          <div className="vip-dots">
            {Array.from({ length: max }, (_, i) => (
              <i key={i} className={`${i + 1 === view ? 'on' : ''}${i + 1 <= cur ? ' got' : ''}`} onClick={() => setView(i + 1)} />
            ))}
          </div>
        </div>
        <button className="btn vip-arrow" disabled={view >= max} onClick={() => setView(view + 1)} aria-label="Следующий VIP">
          ›
        </button>
      </div>
      <button className="btn btn-gold btn-hazard" style={{ width: '100%', marginTop: 12 }} onClick={() => openShop('special')}>
        Купить кристаллы
      </button>
    </>
  );
}

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const tg = useProfile((s) => s.tg);
  const setPlayer = useProfile((s) => s.setPlayer);
  const toast = useUi((s) => s.toast);
  const [tab, setTab] = useState<'vip' | 'avatar' | 'frame'>('vip');
  const [editing, setEditing] = useState(false);
  const lvl = profile.bunker.level;
  const vip = vipLevel(profile.vip.points);
  const power = combatPower(computeBunkerStats(profile));
  const name = playerNick(profile.player.nick, tg?.first_name);

  return (
    <>
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
            <div className="prof-name-row">
              <div className="prof-nick">{name}</div>
              <button className="btn btn-sm edit-btn" onClick={() => setEditing(true)} aria-label="Редактировать ник">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            </div>
            <div className="small muted">
              Уровень {lvl} · опыт {fmtNum(Math.floor(profile.bunker.xp))} / {fmtNum(xpForLevel(lvl))}
            </div>
            <div className="power" style={{ marginTop: 4 }}>
              <UiIcon kind="bolt" size={14} /> {fmtNum(power)} боевой мощи
            </div>
          </div>
        </div>

        <div className="seg quest-tabs" style={{ marginTop: 14 }}>
          {(
            [
              ['vip', 'VIP'],
              ['avatar', 'Аватар'],
              ['frame', 'Рамка'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'vip' && <VipTab />}

        {tab === 'avatar' && (
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
        )}

        {tab === 'frame' && (
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
        )}
      </Sheet>
      {editing && (
        <NickDialog
          title="Ник"
          initial={name}
          onCancel={() => setEditing(false)}
          onSave={(n) => {
            setPlayer({ nick: n });
            setEditing(false);
            toast('Ник сохранён', 'good');
          }}
        />
      )}
    </>
  );
}
