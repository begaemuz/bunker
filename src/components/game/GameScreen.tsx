import { useEffect, useRef } from 'react';
import { useQuestBadge } from '../shop/QuestsSheet';
import { gameConfig, modeConfig } from '../../game/config/gameConfig';
import { getLocation } from '../../game/config/locationsConfig';
import { canSummonBoss, locationProgress, xpForLevel } from '../../game/profile/Profile';
import { GameSession } from '../../game/session';
import { fmtNum } from '../../i18n/ru';
import { unlockAudio } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi, type CoilHud } from '../../stores/uiStore';
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
  const profile = useProfile((s) => s.profile)!;
  const speed = useUi((s) => s.settings.speed);
  const setSpeed = useUi((s) => s.setSpeed);
  const paused = useUi((s) => s.paused);
  const setPaused = useUi((s) => s.setPaused);
  const loc = getLocation(profile.locations.current);
  const r = profile.resources;
  const lvl = profile.bunker.level;
  const setQuests = useUi((s) => s.setQuestsOpen);
  const badge = useQuestBadge();

  return (
    <div className="topbar">
      <div className="topbar-row">
        <div className="grow">
          <div className="loc-title">
            Локация {loc.id} · {loc.name}
          </div>
          <div className="lvl-line">
            <span className="lvl-badge">УР {lvl}</span>
            <div className="grow">
              <Bar value={profile.bunker.xp} max={xpForLevel(lvl)} color={colors.xp} thin />
            </div>
          </div>
        </div>
        <div className="seg">
          {gameConfig.speeds.map((s) => (
            <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>
              x{s}
            </button>
          ))}
        </div>
        <button className="btn icon-btn" style={{ position: 'relative', overflow: 'visible' }} onClick={() => setQuests(true)} aria-label="Задания">
          <UiIcon kind="gift" size={18} />
          {badge > 0 && <span className="nav-badge" style={{ top: 1, right: 1 }}>{badge}</span>}
        </button>
        <button className="btn icon-btn" onClick={() => setPaused(!paused)} aria-label="Пауза">
          <UiIcon kind={paused ? 'play' : 'pause'} size={18} />
        </button>
      </div>
      <div className="res-strip">
        {(['coins', 'scrap', 'techParts', 'blueprints', 'energyCores', 'stabilizers', 'bossPasses'] as const).map((k) => (
          <span key={k} className="res">
            <ResourceIcon type={k} /> {fmtNum(r[k])}
          </span>
        ))}
      </div>
    </div>
  );
}

function BossProgress() {
  const profile = useProfile((s) => s.profile)!;
  const hud = useUi((s) => s.hud);
  const toast = useUi((s) => s.toast);
  const loc = getLocation(profile.locations.current);
  const prog = locationProgress(profile, loc.id);
  const ready = canSummonBoss(profile, loc.id);
  const passes = profile.resources.bossPasses;
  if (!hud || hud.mode === 'boss' || hud.state !== 'running') return null;

  const summon = (usePass: boolean) => {
    const ok = getActiveSession()?.summonBoss(usePass);
    if (!ok) toast('Сейчас вызвать босса нельзя', 'bad');
  };

  return (
    <div className="boss-progress">
      <div className="boss-card">
        <div className="t">
          <span>До босса</span>
          <span>
            Уничтожено <b>{prog.groups}</b> / {loc.groupsForBoss} групп
          </span>
        </div>
        <Bar value={prog.groups} max={loc.groupsForBoss} color={ready ? '#5fd16a' : '#d9772e'} thin />
      </div>
      {ready ? (
        <button className="btn btn-gold btn-pulse" onClick={() => summon(false)}>
          <UiIcon kind="skull" size={18} /> Вызвать босса
        </button>
      ) : passes > 0 ? (
        <button className="btn btn-danger btn-sm" onClick={() => summon(true)}>
          <ResourceIcon type="bossPasses" /> Пропуск <span className="badge">{passes}</span>
        </button>
      ) : null}
    </div>
  );
}

