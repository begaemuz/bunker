import { useEffect, useRef, useState } from 'react';
import { bossesConfig } from '../../game/config/bossesConfig';
import { robotsConfig } from '../../game/config/enemiesConfig';
import { itemTemplates } from '../../game/config/itemsConfig';
import { locationsConfig, type LocationDef } from '../../game/config/locationsConfig';
import { canSummonBoss, isLocationUnlocked, locationProgress } from '../../game/profile/Profile';
import type { Profile } from '../../game/profile/Profile';
import { rewardDecay } from '../../game/progression/rewards';
import type { ResourceKey } from '../../game/types';
import { ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { Bar } from '../common/Common';
import { ResourceIcon, UiIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';

type Danger = 'easy' | 'normal' | 'hard' | 'locked';

const DANGER: Record<Danger, { label: string; color: string }> = {
  easy: { label: 'Лёгкая', color: '#5fd16a' },
  normal: { label: 'Опасная', color: '#f2b53a' },
  hard: { label: 'Смертельная', color: '#ff4d4d' },
  locked: { label: 'Закрыта', color: '#5b646d' },
};

/** Опасность зоны относительно уровня бункера. */
function dangerOf(p: Profile, l: LocationDef): Danger {
  if (!isLocationUnlocked(p, l.id)) return 'locked';
  const lvl = p.bunker.level;
  if (lvl >= l.recommendedLevel + 4) return 'easy';
  if (lvl >= l.recommendedLevel - 2) return 'normal';
  return 'hard';
}

const W = 360;
const H = 760;

/** Положение зон на карте: путь снизу (окраины) вверх (ядро ИИ). */
const NODES: Record<number, { x: number; y: number }> = {
  1: { x: 92, y: 670 },
  2: { x: 262, y: 590 },
  3: { x: 104, y: 492 },
  4: { x: 262, y: 398 },
  5: { x: 96, y: 300 },
  6: { x: 258, y: 200 },
  7: { x: 172, y: 92 },
};

/** Цвет местности зоны. */
const TERRAIN: Record<number, string> = {
  1: '#7d8790',
  2: '#c0703a',
  3: '#d9b25e',
  4: '#bfe3ff',
  5: '#8be04e',
  6: '#4dc3ff',
  7: '#ff4d6a',
};

/** Рисунок местности в зоне. */
function Terrain({ id, x, y }: { id: number; x: number; y: number }) {
  const c = TERRAIN[id];
  const s = { stroke: c, strokeWidth: 1.4, fill: 'none', opacity: 0.55 };
  switch (id) {
    case 1: // руины домов
      return (
        <g {...s}>
          <path d={`M${x - 58} ${y + 8}v-22h12v-8h10v30M${x + 40} ${y + 14}v-30h14v30M${x - 48} ${y - 34}v-16h10v16`} />
          <path d={`M${x + 30} ${y - 40}l8-10 8 10v12h-16z`} />
        </g>
      );
    case 2: // трубы заводов
      return (
        <g {...s}>
          <path d={`M${x - 62} ${y + 12}v-26h8v-14h6v40M${x + 44} ${y + 16}v-34h7v-10h5v44`} />
          <circle cx={x - 52} cy={y - 36} r={5} />
          <circle cx={x + 52} cy={y - 40} r={5} />
        </g>
      );
    case 3: // барханы
      return (
        <g {...s}>
          <path d={`M${x - 70} ${y + 18}q18-16 36 0t36 0M${x + 22} ${y - 34}q16-14 32 0t30 0M${x - 66} ${y - 30}q14-10 28 0`} />
        </g>
      );
    case 4: // заснеженные пики
      return (
        <g {...s}>
          <path d={`M${x - 70} ${y + 18}l16-26 16 26M${x + 38} ${y + 20}l18-30 18 30M${x - 40} ${y - 30}l12-18 12 18`} />
        </g>
      );
    case 5: // знаки радиации
      return (
        <g {...s}>
          <circle cx={x - 54} cy={y + 6} r={10} />
          <circle cx={x - 54} cy={y + 6} r={2.5} />
          <circle cx={x + 54} cy={y - 26} r={9} />
          <circle cx={x + 54} cy={y - 26} r={2.2} />
        </g>
      );
    case 6: // купола лабораторий
      return (
        <g {...s}>
          <path d={`M${x - 70} ${y + 14}a16 16 0 0 1 32 0zM${x + 36} ${y + 16}a14 14 0 0 1 28 0zM${x - 44} ${y - 30}h22v-12h-22z`} />
        </g>
      );
    default: // ядро ИИ
      return (
        <g {...s}>
          <path d={`M${x - 74} ${y + 4}h20M${x + 54} ${y + 4}h20M${x} ${y - 66}v-10`} />
          <circle cx={x} cy={y} r={50} strokeDasharray="3 6" />
        </g>
      );
  }
}

export function LocationsScreen() {
  const profile = useProfile((s) => s.profile)!;
  const [open, setOpen] = useState<LocationDef | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const current = profile.locations.current;

  // Прокручиваем карту к текущей зоне.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const node = NODES[current];
    const svgH = el.scrollWidth * (H / W);
    el.scrollTop = Math.max(0, (node.y / H) * svgH - el.clientHeight / 2);
  }, [current]);

  const order = locationsConfig.map((l) => l.id);

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Карта</h2>
        <span className="small muted">
          открыто {profile.locations.unlocked.length} из {locationsConfig.length}
        </span>
      </div>
      <div className="map-legend">
        {(['easy', 'normal', 'hard', 'locked'] as Danger[]).map((d) => (
          <span key={d}>
            <i style={{ background: DANGER[d].color }} />
            {DANGER[d].label}
          </span>
        ))}
      </div>
      <div className="screen-body map-body" ref={scroller}>
        <svg className="world-map" viewBox={`0 0 ${W} ${H}`} width="100%">
          <defs>
            <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0H0V24" fill="none" stroke="#1c232a" strokeWidth="1" />
            </pattern>
            <radialGradient id="map-fog" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0b0e11" stopOpacity="0" />
              <stop offset="100%" stopColor="#0b0e11" stopOpacity="0.95" />
            </radialGradient>
            {locationsConfig.map((l) => (
              <radialGradient key={l.id} id={`zone-${l.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={TERRAIN[l.id]} stopOpacity="0.32" />
                <stop offset="70%" stopColor={TERRAIN[l.id]} stopOpacity="0.1" />
                <stop offset="100%" stopColor={TERRAIN[l.id]} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>
          <rect width={W} height={H} fill="#0d1115" />
          <rect width={W} height={H} fill="url(#map-grid)" />
          {/* Река и трещины для фактуры */}
          <path d={`M-10 560 C 80 520, 140 610, 220 540 S 330 470, 380 500`} stroke="#13324a" strokeWidth="10" fill="none" opacity="0.7" />
          <path d={`M20 150 l30 18 l-8 22 l26 14M300 300 l-20 26 l14 20 l-22 30`} stroke="#222a31" strokeWidth="1.5" fill="none" />

          {/* Зоны */}
          {locationsConfig.map((l) => {
            const n = NODES[l.id];
            const locked = !isLocationUnlocked(profile, l.id);
            return (
              <g key={l.id} opacity={locked ? 0.35 : 1}>
                <ellipse cx={n.x} cy={n.y} rx={98} ry={72} fill={`url(#zone-${l.id})`} />
                <Terrain id={l.id} x={n.x} y={n.y} />
              </g>
            );
          })}

          {/* Дорога между зонами */}
          {order.slice(1).map((id, i) => {
            const a = NODES[order[i]];
            const b = NODES[id];
            const open2 = isLocationUnlocked(profile, id);
            const mx = (a.x + b.x) / 2;
            const d = `M${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
            return (
              <g key={id}>
                <path d={d} stroke="#05070a" strokeWidth="7" fill="none" />
                <path d={d} stroke={open2 ? '#f2b53a' : '#3a434b'} strokeWidth="2.5" fill="none" strokeDasharray={open2 ? undefined : '5 6'} opacity={open2 ? 0.75 : 1} />
              </g>
            );
          })}

          {/* Метки зон */}
          {locationsConfig.map((l) => {
            const n = NODES[l.id];
            const danger = dangerOf(profile, l);
            const col = DANGER[danger].color;
            const here = current === l.id;
            const ready = canSummonBoss(profile, l.id);
            return (
              <g key={l.id} className="map-node" onClick={() => setOpen(l)} role="button" aria-label={l.name}>
                <circle cx={n.x} cy={n.y} r={44} fill="transparent" />
                {here && <circle className="map-here" cx={n.x} cy={n.y} r={30} fill="none" stroke={col} strokeWidth="2" />}
                <circle cx={n.x} cy={n.y} r={22} fill="#0b0e11" stroke={col} strokeWidth="3" />
                {danger === 'locked' ? (
                  <g transform={`translate(${n.x - 8} ${n.y - 9})`} stroke="#8a949c" strokeWidth="1.8" fill="none">
                    <rect x="1" y="7" width="14" height="10" rx="2" />
                    <path d="M4 7V5a4 4 0 0 1 8 0v2" />
                  </g>
                ) : (
                  <text x={n.x} y={n.y + 6} textAnchor="middle" className="map-num" fill={col}>
                    {l.id}
                  </text>
                )}
                {ready && <circle cx={n.x + 17} cy={n.y - 17} r={6} fill="#ff4d4d" stroke="#0b0e11" strokeWidth="2" />}
                <text x={n.x} y={n.y + 40} textAnchor="middle" className="map-label">
                  {l.name.length > 24 ? `${l.name.slice(0, 22)}…` : l.name}
                </text>
                <text x={n.x} y={n.y + 54} textAnchor="middle" className="map-sub" fill={col}>
                  {here ? 'вы здесь' : DANGER[danger].label.toLowerCase()}
                </text>
              </g>
            );
          })}
          <rect width={W} height={H} fill="url(#map-fog)" pointerEvents="none" opacity="0.5" />
        </svg>
      </div>
      {open && <ZoneSheet loc={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Информация о зоне и вход в неё. */
function ZoneSheet({ loc: l, onClose }: { loc: LocationDef; onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const setLocation = useProfile((s) => s.setLocation);
  const newRun = useUi((s) => s.newRun);
  const setScreen = useUi((s) => s.setScreen);
  const toast = useUi((s) => s.toast);
  const hud = useUi((s) => s.hud);
  const unlocked = isLocationUnlocked(profile, l.id);
  const current = profile.locations.current === l.id;
  const prog = locationProgress(profile, l.id);
  const boss = bossesConfig[l.boss];
  const decay = rewardDecay(profile.bunker.level, l);
  const danger = dangerOf(profile, l);
  const bonusRes = Object.entries(l.resourceMult).filter(([, v]) => (v ?? 1) > 1) as [ResourceKey, number][];

  const enter = () => {
    if (current) {
      onClose();
      setScreen('game');
      return;
    }
    if (hud?.mode === 'boss') {
      toast('Сначала завершите бой с боссом', 'bad');
      return;
    }
    setLocation(l.id);
    newRun();
    onClose();
    setScreen('game');
  };

  return (
    <Sheet
      title={l.name}
      subtitle={`Зона ${l.id} · технологии Т${l.tier}`}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
          <button className="btn btn-gold btn-hazard" style={{ flex: 2 }} disabled={!unlocked} onClick={enter}>
            {!unlocked ? (
              <>
                <UiIcon kind="lock" size={16} /> Закрыта
              </>
            ) : current ? (
              'Вернуться в бой'
            ) : (
              'Вступить в зону'
            )}
          </button>
        </>
      }
    >
      <div className="zone-danger" style={{ ['--dc' as string]: DANGER[danger].color }}>
        <b>{DANGER[danger].label}</b>
        <span className="small muted">рекомендуемый уровень бункера {l.recommendedLevel} · у вас {profile.bunker.level}</span>
      </div>
      <p className="small" style={{ color: '#c5cdd3', lineHeight: 1.45, margin: '10px 0' }}>
        {l.description}
      </p>
      {!unlocked ? (
        <div className="info-box">Откроется после победы над боссом зоны {l.id - 1}.</div>
      ) : (
        <>
          <div className="zone-row">
            <span className="muted">Босс</span>
            <span>
              <b style={{ color: '#ff6b5a' }}>{boss.name}</b> <span className="muted">— {boss.title}</span>
            </span>
          </div>
          <div className="hud-row" style={{ marginTop: 8 }}>
            <span className="small muted">Группы</span>
            <div className="grow">
              <Bar value={prog.groups} max={l.groupsForBoss} color={canSummonBoss(profile, l.id) ? '#5fd16a' : '#d9772e'} thin />
            </div>
            <span className="small">
              <b>{prog.groups}</b>/{l.groupsForBoss}
            </span>
          </div>
          <div className="zone-row">
            <span className="muted">Побед над боссом</span>
            <b>{prog.bossKills}</b>
          </div>
          <div className="zone-row">
            <span className="muted">Противники</span>
            <span>{l.enemies.map((e) => robotsConfig[e.kind].name.toLowerCase()).join(', ')}</span>
          </div>
          {bonusRes.length > 0 && (
            <div className="zone-row">
              <span className="muted">Больше ресурсов</span>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {bonusRes.map(([k]) => (
                  <span key={k}>
                    <ResourceIcon type={k} /> {ru.resource[k]}
                  </span>
                ))}
              </span>
            </div>
          )}
          <div className="zone-row">
            <span className="muted">Трофеи босса</span>
            <span>{boss.uniques.map((u) => `${itemTemplates.find((t) => t.id === u.template)?.name} (${Math.round(u.chance * 100)}%)`).join(', ')}</span>
          </div>
          {decay < 1 && <div className="warn-box" style={{ marginTop: 10 }}>Зона слишком лёгкая для вас: награды за роботов снижены до {Math.round(decay * 100)}%.</div>}
        </>
      )}
    </Sheet>
  );
}
