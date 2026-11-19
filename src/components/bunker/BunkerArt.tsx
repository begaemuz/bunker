import { modeConfig } from '../../game/config/gameConfig';
import type { Profile } from '../../game/profile/Profile';
import type { SlotId } from '../../game/types';
import { rarityColor } from '../../ui/theme';

/**
 * Бункер в разрезе: бетонный купол, наполовину в земле.
 * Каждый установленный модуль подсвечивает свою часть сооружения
 * цветом редкости, катушки — цветом своего режима.
 */
export function BunkerArt({ profile, highlight }: { profile: Profile; highlight?: SlotId | null }) {
  const it = (s: SlotId) => {
    const id = profile.equipment[s];
    return id ? profile.items[id] : null;
  };
  const col = (s: SlotId, off = '#2a3036') => {
    const x = it(s);
    return x ? rarityColor[x.rarity] : off;
  };
  const coilCol = (s: 'coil1' | 'coil2') => {
    const x = it(s);
    return x?.coil ? modeConfig[x.coil.mode].color : x ? rarityColor[x.rarity] : null;
  };
  const c1 = coilCol('coil1');
  const c2 = coilCol('coil2');
  const gen = it('generator');
  const shield = it('shield');
  const hl = (s: SlotId) => (highlight === s ? 1 : 0);

  return (
    <svg className="bunker-art" viewBox="0 0 200 260" role="img" aria-label="Бункер">
      <defs>
        <linearGradient id="ba-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141a20" />
          <stop offset="1" stopColor="#262019" />
        </linearGradient>
        <linearGradient id="ba-dome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b8f8e" />
          <stop offset="0.55" stopColor="#5d6263" />
          <stop offset="1" stopColor="#363a3c" />
        </linearGradient>
        <linearGradient id="ba-earth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2d22" />
          <stop offset="1" stopColor="#17110d" />
        </linearGradient>
        <radialGradient id="ba-core">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.35" stopColor={gen ? col('generator') : '#333'} />
          <stop offset="1" stopColor={gen ? col('generator') : '#222'} stopOpacity="0" />
        </radialGradient>
        <filter id="ba-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* небо и земля */}
      <rect x="0" y="0" width="200" height="260" rx="14" fill="url(#ba-sky)" />
      <circle cx="160" cy="34" r="12" fill="#d9c59a" opacity="0.15" />
      <path d="M0 150 Q 40 140 70 146 T 140 144 T 200 150 V260 H0Z" fill="url(#ba-earth)" />
      <path d="M0 150 Q 40 140 70 146 T 140 144 T 200 150" stroke="#5a4433" strokeWidth="2" fill="none" />
      {[20, 46, 160, 182].map((x, i) => (
        <circle key={i} cx={x} cy={170 + (i % 2) * 30} r={2 + (i % 3)} fill="#4b3a2c" />
      ))}

      {/* защитный контур — купол поля */}
      {shield && (
        <g>
          <path d="M18 150 A 82 82 0 0 1 182 150" fill={col('shield')} opacity="0.08" />
          <path d="M18 150 A 82 82 0 0 1 182 150" fill="none" stroke={col('shield')} strokeWidth="2" strokeDasharray="6 5" opacity="0.8">
            <animate attributeName="stroke-dashoffset" from="0" to="-22" dur="2.4s" repeatCount="indefinite" />
          </path>
        </g>
      )}

      {/* катушки-башни */}
      {[
        { x: 52, c: c1, s: 'coil1' as SlotId },
        { x: 148, c: c2, s: 'coil2' as SlotId },
      ].map(({ x, c, s }) => (
        <g key={s}>
          <rect x={x - 5} y="62" width="10" height="56" fill="#3a4046" stroke="#1a1e21" />
          {[70, 80, 90, 100].map((y) => (
            <rect key={y} x={x - 9} y={y} width="18" height="4" rx="2" fill={c ?? '#30363b'} opacity={c ? 0.9 : 1} />
          ))}
          <circle cx={x} cy="56" r="10" fill={c ?? '#30363b'} stroke="#15191c" strokeWidth="2" />
          {c && (
            <>
              <circle cx={x} cy="56" r="14" fill={c} opacity="0.5" filter="url(#ba-glow)">
                <animate attributeName="opacity" values="0.25;0.7;0.25" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <path d={`M${x} 46 l-4 -9 l6 -2 l-3 -10`} stroke="#fff" strokeWidth="1.4" fill="none" opacity="0.85">
                <animate attributeName="opacity" values="0;1;0;0" dur="1.1s" repeatCount="indefinite" />
              </path>
            </>
          )}
          {hl(s) ? <circle cx={x} cy="80" r="30" fill="none" stroke="#f2a93b" strokeWidth="2" /> : null}
        </g>
      ))}

      {/* сенсорная мачта */}
      <g>
        <line x1="100" y1="78" x2="100" y2="36" stroke="#4a5157" strokeWidth="3" />
        <path d="M84 40 Q100 24 116 40" fill="none" stroke={col('sensor', '#3a4046')} strokeWidth="4" />
        <circle cx="100" cy="36" r="3" fill={it('sensor') ? col('sensor') : '#444'} />
        {it('sensor') && (
          <circle cx="100" cy="36" r="6" fill="none" stroke={col('sensor')} opacity="0.7">
            <animate attributeName="r" values="4;22" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </g>

      {/* бетонный купол */}
      <path d="M30 150 Q30 80 100 76 Q170 80 170 150 Z" fill="url(#ba-dome)" stroke="#202426" strokeWidth="2" />
      <path d="M44 150 Q46 96 100 90" fill="none" stroke="#9da1a0" strokeWidth="1.5" opacity="0.5" />
      {[[60, 112], [138, 108], [80, 98], [124, 128]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#2b2f31" />
      ))}
      {/* сигнальная полоса */}
      <path d="M30 150 L170 150 L168 142 L32 142Z" fill="#f2a93b" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${36 + i * 11.5} 150 l6 -8 h5 l-6 8z`} fill="#1a1d20" />
      ))}

      {/* гермодверь с окном генератора */}
      <rect x="78" y="106" width="44" height="36" rx="5" fill="#2c3135" stroke="#15181a" strokeWidth="2" />
      <circle cx="100" cy="124" r="13" fill="#0c0f12" stroke="#4d555b" strokeWidth="3" />
      <circle cx="100" cy="124" r="11" fill="url(#ba-core)">
        {gen && <animate attributeName="r" values="9;11.5;9" dur="1.8s" repeatCount="indefinite" />}
      </circle>
      {hl('generator') ? <rect x="74" y="102" width="52" height="44" rx="7" fill="none" stroke="#f2a93b" strokeWidth="2" /> : null}

      {/* подземный уровень */}
      <rect x="22" y="162" width="156" height="84" rx="8" fill="#14181b" stroke="#2c3236" strokeWidth="2" />
      <rect x="22" y="162" width="156" height="6" fill="#262c31" />
      {/* конденсаторный блок */}
      <g>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={32 + i * 13} y="178" width="10" height="30" rx="3" fill="#1d2226" stroke={col('capacitor', '#2b3136')} strokeWidth="1.5" />
            <rect x={34 + i * 13} y={it('capacitor') ? 186 - i * 3 : 204} width="6" height={it('capacitor') ? 20 + i * 3 : 2} rx="1" fill={col('capacitor', '#2b3136')} opacity="0.85" />
          </g>
        ))}
        {hl('capacitor') ? <rect x="28" y="174" width="44" height="38" rx="5" fill="none" stroke="#f2a93b" strokeWidth="2" /> : null}
      </g>
      {/* преобразователь */}
      <g>
        <rect x="80" y="178" width="40" height="30" rx="4" fill="#1d2226" stroke={col('converter', '#2b3136')} strokeWidth="1.5" />
        <path d="M86 193 q4 -8 8 0 t8 0 t8 0 t8 0" fill="none" stroke={col('converter', '#2b3136')} strokeWidth="2">
          {it('converter') && <animate attributeName="stroke-dashoffset" from="0" to="20" dur="1s" repeatCount="indefinite" />}
        </path>
        {hl('converter') ? <rect x="76" y="174" width="48" height="38" rx="5" fill="none" stroke="#f2a93b" strokeWidth="2" /> : null}
      </g>
      {/* охлаждение */}
      <g>
        <circle cx="149" cy="193" r="15" fill="#1d2226" stroke={col('cooling', '#2b3136')} strokeWidth="1.5" />
        <g style={{ transformOrigin: '149px 193px' }} className={it('cooling') ? 'ba-spin' : undefined}>
          {[0, 90, 180, 270].map((a) => (
            <path key={a} d="M149 193 l3 -11 q-3 -2 -6 0z" fill={col('cooling', '#3a4046')} transform={`rotate(${a} 149 193)`} />
          ))}
        </g>
        {hl('cooling') ? <circle cx="149" cy="193" r="20" fill="none" stroke="#f2a93b" strokeWidth="2" /> : null}
      </g>
      {/* люди внутри: то, ради чего всё */}
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${62 + i * 19} 226)`} opacity="0.75">
          <circle cx="0" cy="-6" r="3" fill="#d9c59a" />
          <rect x="-3" y="-3" width="6" height="10" rx="2" fill="#8a7a5c" />
        </g>
      ))}
      <rect x="22" y="236" width="156" height="2" fill="#2a3035" />
    </svg>
  );
}
