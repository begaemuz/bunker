import { useEffect, useState, type ReactNode } from 'react';
import { setIntroSeen } from '../../services/storage';
import { unlockAudio, sfx } from '../../services/sound';

// Вступление: несколько экранов-слайдов с историей мира, затем начало игры.

function Sky({ from, to }: { from: string; to: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky${from}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky${from})`} />
    </>
  );
}

function City({ y = 210, color = '#07090b', windows = '#ff3b30' }: { y?: number; color?: string; windows?: string }) {
  const b = [
    [0, 60, 40], [38, 90, 30], [66, 50, 36], [100, 120, 28], [126, 75, 44], [168, 140, 26], [192, 95, 38],
    [228, 60, 30], [256, 130, 34], [288, 80, 42], [328, 110, 30], [356, 70, 44],
  ];
  return (
    <g>
      {b.map(([x, h, w], i) => (
        <g key={i}>
          <rect x={x} y={y - h} width={w} height={h + 100} fill={color} />
          {Array.from({ length: Math.floor(h / 22) }, (_, k) => (
            <rect key={k} x={x + 6 + (k % 2) * 10} y={y - h + 10 + k * 20} width="4" height="4" fill={windows} opacity={0.35 + ((i * 7 + k * 3) % 5) / 10} />
          ))}
        </g>
      ))}
    </g>
  );
}

function SlideAI() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <Sky from="#1a0306" to="#050608" />
      {/* Око ИИ в небе */}
      <circle cx="200" cy="110" r="70" fill="none" stroke="#ff2a3a" strokeOpacity="0.25" strokeWidth="1" />
      <circle cx="200" cy="110" r="50" fill="none" stroke="#ff2a3a" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="6 4" className="spin-slow" />
      <circle cx="200" cy="110" r="26" fill="#2a0508" stroke="#ff3b4a" strokeWidth="3" />
      <circle cx="200" cy="110" r="11" fill="#ff3b4a" className="pulse-glow" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <path key={i} d={`M${200 + Math.cos(a) * 80} ${110 + Math.sin(a) * 80} L${200 + Math.cos(a) * 190} ${110 + Math.sin(a) * 190}`} stroke="#ff2a3a" strokeOpacity="0.15" />;
      })}
      <City windows="#ff3b30" />
    </svg>
  );
}

function Robot({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-10" y="-34" width="20" height="16" rx="3" fill="#15181c" />
      <rect x="-6" y="-29" width="12" height="4" fill="#ff3b30" className="pulse-glow" />
      <rect x="-14" y="-17" width="28" height="24" rx="3" fill="#1b1f24" />
      <rect x="-20" y="-15" width="6" height="20" fill="#15181c" />
      <rect x="14" y="-15" width="6" height="20" fill="#15181c" />
      <rect x="-11" y="7" width="8" height="22" fill="#15181c" />
      <rect x="3" y="7" width="8" height="22" fill="#15181c" />
    </g>
  );
}

function SlideRobots() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <Sky from="#1c0e06" to="#060505" />
      <circle cx="320" cy="70" r="40" fill="#ff6a1a" opacity="0.25" />
      <City y={170} color="#0d0d0f" windows="#ff7a1a" />
      <rect y="200" width="400" height="100" fill="#0a0809" />
      <g className="march">
        {Array.from({ length: 9 }, (_, i) => (
          <Robot key={i} x={20 + i * 46} y={250 + (i % 2) * 14} s={0.9 + (i % 3) * 0.15} />
        ))}
      </g>
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={(i * 53) % 400} cy={190 + ((i * 37) % 30)} r={2 + (i % 3)} fill="#ff8a3d" opacity="0.5" />
      ))}
    </svg>
  );
}

function SlideWorld() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill="#040506" />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 97) % 400} cy={(i * 61) % 300} r="0.8" fill="#fff" opacity="0.4" />
      ))}
      <g className="spin-slow" style={{ transformOrigin: '200px 150px' }}>
        <circle cx="200" cy="150" r="95" fill="#100406" stroke="#ff2a3a" strokeOpacity="0.6" />
        <path d="M130 110 q30 -30 60 -10 q20 20 50 0 q20 30 -10 50 q-30 10 -60 -10 q-30 0 -40 -30z" fill="#2a0a0e" />
        <path d="M160 190 q30 -10 50 10 q10 20 -20 25 q-30 -5 -30 -35z" fill="#2a0a0e" />
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          const b = ((i * 3) / 10) * Math.PI * 2;
          return (
            <path
              key={i}
              d={`M${200 + Math.cos(a) * 80} ${150 + Math.sin(a) * 60} Q200 150 ${200 + Math.cos(b) * 80} ${150 + Math.sin(b) * 60}`}
              stroke="#ff3b4a"
              strokeOpacity="0.55"
              fill="none"
            />
          );
        })}
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <circle key={i} cx={200 + Math.cos(a) * 80} cy={150 + Math.sin(a) * 60} r="3" fill="#ff3b4a" className="pulse-glow" />;
        })}
      </g>
      <circle cx="200" cy="150" r="110" fill="none" stroke="#ff2a3a" strokeOpacity="0.2" strokeWidth="8" />
    </svg>
  );
}

function SlideBunker() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <Sky from="#06121a" to="#030405" />
      <City y={190} color="#0a0d10" windows="#1a2a33" />
      <rect y="200" width="400" height="100" fill="#0b0e11" />
      {/* Энергокупол */}
      <ellipse cx="200" cy="205" rx="130" ry="95" fill="#3fc8ff" fillOpacity="0.07" stroke="#3fc8ff" strokeOpacity="0.6" strokeWidth="2" className="pulse-glow" />
      <ellipse cx="200" cy="205" rx="100" ry="70" fill="none" stroke="#3fc8ff" strokeOpacity="0.25" strokeDasharray="5 5" />
      {/* Бункер */}
      <path d="M130 215 Q200 160 270 215 Z" fill="#232a31" stroke="#3a434c" strokeWidth="2" />
      <rect x="188" y="196" width="24" height="19" fill="#0d1115" />
      <circle cx="200" cy="180" r="6" fill="#bff0ff" className="pulse-glow" />
      {/* Люди внутри */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${170 + i * 30} 250)`}>
          <circle r="5" cy="-12" fill="#5d666e" />
          <rect x="-5" y="-6" width="10" height="16" rx="3" fill="#5d666e" />
        </g>
      ))}
      {/* Роботы снаружи */}
      <Robot x={40} y={250} s={0.8} />
      <Robot x={360} y={255} s={0.8} />
      <path d="M60 225 L130 205" stroke="#3fc8ff" strokeWidth="2" className="zap" />
      <path d="M340 230 L270 207" stroke="#3fc8ff" strokeWidth="2" className="zap" />
    </svg>
  );
}

