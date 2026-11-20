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

type Danger = 'easy' | 'normal' | 'hard' | 'locked' | 'level';

const DANGER: Record<Danger, { label: string; color: string }> = {
  easy: { label: 'Лёгкая', color: '#5fd16a' },
  normal: { label: 'Опасная', color: '#f2b53a' },
  hard: { label: 'Смертельная', color: '#ff4d4d' },
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

export function LocationsScreen() {
  const profile = useProfile((s) => s.profile)!;
  const [open, setOpen] = useState<LocationDef | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const current = profile.locations.current;

  // Прокручиваем к текущей зоне.
  useEffect(() => {
    const el = body.current?.querySelector('.tl-row.here') as HTMLElement | null;
    el?.scrollIntoView({ block: 'center' });
  }, [current]);

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Зоны</h2>
        <span className="small muted">
          открыто {profile.locations.unlocked.length} из {locationsConfig.length}
        </span>
      </div>
      <div className="screen-body" ref={body}>
        <div className="timeline">
          {locationsConfig.map((l) => {
            const danger = dangerOf(profile, l);
            const col = DANGER[danger].color;
            const here = current === l.id;
            const ready = canSummonBoss(profile, l.id);
            const prog = locationProgress(profile, l.id);
            return (
              <button
                key={l.id}
                className={`tl-row${here ? ' here' : ''}${danger === 'locked' ? ' locked' : ''}${l.special === 'rift' ? ' rift' : ''}`}
                style={{ ['--dc' as string]: col }}
                onClick={() => setOpen(l)}
              >
                <span className="tl-node">{danger === 'locked' ? <UiIcon kind="lock" size={14} /> : l.id}</span>
                <span className="tl-card">
                  <span className="tl-top">
                    <b>{l.name}</b>
                    {here && <span className="tl-here">вы здесь</span>}
                  </span>
                  <span className="tl-meta">
                    <span className="tl-danger">{DANGER[danger].label}</span>
                    <span className="muted">
                      Т{l.tier} · вход с {l.recommendedLevel} ур.
                    </span>
                    {danger !== 'locked' && danger !== 'level' && (
                      <span className="muted">
                        · босс {prog.bossKills > 0 ? `×${prog.bossKills}` : 'не побеждён'}
                      </span>
                    )}
                    {ready && <span className="tl-boss">босс готов</span>}
                  </span>
                </span>
              </button>
            );
          })}
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
