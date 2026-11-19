import { useEffect, useRef, useState } from 'react';
import { getMap } from '../../game/config/mapsConfig';
import { gameConfig } from '../../game/config/gameConfig';
import { xpForLevel } from '../../game/profile/Profile';
import { GameSession } from '../../game/session';
import { fmtNum } from '../../i18n/ru';
import { unlockAudio } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { colors, rarityColor } from '../../ui/theme';
import { Bar } from '../common/Common';
import { ResourceIcon, UiIcon } from '../common/Icons';

let activeSession: GameSession | null = null;
export function getActiveSession(): GameSession | null {
  return activeSession;
}

export function GameScreen() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runId = useUi((s) => s.runId);

  // Одна сессия на бой. Новый runId — новый бой.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const session = new GameSession(canvas);
    activeSession = session;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) session.resize(r.width, r.height);
    });
    ro.observe(wrap);
    session.start();
    return () => {
      ro.disconnect();
      session.destroy();
      if (activeSession === session) activeSession = null;
    };
  }, [runId]);

  return (
    <div className="game" onPointerDown={unlockAudio}>
      <TopBar />
      <div className="canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} />
        <FieldOverlay />
      </div>
      <BottomHud />
    </div>
  );
}

function TopBar() {
  const hud = useUi((s) => s.hud);
  const profile = useProfile((s) => s.profile)!;
  const speed = useUi((s) => s.settings.speed);
  const setSpeed = useUi((s) => s.setSpeed);
  const paused = useUi((s) => s.paused);
  const setPaused = useUi((s) => s.setPaused);
  const map = getMap(profile.maps.selected);
  const wave = hud?.wave ?? 0;
  const bossWave = hud?.bossWave ?? map.wavesBeforeBoss + 1;
  const isBoss = wave >= bossWave;
  const r = profile.resources;

  return (
    <div className="topbar">
      <div className="topbar-row">
        <div className="grow">
          <div className="map-title">
            Карта {map.id} · {map.name}
          </div>
          <div className="wave-title">
            {isBoss ? 'БОСС' : `Волна ${Math.max(1, wave)} / ${bossWave - 1}`}
            <span className="wave-sub">
              {' '}
              {isBoss ? '' : `· до босса ${Math.max(0, bossWave - Math.max(1, wave))}`}
            </span>
          </div>
        </div>
        <div className="speed-group">
          {gameConfig.speeds.map((s) => (
            <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>
              x{s}
            </button>
          ))}
        </div>
        <button className="btn icon-btn" onClick={() => setPaused(!paused)} aria-label="Пауза">
          <UiIcon kind={paused ? 'play' : 'pause'} />
        </button>
      </div>
      <div className="res-strip">
        <span className="res">
          <ResourceIcon type="coins" /> {fmtNum(r.coins)}
        </span>
        <span className="res">
          <ResourceIcon type="techParts" /> {fmtNum(r.techParts)}
        </span>
        <span className="res">
          <ResourceIcon type="scrap" /> {fmtNum(r.scrap)}
        </span>
        <span className="res">
          <ResourceIcon type="energyCores" /> {fmtNum(r.energyCores)}
        </span>
        <span className="res">
          <ResourceIcon type="crystals" /> {fmtNum(r.crystals)}
        </span>
        <span className="res">
          <ResourceIcon type="stabilizers" /> {fmtNum(r.stabilizers)}
        </span>
      </div>
    </div>
  );
}