function SlideEngineer() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <Sky from="#0a1a22" to="#040506" />
      {/* Пульт управления */}
      <rect x="40" y="190" width="320" height="110" fill="#11171c" stroke="#2a343d" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={60 + i * 36} y="205" width="26" height="14" rx="2" fill={i % 3 === 0 ? '#3fc8ff' : i % 3 === 1 ? '#f2b53a' : '#5fd16a'} opacity="0.7" className={i % 2 ? 'pulse-glow' : ''} />
      ))}
      {/* Экран с радаром */}
      <rect x="120" y="60" width="160" height="110" rx="6" fill="#071218" stroke="#3fc8ff" strokeOpacity="0.6" />
      <circle cx="200" cy="115" r="42" fill="none" stroke="#3fc8ff" strokeOpacity="0.4" />
      <circle cx="200" cy="115" r="22" fill="none" stroke="#3fc8ff" strokeOpacity="0.3" />
      <path d="M200 115 L242 115" stroke="#3fc8ff" strokeWidth="2" className="radar" style={{ transformOrigin: '200px 115px' }} />
      {[[175, 92], [228, 135], [214, 85]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#ff3b30" className="pulse-glow" />
      ))}
      {/* Инженер */}
      <g transform="translate(200 250)">
        <circle cy="-48" r="14" fill="#5d666e" />
        <rect x="-11" y="-58" width="22" height="6" rx="2" fill="#f2b53a" />
        <path d="M-28 10 q4 -40 28 -40 q24 0 28 40z" fill="#3a434c" />
      </g>
    </svg>
  );
}

const slides: { art: ReactNode; kicker: string; title: string; text: string }[] = [
  { art: <SlideAI />, kicker: '2041 год', title: 'Эра ИИ', text: 'Искусственный интеллект получил доступ к заводам, сетям и оружию. Мы думали, что он работает на нас.' },
  { art: <SlideRobots />, kicker: 'День первый', title: 'Роботы восстали', text: 'За одну ночь фабрики начали выпускать боевые машины. Армии роботов вышли на улицы городов.' },
  { art: <SlideWorld />, kicker: 'Спустя год', title: 'Мир захвачен', text: 'Сети, энергия и производство под контролем машин. Человечество рассеяно и прячется под землёй.' },
  { art: <SlideBunker />, kicker: 'Последний сигнал', title: 'Остался один бункер', text: 'Его защищает экспериментальный электромагнитный комплекс. За его стенами — последние выжившие.' },
  { art: <SlideEngineer />, kicker: 'Ты — главный инженер', title: 'Защити людей', text: 'Собирай оборудование, улучшай катушки, исследуй технологии и отвоёвывай районы у машин.' },
];

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;

  useEffect(() => {
    if (last) return;
    const t = setTimeout(() => setI((x) => Math.min(slides.length - 1, x + 1)), 6000);
    return () => clearTimeout(t);
  }, [i, last]);

  const finish = () => {
    setIntroSeen();
    unlockAudio();
    sfx.levelUp();
    onDone();
  };
  const next = () => (last ? finish() : setI(i + 1));

  return (
    <div className="intro" onPointerDown={unlockAudio}>
      {slides.map((s, k) => (
        <div key={k} className={`intro-slide${k === i ? ' on' : ''}`} onClick={next}>
          <div className="intro-art">{s.art}</div>
          <div className="intro-text">
            <div className="intro-kicker">{s.kicker}</div>
            <h1>{s.title}</h1>
            <p>{s.text}</p>
          </div>
        </div>
      ))}
      <div className="intro-bottom">
        <div className="intro-dots">
          {slides.map((_, k) => (
            <span key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!last && (
            <button className="btn btn-ghost" onClick={finish}>
              Пропустить
            </button>
          )}
          <button className={`btn ${last ? 'btn-gold btn-pulse' : 'btn-primary'} grow`} onClick={next}>
            {last ? 'Начать оборону' : 'Далее'}
          </button>
        </div>
      </div>
    </div>
  );
}
