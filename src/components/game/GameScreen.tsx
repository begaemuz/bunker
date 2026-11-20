import { useEffect, useMemo, useRef, useState } from 'react';
import { computeBunkerStats } from '../../game/bunker/BunkerStats';
import { combatPower } from '../../game/bunker/compare';
import { useLoginBadge, useQuestBadge } from '../shop/QuestsSheet';
import { gameConfig, modeConfig } from '../../game/config/gameConfig';
import { getLocation } from '../../game/config/locationsConfig';
import { canSummonBoss, locationProgress, xpForLevel } from '../../game/profile/Profile';
import { GameSession } from '../../game/session';
import { fmtNum } from '../../i18n/ru';
import { unlockAudio } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi, type CoilHud } from '../../stores/uiStore';
import { colors } from '../../ui/theme';
import { Bar, ConfirmDialog } from '../common/Common';
import { PlayerAvatar } from '../player/Avatar';
import { playerNick } from '../player/ProfileSheet';
import { vipLevel, vipPerks } from '../../game/meta/vip';
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
  const tg = useProfile((s) => s.tg);
  const setScreen = useUi((s) => s.setScreen);
  const setProfileOpen = useUi((s) => s.setProfileOpen);
  const openShop = useUi((s) => s.openShop);
  const lvl = profile.bunker.level;
  const setQuests = useUi((s) => s.setQuestsOpen);
  const badge = useQuestBadge();
  const loginReady = useLoginBadge();
  const setLogin = useUi((s) => s.setLoginOpen);
  const power = useMemo(
    () => combatPower(computeBunkerStats(profile)),
    // мощь зависит только от оборудования, деталей и исследований
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.equipment, profile.items, profile.parts, profile.techs],
  );
  const r = profile.resources;

  return (
    <div className="topbar">
      <div className="topbar-row">
        <PlayerAvatar
          avatar={profile.player.avatar}
          frame={profile.player.frame}
          level={lvl}
          progress={profile.bunker.xp / xpForLevel(lvl)}
          vip={vipLevel(profile.vip.points)}
          size={50}
          onClick={() => setProfileOpen(true)}
        />
        <div className="grow top-who">
          <div className="top-nick">{playerNick(profile.player.nick, tg?.first_name)}</div>
          <span className="power" title="Боевая мощь">
            <UiIcon kind="bolt" size={13} /> {fmtNum(power)}
          </span>
        </div>
        <div className="top-money">
          <span className="money">
            <ResourceIcon type="coins" /> {fmtNum(r.coins)}
          </span>
          <button className="money" onClick={() => openShop('special')} aria-label="Купить кристаллы">
            <ResourceIcon type="crystals" /> {fmtNum(r.crystals)}
            <span className="money-plus">+</span>
          </button>
        </div>
        <button className="btn top-btn" onClick={() => setLogin(true)} aria-label="Ежедневный вход">
          <UiIcon kind="calendar" size={19} />
          {loginReady && <span className="nav-badge">!</span>}
        </button>
        <button className="btn top-btn" onClick={() => setQuests(true)} aria-label="Задания">
          <UiIcon kind="tasks" size={19} />
          {badge > 0 && <span className="nav-badge">{badge}</span>}
        </button>
        <button className="btn top-btn" onClick={() => setScreen('menu')} aria-label="Настройки">
          <UiIcon kind="menu" size={20} />
        </button>
      </div>
    </div>
  );
}

function BossChip() {
  const profile = useProfile((s) => s.profile)!;
  const loc = getLocation(profile.locations.current);
  const prog = locationProgress(profile, loc.id);
  const ready = canSummonBoss(profile, loc.id);
  const k = Math.min(1, prog.groups / loc.groupsForBoss);
  return (
    <span className={`chip boss-chip${ready ? ' ready' : ''}`}>
      <span className="boss-chip-t">
        Лок. {loc.id} · <UiIcon kind="skull" size={12} /> {Math.min(prog.groups, loc.groupsForBoss)}/{loc.groupsForBoss}
      </span>
      <span className="boss-chip-bar">
        <i style={{ width: `${k * 100}%` }} />
      </span>
    </span>
  );
}