function FieldOverlay() {
  const hud = useUi((s) => s.hud);
  const paused = useUi((s) => s.paused);
  const [banner, setBanner] = useState<string | null>(null);
  const lastWave = useRef(0);

  useEffect(() => {
    if (!hud) return;
    if (hud.wave !== lastWave.current && hud.phase === 'spawning') {
      lastWave.current = hud.wave;
      setBanner(hud.wave >= hud.bossWave ? 'БОСС' : `ВОЛНА ${hud.wave}`);
      const t = setTimeout(() => setBanner(null), 1400);
      return () => clearTimeout(t);
    }
  }, [hud]);

  if (!hud) return null;
  return (
    <>
      <div className="overlay-info">
        <span className="chip">
          DPS <b>{fmtNum(hud.dps)}</b>
        </span>
        <span className="chip">
          Роботов <b>{hud.alive}</b> · уничтожено <b>{hud.kills}</b>
        </span>
      </div>
      {hud.boss && (
        <div className="boss-bar">
          <div className="boss-name">{hud.boss.name}</div>
          <Bar
            value={hud.boss.hp}
            max={hud.boss.maxHp}
            shield={hud.boss.shield}
            color="#b8261c"
            label={`${fmtNum(hud.boss.hp)} / ${fmtNum(hud.boss.maxHp)}${hud.boss.shield > 0 ? ` · щит ${fmtNum(hud.boss.shield)}` : ''}`}
          />
        </div>
      )}
      {banner && <div className="wave-banner" style={{ fontSize: 28 }}>{banner}</div>}
      {!banner && hud.phase === 'break' && hud.wave > 0 && hud.state === 'running' && (
        <div className="wave-banner" style={{ fontSize: 14, color: '#8a949c', textShadow: 'none' }}>
          Ремонт… следующая волна через {Math.ceil(hud.breakLeft)}
        </div>
      )}
      {paused && (
        <div className="wave-banner" style={{ fontSize: 24, color: '#eef2f5' }}>
          ПАУЗА
        </div>
      )}
      {hud.suppressed && (
        <div className="wave-banner" style={{ top: '62%', fontSize: 12, color: '#b04dff' }}>
          ЭМ-ПОДАВЛЕНИЕ: частота импульсов снижена
        </div>
      )}
      <div className="drops">
        {hud.recentDrops.slice(0, 3).map((it) => (
          <div key={it.id} className="drop-pill" style={{ borderLeftColor: rarityColor[it.rarity], color: rarityColor[it.rarity] }}>
            {it.name}
          </div>
        ))}
      </div>
    </>
  );
}

function BottomHud() {
  const hud = useUi((s) => s.hud);
  const bunker = useProfile((s) => s.profile!.bunker);
  const runCoins = hud?.runCoins ?? 0;
  const xpNeed = xpForLevel(bunker.level);
  const lowEnergy = hud && hud.efficiency < 1;
  return (
    <div className="bottom-hud">
      <div className="hud-row">
        <span className="lvl-badge">УР {bunker.level}</span>
        <div className="grow">
          <Bar value={bunker.xp} max={xpNeed} color={colors.xp} thin />
        </div>
        <span>
          <ResourceIcon type="coins" size={11} /> +{fmtNum(runCoins)} за бой
        </span>
      </div>
      <Bar
        value={hud?.hp ?? 1}
        max={hud?.maxHp ?? 1}
        color={hud && hud.hp / hud.maxHp < 0.3 ? '#ff2a1a' : colors.hp}
        label={hud ? `HP ${Math.ceil(hud.hp)} / ${hud.maxHp}` : ''}
      />
      {hud && (
        <div className="hud-row">
          <svg width="12" height="14" viewBox="0 0 12 14" aria-label="Энергия">
            <path d="M7 0L1 8h4l-1 6 6-8H6z" fill={lowEnergy ? '#ff5a4a' : colors.energy} />
          </svg>
          <div className="grow">
            <Bar value={hud.battery} max={hud.batteryCap} color={lowEnergy ? '#ff5a4a' : colors.energy} thin />
          </div>
          <span>
            {hud.energyBalance >= 0 ? '+' : ''}
            {hud.energyBalance.toFixed(1)}/с
            {lowEnergy && <b style={{ color: '#ff5a4a' }}> · модули {Math.round(hud.efficiency * 100)}%</b>}
          </span>
        </div>
      )}
      {hud && hud.recentDrops.length === 0 && hud.kills === 0 && hud.wave <= 1 && (
        <div className="small muted" style={{ textAlign: 'center' }}>
          Бункер атакует сам. Оборудование выпадает с роботов — ставьте его в разделе «Экипировка».
        </div>
      )}
    </div>
  );
}
