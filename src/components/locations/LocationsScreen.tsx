import { useEffect, useRef, useState } from 'react';
import { bossesConfig } from '../../game/config/bossesConfig';
import { robotsConfig } from '../../game/config/enemiesConfig';
import { bossRarity } from '../../game/economy/DropSystem';
import { locationsConfig, type LocationDef } from '../../game/config/locationsConfig';
import { canEnterLocation, canSummonBoss, isLocationUnlocked, locationProgress } from '../../game/profile/Profile';
import type { Profile } from '../../game/profile/Profile';
import { rewardDecay } from '../../game/progression/rewards';
import type { ResourceKey } from '../../game/types';
import { ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { Bar } from '../common/Common';
import { ResourceIcon, UiIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { COAST, MAP_H, MAP_W, REGIONS } from './mapShapes';

type Danger = 'easy' | 'normal' | 'hard' | 'locked' | 'level';

const DANGER: Record<Danger, { label: string; color: string }> = {
  easy: { label: 'Лёгкая', color: '#5fd16a' },
  normal: { label: 'Средняя', color: '#f2b53a' },
  hard: { label: 'Опасная', color: '#ff4d4d' },
  locked: { label: 'Закрыта', color: '#5b646d' },
  level: { label: 'Мал уровень', color: '#8a7a5a' },
};

/** Опасность зоны относительно уровня бункера. */
function dangerOf(p: Profile, l: LocationDef): Danger {
  if (!isLocationUnlocked(p, l.id)) return 'locked';
  if (p.bunker.level < l.recommendedLevel) return 'level';
  const lvl = p.bunker.level;
  if (lvl >= l.recommendedLevel + 6) return 'easy';
  if (lvl >= l.recommendedLevel + 2) return 'normal';
  return 'hard';
}

/** Цвет суши под зонами: он же виден в зазорах между ними. */
const GAP = '#0f1418';

/** Цвет местности зон на карте. */
const LAND: string[] = ['#8a939b', '#c0703a', '#d9b25e', '#bfe3ff', '#8be04e', '#7a6ad8', '#ff4d6a', '#3fa6c9', '#9c8a78', '#9fd3f0', '#7fbf3a', '#9b7bff', '#b8a98a', '#6f7f99', '#ff7a3d', '#c9ced6', '#4dd8ff', '#8a4dff', '#d24d8a', '#f2f2f2'];

/** Делит название на 1–2 строки для подписи на карте. */
function splitName(name: string, max = 13): string[] {
  if (name.length <= max) return [name];
  const words = name.split(' ');
  const lines: string[] = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (!cur) lines[lines.length - 1] = w;
    else if ((cur + ' ' + w).length <= max || lines.length === 2) lines[lines.length - 1] = cur + ' ' + w;
    else lines.push(w);
  }
  return lines.slice(0, 2).map((l, i) => (i === 1 && l.length > max + 3 ? `${l.slice(0, max + 1)}…` : l));
}

export function LocationsScreen() {
  const profile = useProfile((s) => s.profile)!;
  const [open, setOpen] = useState<LocationDef | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const current = profile.locations.current;
  const hereReg = REGIONS.find((r) => r.id === current);

  // Прокручиваем карту к текущей зоне.
  useEffect(() => {
    const el = body.current;
    const reg = REGIONS.find((r) => r.id === current);
    if (!el || !reg) return;
    const k = el.clientWidth / MAP_W;
    el.scrollTop = Math.max(0, reg.y * k - el.clientHeight / 2);
  }, [current]);

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Карта зон</h2>
        <span className="small muted">
          открыто {profile.locations.unlocked.length} из {locationsConfig.length}
        </span>
      </div>
      <div className="screen-body zmap-body" ref={body}>
        <svg className="zmap" viewBox={`-8 -8 ${MAP_W + 16} ${MAP_H + 16}`} width="100%">
          <defs>
            <pattern id="zmap-sea" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M2 14q5-4 10 0t10 0" fill="none" stroke="#173246" strokeWidth="1.2" />
            </pattern>
            <pattern id="zmap-fog" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="7" height="7" fill="#151a1f" />
              <path d="M0 0v7" stroke="#20272e" strokeWidth="3" />
            </pattern>
            {/* лёгкий диагональный штрих зоны, где находится игрок */}
            <pattern id="zmap-here" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <path d="M0 0v8" stroke="#f2b53a" strokeWidth="1.6" opacity="0.32" />
            </pattern>
            {hereReg && (
              <clipPath id="zmap-here-clip">
                <path d={hereReg.d} />
              </clipPath>
            )}
          </defs>
          <rect x={-8} y={-8} width={MAP_W + 16} height={MAP_H + 16} fill="#0c1a26" />
          <rect x={-8} y={-8} width={MAP_W + 16} height={MAP_H + 16} fill="url(#zmap-sea)" />
          {/* берег */}
          <path d={COAST} fill="none" stroke="#2a5470" strokeWidth="9" opacity="0.5" strokeLinejoin="round" />
          <path d={COAST} fill={GAP} stroke="#0b0f13" strokeWidth="2" strokeLinejoin="round" />
          {REGIONS.map((r) => {
            const l = locationsConfig.find((x) => x.id === r.id);
            if (!l) return null;
            const danger = dangerOf(profile, l);
            const closed = danger === 'locked';
            return (
              <path
                key={r.id}
                d={r.d}
                className="zmap-region"
                fill={closed ? 'url(#zmap-fog)' : LAND[r.id - 1]}
                fillOpacity={closed ? 1 : danger === 'level' ? 0.32 : 0.55}
                stroke={GAP}
                strokeWidth={4}
                strokeLinejoin="round"
                onClick={() => setOpen(l)}
              />
            );
          })}
          {/* Текущая зона: цветной контур внутри границы и лёгкий штрих */}
          {hereReg && (
            <g clipPath="url(#zmap-here-clip)" pointerEvents="none">
              <path d={hereReg.d} fill="url(#zmap-here)" />
              <path d={hereReg.d} fill="none" stroke="#f2b53a" strokeWidth={7} strokeLinejoin="round" />
            </g>
          )}
          {REGIONS.map((r) => {
            const l = locationsConfig.find((x) => x.id === r.id);
            if (!l) return null;
            const danger = dangerOf(profile, l);
            const col = DANGER[danger].color;
            const here = current === l.id;
            const lines = splitName(l.name);
            const small = r.r < 24;
            return (
              <g key={r.id} className="zmap-label" onClick={() => setOpen(l)}>
                <circle cx={r.x} cy={r.y - 10} r={11} fill={here ? '#f2b53a' : '#0b0e11'} stroke={here ? '#fff3c4' : col} strokeWidth="2.2" />
                {danger === 'locked' ? (
                  <g transform={`translate(${r.x - 5} ${r.y - 16})`} stroke="#8a949c" strokeWidth="1.5" fill="none">
                    <rect x="0.5" y="5" width="9" height="7" rx="1.5" />
                    <path d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5" />
                  </g>
                ) : (
                  <text x={r.x} y={r.y - 6} textAnchor="middle" className="zmap-num" fill={here ? '#1a1205' : col}>
                    {l.id}
                  </text>
                )}
                {here && (
                  <g className="zmap-here-tag">
                    <rect x={r.x - 27} y={r.y + 4 + lines.length * 10} width={54} height={13} rx={6.5} fill="#f2b53a" />
                    <text x={r.x} y={r.y + 13.5 + lines.length * 10} textAnchor="middle" className="zmap-here-t">
                      ВЫ ЗДЕСЬ
                    </text>
                  </g>
                )}
                {lines.map((t, i) => (
                  <text key={i} x={r.x} y={r.y + 11 + i * 10} textAnchor="middle" className={`zmap-name${small ? ' sm' : ''}${danger === 'locked' ? ' off' : ''}`}>
                    {t}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
        <div className="map-legend">
          {(['easy', 'normal', 'hard', 'level', 'locked'] as Danger[]).map((d) => (
            <span key={d}>
              <i style={{ background: DANGER[d].color }} />
              {DANGER[d].label}
            </span>
          ))}
        </div>
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
  const canEnter = canEnterLocation(profile, l.id);
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
          <button className="btn btn-gold btn-hazard" style={{ flex: 2 }} disabled={!unlocked || (!current && !canEnter)} onClick={enter}>
            {!unlocked ? (
              <>
                <UiIcon kind="lock" size={16} /> Закрыта
              </>
            ) : !current && !canEnter ? (
              `Нужен ${l.recommendedLevel} уровень`
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
        <span className="small muted">вход с {l.recommendedLevel} уровня бункера · у вас {profile.bunker.level}</span>
      </div>
      <p className="small" style={{ color: '#c5cdd3', lineHeight: 1.45, margin: '10px 0' }}>
        {l.description}
      </p>
      {l.special === 'rift' && (
        <div className="rift-box">
          Красное оборудование: 3 основные + 3 случайные характеристики. Падает со Стража разлома (2% за победу) и очень редко с роботов зоны.
        </div>
      )}
      {!unlocked ? (
        <div className="info-box">Откроется после победы над боссом зоны {l.id - 1}. Вход — с {l.recommendedLevel} уровня бункера.</div>
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
            <span className="muted">Вещи Т{l.tier}</span>
            <span>
              роботы: белые, зелёные, синие — редко
              <br />
              босс: синие {Math.round(bossRarity.rare * 100)}%, фиолетовые {Math.round(bossRarity.epic * 100)}%, золотые {Math.round(bossRarity.legendary * 100)}%
            </span>
          </div>
          {decay < 1 && <div className="warn-box" style={{ marginTop: 10 }}>Зона слишком лёгкая для вас: награды за роботов снижены до {Math.round(decay * 100)}%.</div>}
        </>
      )}
    </Sheet>
  );
}
