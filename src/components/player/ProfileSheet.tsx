import { useRef, useState } from 'react';
import { computeBunkerStats } from '../../game/bunker/BunkerStats';
import { combatPower } from '../../game/bunker/compare';
import { AVATARS, avatarDef, avatarFor, avatarGender, FRAMES, HAS_GENDERS, type Gender, frameUnlocked, VIP_GIFTS, VIP_THRESHOLDS, vipChest, vipLevel, vipNext, vipPerkList, type VipGift } from '../../game/meta/vip';
import { canClaimVipChest, giftClaimable } from '../../game/meta/vipActions';
import { itemTemplates } from '../../game/config/itemsConfig';
import { RESOURCE_KEYS, type Rarity } from '../../game/types';
import { ResourceIcon } from '../common/Icons';
import { xpForLevel } from '../../game/profile/Profile';
import { fmtNum, ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { UiIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { EngineerFace, PlayerAvatar } from './Avatar';

const GENDERS = [
  ['m', 'Мужской'],
  ['f', 'Женский'],
] as const;

export function playerNick(nick: string, tgName?: string): string {
  return nick.trim() || tgName || 'Инженер';
}

/**
 * Окно ввода ника: используется в профиле и при создании бункера.
 * При создании (pickGender) ещё выбирается пол — от него аватар и инженер.
 */
export function NickDialog({
  initial,
  title,
  onSave,
  onCancel,
  pickGender,
}: {
  initial: string;
  title: string;
  onSave: (nick: string, gender: Gender) => void;
  onCancel?: () => void;
  pickGender?: boolean;
}) {
  const [nick, setNick] = useState(initial);
  const [gender, setGender] = useState<Gender>('m');
  const v = nick.trim();
  const ok = v.length >= 2 && v.length <= 16;
  return (
    <div className="modal-back center" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {pickGender && HAS_GENDERS && (
          <div className="gender-pick">
            {GENDERS.map(([g, label]) => (
              <button key={g} className={`pick${gender === g ? ' on' : ''}`} onClick={() => setGender(g)}>
                <span className="pick-face" style={{ width: 64, height: 64 }}>
                  <EngineerFace id={avatarFor(g, 0)} size={64} />
                </span>
                <span className="pick-name">{label}</span>
              </button>
            ))}
          </div>
        )}
        <p className="small muted">От 2 до 16 символов. Его увидят другие игроки.</p>
        <input
          className="nick-input"
          style={{ width: '100%', margin: '6px 0 12px' }}
          value={nick}
          maxLength={16}
          autoFocus
          onChange={(e) => setNick(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ok) onSave(v, gender);
          }}
          placeholder="Ваш ник"
        />
        <div className="row">
          {onCancel && (
            <button className="btn" onClick={onCancel}>
              Отмена
            </button>
          )}
          <button className="btn btn-gold" disabled={!ok} onClick={() => onSave(v, gender)}>
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

function giftLabel(g: VipGift): string {
  const rar = (r: Rarity) => ru.rarity[r].toLowerCase();
  switch (g.kind) {
    case 'res':
      return RESOURCE_KEYS.filter((k) => g.res[k]).map((k) => `${ru.resource[k]} ×${fmtNum(g.res[k]!)}`).join(', ');
    case 'parts':
      return `${g.count} ${rar(g.rarity)} модификации`;
    case 'item':
      return `${ru.rarity[g.rarity]} ${g.category ? ru.category[g.category].toLowerCase() : 'вещь'} вашего тех. уровня`;
    case 'unique':
      return `Эксклюзив: ${itemTemplates.find((t) => t.id === g.templateId)?.name ?? ''}`;
    case 'avatar':
      return `Аватар «${[...new Set([avatarDef(g.id).name, avatarDef(avatarFor('f', g.id)).name])].join('» / «')}»`;
    case 'frame':
      return `Рамка «${FRAMES.find((f) => f.id === g.id)?.name ?? ''}»`;
  }
}

function Chevron({ dir }: { dir: 'l' | 'r' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'l' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

/** VIP: статус, ежедневный сундук и листалка уровней с привилегиями и подарками. */
function VipTab() {
  const profile = useProfile((s) => s.profile)!;
  const openShop = useUi((s) => s.openShop);
  const toast = useUi((s) => s.toast);
  const claimChest = useProfile((s) => s.claimVipChest);
  const claimGift = useProfile((s) => s.claimVipGift);
  const cur = vipLevel(profile.vip.points);
  const max = VIP_THRESHOLDS.length - 1;
  const next = vipNext(profile.vip.points);
  const firstGift = Array.from({ length: max }, (_, i) => i + 1).find((l) => giftClaimable(profile, l));
  const [view, setView] = useState(firstGift ?? Math.min(max, Math.max(1, cur + 1)));
  const touch = useRef<{ x: number; y: number } | null>(null);
  const pct = next ? ((profile.vip.points - next.from) / (next.need - next.from)) * 100 : 100;
  const chestReady = canClaimVipChest(profile);
  const chest = vipChest(Math.max(1, cur));

  const go = (d: number) => setView((v) => Math.max(1, Math.min(max, v + d)));
  const perks = vipPerkList(view);
  const prevKeys = new Set(vipPerkList(view - 1).map((x) => x.key));
  const gifts = VIP_GIFTS[view] ?? [];
  const reached = cur >= view;
  const giftTaken = (profile.vip.gifts ?? []).includes(view);

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

      <div className={`vip-chest${chestReady ? ' ready' : ''}`}>
        <div className="grow">
          <div className="vip-chest-t">Ежедневный VIP-сундук</div>
          <div className="res-list" style={{ justifyContent: 'flex-start' }}>
            {RESOURCE_KEYS.filter((k) => chest[k]).map((k) => (
              <span key={k} className="res">
                <ResourceIcon type={k} /> {fmtNum(chest[k]!)}
              </span>
            ))}
          </div>
        </div>
        <button
          className={`btn btn-sm ${chestReady ? 'btn-gold btn-pulse' : ''}`}
          disabled={!chestReady}
          onClick={() => {
            if (claimChest()) toast('VIP-сундук открыт', 'rare');
          }}
        >
          {cur < 1 ? 'С VIP 1' : chestReady ? 'Открыть' : 'Завтра'}
        </button>
      </div>

      <div
        className={`vip-sheet${reached ? ' got' : ''}${view === cur ? ' current' : ''}`}
        onTouchStart={(e) => {
          // свайп только с самой карточки, не с кнопок
          if ((e.target as HTMLElement).closest('button')) return;
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          // только явный горизонтальный свайп: прокрутка окна вверх-вниз уровень не меняет
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2.5) go(dx < 0 ? 1 : -1);
        }}
        onTouchCancel={() => (touch.current = null)}
      >
        <div className="vip-sheet-head">
          <button className="vip-arr" disabled={view <= 1} onClick={() => go(-1)} aria-label="Предыдущий VIP">
            <Chevron dir="l" />
          </button>
          <div className="vip-sheet-title">
            <span className="vip-sheet-lvl">VIP {view}</span>
            <span className={`vip-chip${reached ? ' ok' : ''}`}>{view === cur ? 'Ваш уровень' : reached ? 'Открыто' : `${fmtNum(VIP_THRESHOLDS[view])} очков`}</span>
          </div>
          <button className="vip-arr" disabled={view >= max} onClick={() => go(1)} aria-label="Следующий VIP">
            <Chevron dir="r" />
          </button>
        </div>

        <div className="vip-sec">Привилегии</div>
        <ul className="vip-list">
          {perks.map((x) => {
            const isNew = !prevKeys.has(x.key);
            return (
              <li key={x.key} className={isNew ? 'new' : ''}>
                <span className="vip-tick">✓</span>
                <span className="grow">{x.text}</span>
                {isNew && <span className="vip-new">новое</span>}
              </li>
            );
          })}
        </ul>

        {gifts.length > 0 && (
          <>
            <div className="vip-sec">Подарок за уровень</div>
            <div className="vip-gift">
              <ul className="vip-gift-list">
                {gifts.map((g, i) => (
                  <li key={i} className={g.kind === 'unique' ? 'excl' : ''}>
                    {giftLabel(g)}
                  </li>
                ))}
              </ul>
              <button
                className={`btn btn-sm ${giftClaimable(profile, view) ? 'btn-gold btn-pulse' : ''}`}
                disabled={!giftClaimable(profile, view)}
                onClick={() => {
                  if (claimGift(view)) toast(`Подарок VIP ${view} получен`, 'rare');
                }}
              >
                {giftTaken ? 'Получено' : reached ? 'Забрать' : 'Закрыто'}
              </button>
            </div>
          </>
        )}

        <div className="vip-steps">
          {Array.from({ length: max }, (_, i) => (
            <button
              key={i}
              className={`${i + 1 === view ? 'on' : ''}${i + 1 <= cur ? ' got' : ''}${giftClaimable(profile, i + 1) ? ' gift' : ''}`}
              onClick={() => setView(i + 1)}
              aria-label={`VIP ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="small muted" style={{ margin: '10px 2px 0' }}>
        1 купленный кристалл = 1 очко VIP. Привилегии и подарки — навсегда.
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
  const gender = avatarGender(profile.player.avatar);
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
          <>
            {HAS_GENDERS && (
              <div className="seg quest-tabs" style={{ marginBottom: 10 }}>
                {GENDERS.map(([g, label]) => (
                  <button
                    key={g}
                    className={gender === g ? 'on' : ''}
                    onClick={() => {
                      if (g === gender) return;
                      // Тот же по счёту аватар другого пола, если он открыт, иначе первый.
                      const same = avatarFor(g, profile.player.avatar);
                      setPlayer({ avatar: (avatarDef(same).vip ?? 0) <= vip ? same : avatarFor(g, 0) });
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="pick-grid">
              {AVATARS.filter((a) => a.gender === gender).map((a) => {
                const open = (a.vip ?? 0) <= vip;
                return (
                  <button
                    key={a.id}
                    className={`pick${profile.player.avatar === a.id ? ' on' : ''}${open ? '' : ' locked'}`}
                    onClick={() => (open ? setPlayer({ avatar: a.id }) : toast(`Нужен VIP ${a.vip}`, 'bad'))}
                  >
                    <span className="pick-face">
                      <EngineerFace id={a.id} size={56} />
                    </span>
                    <span className="pick-name">{open ? a.name : `VIP ${a.vip}`}</span>
                  </button>
                );
              })}
            </div>
          </>
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
