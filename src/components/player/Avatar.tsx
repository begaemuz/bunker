import { FRAMES } from '../../game/meta/vip';
import { avatarUrl } from './engineerArt';

/** Портрет инженера по номеру аватара. */
export function EngineerFace({ id, size = 56 }: { id: number; size?: number }) {
  return (
    <span className="eng-face" style={{ width: size, height: size }}>
      <img src={avatarUrl(id)} width={size} height={size} alt="" draggable={false} />
    </span>
  );
}

/** Аватар игрока: рамка, кольцо прогресса уровня, уровень снизу, VIP сверху. */
export function PlayerAvatar({
  avatar,
  frame,
  level,
  progress,
  vip,
  size = 52,
  onClick,
}: {
  avatar: number;
  frame: string;
  level?: number;
  progress?: number;
  vip?: number;
  size?: number;
  onClick?: () => void;
}) {
  const f = FRAMES.find((x) => x.id === frame) ?? FRAMES[0];
  const R = 46;
  const C = 2 * Math.PI * R;
  const inner = Math.round(size * 0.78);
  const body = (
    <>
      <svg className="pavatar-ring" viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={`fr-${f.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={f.colors[0]} />
            <stop offset="1" stopColor={f.colors[1]} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="#0b0e11" stroke={`url(#fr-${f.id})`} strokeWidth="8" />
        {progress !== undefined && (
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="#ffd06a"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={`${C * Math.max(0.001, Math.min(1, progress))} ${C}`}
            transform="rotate(-90 50 50)"
          />
        )}
      </svg>
      <span className="pavatar-face" style={{ width: inner, height: inner }}>
        <EngineerFace id={avatar} size={inner} />
      </span>
      {level !== undefined && <span className="pavatar-lvl">{level}</span>}
      {!!vip && <span className="pavatar-vip">VIP {vip}</span>}
    </>
  );
  return onClick ? (
    <button className="pavatar" style={{ width: size, height: size }} onClick={onClick} aria-label="Профиль">
      {body}
    </button>
  ) : (
    <span className="pavatar" style={{ width: size, height: size }}>
      {body}
    </span>
  );
}
