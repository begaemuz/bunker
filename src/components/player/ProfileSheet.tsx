import { useEffect, useRef, useState } from 'react';
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

function VipGem({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="vg-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.5" stopColor="#f2a93b" />
          <stop offset="1" stopColor="#b45f12" />
        </linearGradient>
        <linearGradient id="vg-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3b6ff" />
          <stop offset="1" stopColor="#7a2fd0" />
        </linearGradient>
      </defs>
      <path d="M8 18l7 6 9-12 9 12 7-6-4 18H12z" fill="url(#vg-a)" stroke="#5a2c06" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="12" y="36" width="24" height="5" rx="2" fill="url(#vg-a)" stroke="#5a2c06" strokeWidth="1.5" />
      <path d="M24 22l4 5-4 5-4-5z" fill="url(#vg-b)" />
      <circle cx="8" cy="17" r="2.5" fill="#ffe9a8" />
      <circle cx="40" cy="17" r="2.5" fill="#ffe9a8" />
      <circle cx="24" cy="10" r="2.5" fill="#ffe9a8" />
    </svg>
  );
}

/** VIP: карточка статуса и листалка привилегий всех уровней. */
function VipTab() {
  const profile = useProfile((s) => s.profile)!;
  const openShop = useUi((s) => s.openShop);
  const cur = vipLevel(profile.vip.points);
  const max = VIP_THRESHOLDS.length - 1;
  const next = vipNext(profile.vip.points);
  const [view, setView] = useState(Math.min(max, Math.max(1, cur + 1)));
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current?.children[view - 1] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [view]);

  const onScroll = () => {
    const t = track.current;
    if (!t) return;
    const center = t.scrollLeft + t.clientWidth / 2;
    let best = 1;
    let dist = Infinity;
    Array.from(t.children).forEach((c, i) => {
      const el = c as HTMLElement;
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
      if (d < dist) {
        dist = d;
        best = i + 1;
      }
    });
    if (best !== view) setView(best);
  };

  const pct = next ? ((profile.vip.points - next.from) / (next.need - next.from)) * 100 : 100;

  return (
    <>
      <div className="vip-hero">
        <VipGem size={52} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="vip-hero-lvl">VIP {cur}</div>
          {next ? (
            <>
              <div className="vip-meter">
                <i style={{ width: `${Math.max(2, pct)}%` }} />
              </div>
              <div className="vip-hero-sub">
                {fmtNum(profile.vip.points)} / {fmtNum(next.need)} до VIP {next.level}
              </div>
            </>
          ) : (
            <div className="vip-hero-sub">Максимальный уровень</div>
          )}
        </div>
      </div>
      <div className="small muted" style={{ margin: '8px 2px 12px' }}>
        1 купленный кристалл = 1 очко VIP. Привилегии действуют навсегда.
      </div>

      <div className="vip-carousel">
        <div className="vip-track" ref={track} onScroll={onScroll}>
          {Array.from({ length: max }, (_, i) => {
            const lvl = i + 1;
            const lines = vipPerkLines(lvl).filter((l) => l !== 'VIP-рамки аватара');
            const prev = new Set(vipPerkLines(lvl - 1));
            const frames = FRAMES.filter((f) => f.req.vip === lvl);
            const got = cur >= lvl;
            return (
              <div key={lvl} className={`vip-card2${got ? ' got' : ''}${lvl === cur ? ' current' : ''}`}>
                <div className="vip-card2-top">
                  <span className="vip-card2-lvl">VIP {lvl}</span>
                  <span className={`vip-chip${got ? ' ok' : ''}`}>{lvl === cur ? 'Ваш уровень' : got ? 'Открыто' : `${fmtNum(VIP_THRESHOLDS[lvl])} очков`}</span>
                </div>
                <ul className="vip-list">
                  {lines.map((l) => (
                    <li key={l} className={prev.has(l) ? '' : 'new'}>
                      <span className="vip-tick">✓</span>
                      <span className="grow">{l}</span>
                      {!prev.has(l) && <span className="vip-new">новое</span>}
                    </li>
                  ))}
                  {frames.map((f) => (
                    <li key={f.id} className="new">
                      <span className="vip-tick">✓</span>
                      <span className="grow">Рамка «{f.name}»</span>
                      <span className="vip-new">новое</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <button className="vip-nav l" disabled={view <= 1} onClick={() => setView(Math.max(1, view - 1))} aria-label="Предыдущий VIP">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button className="vip-nav r" disabled={view >= max} onClick={() => setView(Math.min(max, view + 1))} aria-label="Следующий VIP">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="vip-steps">
        {Array.from({ length: max }, (_, i) => (
          <button key={i} className={`${i + 1 === view ? 'on' : ''}${i + 1 <= cur ? ' got' : ''}`} onClick={() => setView(i + 1)} aria-label={`VIP ${i + 1}`}>
            {i + 1}
          </button>
        ))}
      </div>

      <button className="btn btn-gold btn-hazard" style={{ width: '100%', marginTop: 14 }} onClick={() => openShop('special')}>
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