function FieldOverlay() {
  const hud = useUi((s) => s.hud);
  const paused = useUi((s) => s.paused);
  const showDrops = !!hud && hud.recentDrops.length > 0;
  if (!hud) return null;
  return (
    <>
      <div className="overlay-info">
        <span className="chip">
          DPS <b>{fmtNum(hud.dps)}</b>
        </span>
        <span className="chip">
          Угроза <b style={{ color: hud.threat > 0.4 ? '#ff6b5a' : undefined }}>{Math.round(hud.threat * 100)}%</b> · уничтожено <b>{hud.kills}</b>
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
      {paused && (
        <div className="banner" style={{ fontSize: 26, color: '#eef2f5' }}>
          ПАУЗА
        </div>
      )}
      {hud.overheated && !paused && (
        <div className="banner" style={{ top: '30%', fontSize: 14, color: '#ff7a3d', textShadow: '0 0 10px rgba(255,120,60,0.7)' }}>
          ПЕРЕГРЕВ — КАТУШКИ ОСТЫВАЮТ
        </div>
      )}
      {hud.suppressed && (
        <div className="banner" style={{ top: '62%', fontSize: 12, color: '#b04dff' }}>
          ЭМ-ПОДАВЛЕНИЕ: частота снижена
        </div>
      )}
      {showDrops && (
        <div className="drops" style={{ bottom: hud.mode === 'boss' ? 8 : 64 }}>
          {hud.recentDrops.slice(0, 3).map((it) => (
            <div key={it.id} className="drop-pill" style={{ borderLeftColor: rarityColor[it.rarity], color: rarityColor[it.rarity] }}>
              {it.name}
            </div>
          ))}
        </div>
      )}
      <BossProgress />
    </>
  );
}

function blockedText(c: CoilHud): string {
  switch (c.blocked) {
    case 'energy':
      return 'нет энергии';
    case 'heat':
      return 'перегрев';
    case 'jammed':
      return 'заглушена';
    case 'target':
      return 'ждёт цель';
    default:
      return c.charge >= 1 ? 'готова' : 'заряд';
  }
}

function CoilPill({ c, label }: { c: CoilHud | null; label: string }) {
  if (!c)
    return (
      <div className="coil-pill">
        <span className="mode muted">{label}</span>
        <span className="st">не установлена</span>
      </div>
    );
  const col = modeConfig[c.mode].color;
  const bad = c.blocked === 'energy' || c.blocked === 'heat' || c.blocked === 'jammed';
  return (
    <div className="coil-pill" style={{ borderColor: bad ? '#7a2a20' : undefined }}>
      <span className="mode" style={{ color: col }}>
        {modeConfig[c.mode].short}
      </span>
      <div className="grow">
        <Bar value={c.charge} max={1} color={col} thin />
      </div>
      <span className="st" style={{ color: bad ? '#ff8a7a' : undefined }}>
        {blockedText(c)}
      </span>
    </div>
  );
}

function BottomHud() {
  const hud = useUi((s) => s.hud);
  const low = hud ? hud.hp / hud.maxHp < 0.3 : false;
  return (
    <div className="bottom-hud">
      <Bar value={hud?.hp ?? 1} max={hud?.maxHp ?? 1} color={low ? '#ff2a1a' : colors.hp} label={hud ? `ПРОЧНОСТЬ ${Math.ceil(hud.hp)} / ${hud.maxHp}` : ''} />
      {hud && (
        <div className="hud-row">
          <span style={{ color: colors.energy, fontWeight: 800 }}>ЭН</span>
          <div className="grow">
            <Bar value={hud.energy} max={hud.capacity} color={colors.energy} mid />
          </div>
          <span style={{ color: hud.overheated ? '#ff5a4a' : colors.heat, fontWeight: 800 }}>ТЕП</span>
          <div className="grow">
            <Bar value={hud.heat} max={hud.heatCap} color={hud.overheated ? '#ff2a1a' : colors.heat} mid />
          </div>
        </div>
      )}
      {hud && (
        <div className="coil-pills">
          <CoilPill c={hud.coils[0]} label="К1" />
          <CoilPill c={hud.coils[1]} label="К2" />
        </div>
      )}
    </div>
  );
}
