import { modeConfig } from '../../game/config/gameConfig';
import type { Profile } from '../../game/profile/Profile';
import type { SlotId } from '../../game/types';
import { rarityColor } from '../../ui/theme';

/**
 * Лаборатория бункера: инженер в белом халате за рабочим столом.
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
        <linearGradient id="lb-coat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#e8eef2" />
          <stop offset="1" stopColor="#b9c6cf" />
        </linearGradient>
        <linearGradient id="lb-coat-s" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9d4db" />
          <stop offset="1" stopColor="#f4f8fa" />
        </linearGradient>
        <linearGradient id="lb-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3c9a4" />
          <stop offset="1" stopColor="#dca37b" />
        </linearGradient>
        <linearGradient id="lb-hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6b4a32" />
          <stop offset="1" stopColor="#3a2617" />
        </linearGradient>
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
      <g>
        <ellipse cx="100" cy="222" rx="54" ry="8" fill="#000" opacity="0.35" />
        {/* халат: плечи и корпус */}
        <path d="M52 228 C 54 178 70 162 100 160 C 130 162 146 178 148 228 Z" fill="url(#lb-coat)" stroke="#8fa0aa" strokeWidth="1" />
        {/* рубашка и галстук */}
        <path d="M88 162 L100 196 L112 162 C 106 160 94 160 88 162z" fill="#2c5f6e" />
        <path d="M97 168 l3 -3 l3 3 l-1.5 22 l-1.5 3 l-1.5 -3z" fill="#f2a93b" />
        {/* лацканы */}
        <path d="M88 162 L100 200 L92 214 L80 172 Z" fill="url(#lb-coat-s)" stroke="#9fb0ba" strokeWidth="0.8" />
        <path d="M112 162 L100 200 L108 214 L120 172 Z" fill="#dfe7ec" stroke="#9fb0ba" strokeWidth="0.8" />
        {/* карман с ручками */}
        <rect x="118" y="186" width="16" height="12" rx="2" fill="#e2eaef" stroke="#9fb0ba" strokeWidth="0.8" />
        <rect x="121" y="180" width="2" height="9" fill="#ff4b3e" />
        <rect x="125" y="179" width="2" height="10" fill="#46d4ff" />
        <rect x="129" y="181" width="2" height="8" fill="#2a3438" />
        {/* бейдж */}
        <rect x="67" y="188" width="14" height="10" rx="1.5" fill="#f2a93b" />
        <rect x="69" y="190" width="5" height="6" fill="#fff" opacity="0.8" />
        {/* руки к столу */}
        <path d="M56 214 C 58 200 64 194 70 196 L76 224 L60 226 Z" fill="url(#lb-coat-s)" stroke="#8fa0aa" strokeWidth="0.8" />
        <path d="M144 214 C 142 200 136 194 130 196 L124 224 L140 226 Z" fill="#e6edf1" stroke="#8fa0aa" strokeWidth="0.8" />
        <ellipse cx="70" cy="226" rx="8" ry="5" fill="url(#lb-skin)" />
        <ellipse cx="131" cy="226" rx="8" ry="5" fill="url(#lb-skin)" />

        {/* шея и голова */}
        <path d="M92 150 h16 v14 c-5 4 -11 4 -16 0z" fill="#d9a07a" />
        <ellipse cx="100" cy="128" rx="21" ry="25" fill="url(#lb-skin)" />
        <ellipse cx="79" cy="130" rx="4" ry="6" fill="#e0ab85" />
        <ellipse cx="121" cy="130" rx="4" ry="6" fill="#e0ab85" />
        {/* волосы */}
        <path
          d="M78 124 C 74 104 84 92 98 92 C 104 86 116 88 118 96 C 126 98 128 110 122 122 C 120 112 114 106 106 106 C 100 112 90 110 86 106 C 82 110 80 116 78 124z"
          fill="url(#lb-hair)"
        />
        <path d="M96 92 c4 -6 10 -7 14 -4 c-5 0 -9 2 -11 6z" fill="#7a5638" />
        {/* очки-гогглы на лбу: стёкла светятся цветом катушек */}
        <path d="M80 112 C 90 106 110 106 120 112" stroke="#2a3438" strokeWidth="3" fill="none" />
        <circle cx="91" cy="110" r="6" fill="#2a3438" />
        <circle cx="109" cy="110" r="6" fill="#2a3438" />
        <circle cx="91" cy="110" r="4.2" fill={c1 ?? '#f2a93b'} opacity="0.85" />
        <circle cx="109" cy="110" r="4.2" fill={c2 ?? c1 ?? '#f2a93b'} opacity="0.85" />
        <circle cx="89.5" cy="108.5" r="1.3" fill="#fff" opacity="0.8" />
        <circle cx="107.5" cy="108.5" r="1.3" fill="#fff" opacity="0.8" />
        {/* лицо */}
        <path d="M86 122 q5 -3 10 0" stroke="#4a3220" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M104 122 q5 -3 10 0" stroke="#4a3220" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="91" cy="128" rx="3" ry="3.4" fill="#fff" />
        <ellipse cx="109" cy="128" rx="3" ry="3.4" fill="#fff" />
        <circle cx="91.6" cy="128.5" r="2" fill="#2d4a5a" />
        <circle cx="109.6" cy="128.5" r="2" fill="#2d4a5a" />
        <circle cx="92.2" cy="127.8" r="0.7" fill="#fff" />
        <circle cx="110.2" cy="127.8" r="0.7" fill="#fff" />
        <path d="M100 129 q-2 7 1 8" stroke="#c48a64" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M92 142 q8 6 16 0" stroke="#8c4a34" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <ellipse cx="85" cy="137" rx="4" ry="2.4" fill="#ff8a7a" opacity="0.25" />
        <ellipse cx="115" cy="137" rx="4" ry="2.4" fill="#ff8a7a" opacity="0.25" />
      </g>

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