function SpeedButton() {
  const speed = useUi((s) => s.settings.speed);
  const setSpeed = useUi((s) => s.setSpeed);
  const vipPoints = useProfile((s) => s.profile!.vip.points);
  const list: number[] = vipPerks(vipLevel(vipPoints)).speed4 ? [...gameConfig.speeds, 4] : [...gameConfig.speeds];
  const next = () => setSpeed(list[(list.indexOf(speed) + 1) % list.length]);
  return (
    <button className={`btn speed-btn s${speed}`} onClick={next} aria-label="Скорость боя">
      x{speed}
    </button>
  );
}

function BossButton() {
  const profile = useProfile((s) => s.profile)!;
  const hud = useUi((s) => s.hud);
  const toast = useUi((s) => s.toast);
  const loc = getLocation(profile.locations.current);
  const ready = canSummonBoss(profile, loc.id);
  const passes = profile.resources.bossPasses;
  const [confirmExit, setConfirmExit] = useState(false);
  if (!hud || hud.state !== 'running') return null;
  if (hud.mode === 'boss')
    return (
      <>
        <button className="btn btn-sm boss-btn exit" onClick={() => setConfirmExit(true)}>
          Выйти из боя
        </button>
        {confirmExit && (
          <ConfirmDialog
            title="Выйти из боя с боссом?"
            text="Босс уйдёт, обычный бой продолжится. Прогресс групп и пропуск вернутся — босса можно будет вызвать снова."
            confirmLabel="Выйти"
            danger
            onConfirm={() => {
              setConfirmExit(false);
              getActiveSession()?.retreatBoss();
            }}
            onCancel={() => setConfirmExit(false)}
          />
        )}
      </>
    );
  const summon = (usePass: boolean) => {
    const ok = getActiveSession()?.summonBoss(usePass);
    if (!ok) toast('Сейчас вызвать босса нельзя', 'bad');
  };
  if (ready)
    return (
      <button className="btn btn-gold btn-pulse boss-btn" onClick={() => summon(false)}>
        <UiIcon kind="skull" size={20} /> Вызвать босса
      </button>
    );
  if (passes > 0)
    return (
      <button className="btn btn-danger btn-sm boss-btn pass" onClick={() => summon(true)}>
        <ResourceIcon type="bossPasses" /> Босс по пропуску ×{passes}
      </button>
    );
  return null;
}

function LootFeed() {
  const feed = useUi((s) => s.feed);
  const prune = useUi((s) => s.pruneFeed);
  useEffect(() => {
    const t = setInterval(prune, 1000);
    return () => clearInterval(t);
  }, [prune]);
  if (!feed.length) return null;
  return (
    <div className="loot-feed">
      {feed.slice(0, 5).map((f) => (
        <div key={f.id} className="loot-line" style={{ borderLeftColor: f.color, color: f.color }}>
          {f.text}
        </div>
      ))}
    </div>
  );
}

function FieldOverlay() {
  const hud = useUi((s) => s.hud);
  const paused = useUi((s) => s.paused);
  if (!hud) return null;
  return (
    <>
      <div className="overlay-info">
        {hud.mode !== 'boss' && <BossChip />}
        <span className="chip">
          Угроза <b style={{ color: hud.threat > 0.4 ? '#ff6b5a' : undefined }}>{Math.round(hud.threat * 100)}%</b>
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
      <div className="field-bottom">
        <SpeedButton />
        <BossButton />
        <LootFeed />
      </div>
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
      <Bar value={hud?.hp ?? 1} max={hud?.maxHp ?? 1} color={low ? '#ff2a1a' : colors.hp} label={hud ? `Прочность ${Math.ceil(hud.hp)} / ${hud.maxHp}` : ''} />
      {hud && (
        <div className="hud-row">
          <span className="hud-k" style={{ color: colors.energy }}>
            <UiIcon kind="bolt" size={13} /> Энергия
          </span>
          <div className="grow">
            <Bar value={hud.energy} max={hud.capacity} color={colors.energy} mid />
          </div>
          <span className="hud-k" style={{ color: hud.overheated ? '#ff5a4a' : colors.heat }}>
            Нагрев
          </span>
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
