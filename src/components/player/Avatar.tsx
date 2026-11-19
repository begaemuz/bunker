import { AVATARS, FRAMES } from '../../game/meta/vip';

/** Портрет инженера: SVG, у каждого свой цвет снаряжения и причёска. */
export function EngineerFace({ id, size = 56 }: { id: number; size?: number }) {
  const a = AVATARS[id] ?? AVATARS[0];
  const style = id % 3;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id={`av-bg-${id}`} cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor="#2f3a44" />
          <stop offset="1" stopColor="#0f1418" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#av-bg-${id})`} />
      {/* плечи и куртка */}
      <path d="M8 64c2-13 11-19 24-19s22 6 24 19z" fill="#2d343b" />
      <path d="M20 64l4-17h16l4 17z" fill={a.gear} opacity="0.85" />
      {/* шея и голова */}
      <rect x="27" y="38" width="10" height="9" rx="3" fill={a.skin} />
      <ellipse cx="32" cy="29" rx="12" ry="13.5" fill={a.skin} />
      {/* волосы */}
      {style === 0 && <path d="M20 26c0-9 6-13 12-13s12 4 12 13c-3-4-7-6-12-6s-9 2-12 6z" fill={a.hair} />}
      {style === 1 && (
        <path d="M19 30c-1-11 5-17 13-17s14 6 13 17c-1-5-3-8-5-9-3 3-9 4-16 3-2 1-4 3-5 6zM19 30c0 6 1 11 3 13l-3 1zM45 30c0 6-1 11-3 13l3 1z" fill={a.hair} />
      )}
      {style === 2 && <path d="M21 22c2-6 6-9 11-9s9 3 11 9c-4-2-7-3-11-3s-7 1-11 3z" fill={a.hair} />}
      {/* очки-визор на лбу */}
      <rect x="19" y="19" width="26" height="7" rx="3.5" fill="#1a1f24" />
      <rect x="21.5" y="20.5" width="9" height="4" rx="2" fill={a.visor} />
      <rect x="33.5" y="20.5" width="9" height="4" rx="2" fill={a.visor} />
      <rect x="22.5" y="21" width="3" height="1.4" rx="0.7" fill="#fff" opacity="0.7" />
      {/* лицо */}
      <circle cx="27.5" cy="31" r="1.4" fill="#1b1410" />
      <circle cx="36.5" cy="31" r="1.4" fill="#1b1410" />
      <path d="M28.5 37c2 1.4 5 1.4 7 0" fill="none" stroke="#6b3d2a" strokeWidth="1.4" strokeLinecap="round" />
      {/* гарнитура */}
      <rect x="17.5" y="27" width="4" height="7" rx="2" fill="#1a1f24" />
      <path d="M19.5 34q1 5 7 5" fill="none" stroke="#1a1f24" strokeWidth="1.5" />
      <circle cx="27" cy="39" r="1.3" fill={a.gear} />
    </svg>
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
