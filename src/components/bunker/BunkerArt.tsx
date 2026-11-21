import { modeConfig } from '../../game/config/gameConfig';
import type { Profile } from '../../game/profile/Profile';
import type { SlotId } from '../../game/types';
import engineerUrl from '../../assets/engineer.webp';
import { rarityColor } from '../../ui/theme';

/**
 * Лаборатория бункера: инженер в белом халате за рабочим столом (рисунок).
 * Каждый установленный модуль оживляет свой прибор: катушки на столе,
 * реактор, накопители, радио-преобразователь, вентилятор, монитор
 * сенсоров и голограмма защитного контура.
 */
export function BunkerArt({ profile, highlight }: { profile: Profile; highlight?: SlotId | null }) {
  const it = (s: SlotId) => {
    const id = profile.equipment[s];
    return id ? profile.items[id] : null;
  };
  const col = (s: SlotId, off = '#3a434c') => {
    const x = it(s);
    return x ? rarityColor[x.rarity] : off;
  };
  const coilCol = (s: 'coil1' | 'coil2') => {
    const x = it(s);
    return x?.coil ? modeConfig[x.coil.mode].color : x ? rarityColor[x.rarity] : null;
  };
  const c1 = coilCol('coil1');
  const c2 = coilCol('coil2');
  const on = (s: SlotId) => !!it(s);
  const ring = (s: SlotId, cx: number, cy: number, r: number) =>
    highlight === s ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f2a93b" strokeWidth="2" strokeDasharray="4 3" /> : null;

  return (
    <svg className="bunker-art" viewBox="0 0 200 262" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Лаборатория бункера">
      <defs>
        <linearGradient id="lb-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2a2e" />
          <stop offset="1" stopColor="#101719" />
        </linearGradient>
        <radialGradient id="lb-lamp" cx="50%" cy="0%" r="80%">
          <stop offset="0" stopColor="#fff4d6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff4d6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lb-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b6772" />
          <stop offset="0.12" stopColor="#3c4650" />
          <stop offset="1" stopColor="#1f262c" />
        </linearGradient>
        <linearGradient id="lb-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4c5660" />
          <stop offset="0.5" stopColor="#8a96a0" />
          <stop offset="1" stopColor="#3e474f" />
        </linearGradient>
        <radialGradient id="lb-reactor">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor={col('generator', '#55606a')} />
          <stop offset="1" stopColor={col('generator', '#2a3138')} stopOpacity="0.2" />
        </radialGradient>
        <filter id="lb-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* стена лаборатории */}
      <rect width="200" height="300" fill="url(#lb-wall)" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 50 + 2} y="8" width="46" height="190" rx="3" fill="none" stroke="#24363b" strokeWidth="1" />
      ))}
      <path d="M0 196h200" stroke="#2b3d42" strokeWidth="2" />
      {/* лампа и свет */}
      <path d="M100 0v10" stroke="#3a4a4f" strokeWidth="2" />
      <path d="M88 10h24l-4 7H92z" fill="#4a5a60" />
      <path d="M60 300L92 17h16l32 283z" fill="url(#lb-lamp)" />

      {/* полка с колбами */}
      <rect x="8" y="44" width="58" height="4" rx="1" fill="#4a3a2a" />
      {[
        { x: 14, h: 16, c: '#7be38a' },
        { x: 28, h: 22, c: '#46d4ff' },
        { x: 44, h: 14, c: '#ff9f2e' },
        { x: 56, h: 18, c: '#b46bff' },
      ].map((j, i) => (
        <g key={i}>
          <rect x={j.x - 4} y={44 - j.h} width="8" height={j.h} rx="2" fill="#9fb3bb" opacity="0.25" stroke="#c9d6dc" strokeWidth="0.6" />
          <rect x={j.x - 3} y={44 - j.h * 0.6} width="6" height={j.h * 0.6 - 1} rx="1.5" fill={j.c} opacity="0.75" />
          <rect x={j.x - 2} y={44 - j.h - 3} width="4" height="3" fill="#5a4636" />
        </g>
      ))}

      {/* вентилятор — охлаждение */}
      <g transform="translate(36 82)">
        <circle r="18" fill="#1a2326" stroke={col('cooling', '#3a4a4f')} strokeWidth="2.5" />
        <circle r="14" fill="#0f1517" />
        <g className={on('cooling') ? 'ba-spin' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d="M0 0 C 3 -6 9 -9 12 -6 C 10 -2 5 0 0 0z" fill={col('cooling', '#56656b')} transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r="3" fill="#2a3438" />
        {ring('cooling', 0, 0, 22)}
      </g>

      {/* монитор сенсоров */}
      <g transform="translate(118 30)">
        <rect width="72" height="52" rx="5" fill="#1d262a" stroke="#45555b" strokeWidth="2" />
        <rect x="5" y="5" width="62" height="40" rx="2" fill="#071113" />
        {on('sensor') ? (
          <>
            <path d="M8 26 l7 0 l4 -10 l5 20 l5 -14 l4 6 l6 0 l3 -8 l4 14 l5 -10 l9 0" fill="none" stroke={col('sensor')} strokeWidth="1.6" />
            <circle cx="56" cy="14" r="5" fill="none" stroke={col('sensor')} strokeWidth="1" opacity="0.7" />
            <path d="M56 14 l4 -3" stroke={col('sensor')} strokeWidth="1" />
            <rect x="8" y="36" width="20" height="3" fill={col('sensor')} opacity="0.6" />
          </>
        ) : (
          <text x="36" y="29" textAnchor="middle" fontSize="7" fill="#45555b" style={{ fontFamily: 'var(--display)' }}>
            НЕТ СИГНАЛА
          </text>
        )}
        <rect x="30" y="52" width="12" height="8" fill="#2a3438" />
        {ring('sensor', 36, 26, 40)}
      </g>

      {/* голограмма защитного контура */}
      {on('shield') && (
        <g opacity="0.85">
          <path d="M100 52 l20 11 v20 l-20 11 l-20 -11 v-20z" fill={col('shield')} opacity="0.12" />
          <path d="M100 52 l20 11 v20 l-20 11 l-20 -11 v-20z" fill="none" stroke={col('shield')} strokeWidth="1.4">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2.4s" repeatCount="indefinite" />
          </path>
          <path d="M100 62 l11 6 v11 l-11 6 l-11 -6 v-11z" fill="none" stroke={col('shield')} strokeWidth="0.8" opacity="0.7" />
        </g>
      )}
      {ring('shield', 100, 73, 26)}

      {/* ───── инженер ───── */}
      <ellipse cx="100" cy="224" rx="56" ry="8" fill="#000" opacity="0.35" />
      <image href={engineerUrl} x="41" y="90" width="123.3" height="144.5" preserveAspectRatio="xMidYMin meet" />

      {/* ───── стол ───── */}
      <rect x="0" y="226" width="200" height="74" fill="url(#lb-desk)" />
      <rect x="0" y="226" width="200" height="4" fill="#77848f" />
      <path d="M0 246h200" stroke="#1a2025" strokeWidth="1" />
      {[20, 60, 140, 180].map((x) => (
        <circle key={x} cx={x} cy="238" r="1.6" fill="#1a2025" />
      ))}

      {/* катушка 1 — слева на столе */}
      <g transform="translate(26 226)">
        <rect x="-10" y="-6" width="20" height="6" rx="1.5" fill="url(#lb-metal)" />
        <rect x="-3" y="-38" width="6" height="32" fill="#2c343b" />
        {[-34, -28, -22, -16, -10].map((y) => (
          <rect key={y} x="-7" y={y} width="14" height="3.4" rx="1.7" fill={c1 ?? '#4a555e'} />
        ))}
        <circle cy="-44" r="7" fill={c1 ?? '#55606a'} stroke="#1c2226" strokeWidth="1.5" />
        {c1 && (
          <>
            <circle cy="-44" r="11" fill={c1} opacity="0.5" filter="url(#lb-glow)">
              <animate attributeName="opacity" values="0.25;0.75;0.25" dur="1.4s" repeatCount="indefinite" />
            </circle>
            <path d="M0 -51 l-4 -7 l5 -2 l-3 -8" stroke="#fff" strokeWidth="1.2" fill="none">
              <animate attributeName="opacity" values="0;1;0;0" dur="1s" repeatCount="indefinite" />
            </path>
          </>
        )}
        {ring('coil1', 0, -26, 26)}
      </g>

      {/* накопители — банки */}
      <g transform="translate(46 226)">
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={i * 9} y="-20" width="7" height="20" rx="2" fill="#1d2428" stroke={col('capacitor', '#3a434c')} strokeWidth="1" />
            <rect x={i * 9 + 1.5} y={on('capacitor') ? -16 + i * 2 : -3} width="4" height={on('capacitor') ? 15 - i * 2 : 2} rx="1" fill={col('capacitor', '#3a434c')} opacity="0.9" />
            <rect x={i * 9 + 2} y="-23" width="3" height="3" fill="#8a96a0" />
          </g>
        ))}
        {ring('capacitor', 12, -12, 18)}
      </g>

      {/* радио-преобразователь */}
      <g transform="translate(78 226)">
        <rect x="0" y="-26" width="44" height="26" rx="4" fill="#3b2f26" stroke="#1f1813" strokeWidth="1.2" />
        <rect x="3" y="-23" width="20" height="20" rx="2" fill="#24201c" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M5 ${-20 + i * 4}h16`} stroke="#4a3f36" strokeWidth="1.4" />
        ))}
        <rect x="26" y="-22" width="15" height="7" rx="1.5" fill="#0d1a14" />
        <path d="M27 -18.5 q2 -3 4 0 t4 0 t4 0" fill="none" stroke={col('converter', '#3a4a40')} strokeWidth="1.2" strokeDasharray="2 1">
          {on('converter') && <animate attributeName="stroke-dashoffset" from="0" to="6" dur="0.8s" repeatCount="indefinite" />}
        </path>
        <circle cx="30" cy="-8" r="3.5" fill="#8a96a0" stroke="#2a3438" />
        <circle cx="38" cy="-8" r="3.5" fill="#8a96a0" stroke="#2a3438" />
        <path d="M40 -26 l8 -22" stroke="#8a96a0" strokeWidth="1.4" />
        <circle cx="48" cy="-48" r="1.8" fill={on('converter') ? col('converter') : '#8a96a0'} />
        {ring('converter', 22, -14, 26)}
      </g>

      {/* реактор-генератор */}
      <g transform="translate(152 226)">
        <rect x="-11" y="-6" width="22" height="6" rx="1.5" fill="url(#lb-metal)" />
        <rect x="-9" y="-36" width="18" height="30" rx="4" fill="#0d1418" stroke="#55626b" strokeWidth="1.5" />
        <rect x="-6" y="-33" width="12" height="24" rx="3" fill="url(#lb-reactor)">
          {on('generator') && <animate attributeName="opacity" values="0.75;1;0.75" dur="1.6s" repeatCount="indefinite" />}
        </rect>
        <rect x="-11" y="-40" width="22" height="5" rx="1.5" fill="url(#lb-metal)" />
        {on('generator') && <ellipse cy="-20" rx="14" ry="18" fill={col('generator')} opacity="0.18" filter="url(#lb-glow)" />}
        {ring('generator', 0, -20, 24)}
      </g>

      {/* катушка 2 — справа на столе */}
      <g transform="translate(180 226)">
        <rect x="-9" y="-6" width="18" height="6" rx="1.5" fill="url(#lb-metal)" />
        <rect x="-2.5" y="-32" width="5" height="26" fill="#2c343b" />
        {[-28, -22, -16, -10].map((y) => (
          <rect key={y} x="-6" y={y} width="12" height="3.2" rx="1.6" fill={c2 ?? '#4a555e'} />
        ))}
        <circle cy="-37" r="6" fill={c2 ?? '#55606a'} stroke="#1c2226" strokeWidth="1.5" />
        {c2 && (
          <circle cy="-37" r="10" fill={c2} opacity="0.5" filter="url(#lb-glow)">
            <animate attributeName="opacity" values="0.25;0.75;0.25" dur="1.7s" repeatCount="indefinite" />
          </circle>
        )}
        {ring('coil2', 0, -22, 22)}
      </g>

      {/* кабели */}
      <path d="M26 226 C 40 240 64 236 78 228" stroke="#1a1f23" strokeWidth="2" fill="none" />
      <path d="M122 220 C 132 236 144 236 152 226" stroke="#1a1f23" strokeWidth="2" fill="none" />
    </svg>
  );
}
