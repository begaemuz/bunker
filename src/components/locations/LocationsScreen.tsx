import { bossesConfig } from '../../game/config/bossesConfig';
import { robotsConfig } from '../../game/config/enemiesConfig';
import { itemTemplates } from '../../game/config/itemsConfig';
import { locationsConfig } from '../../game/config/locationsConfig';
import { canSummonBoss, isLocationUnlocked, locationProgress } from '../../game/profile/Profile';
import { rewardDecay } from '../../game/progression/rewards';
import type { ResourceKey } from '../../game/types';
import { ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { Bar } from '../common/Common';
import { ResourceIcon, UiIcon } from '../common/Icons';

export function LocationsScreen() {
  const profile = useProfile((s) => s.profile)!;
  const setLocation = useProfile((s) => s.setLocation);
  const newRun = useUi((s) => s.newRun);
  const toast = useUi((s) => s.toast);
  const hud = useUi((s) => s.hud);

  const go = (id: number) => {
    if (hud?.mode === 'boss') {
      toast('Сначала завершите бой с боссом', 'bad');
      return;
    }
    setLocation(id);
    newRun();
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Локации</h2>
        <span className="small muted">
          открыто {profile.locations.unlocked.length} / {locationsConfig.length}
        </span>
      </div>
      <div className="screen-body">
        {locationsConfig.map((l) => {
          const unlocked = isLocationUnlocked(profile, l.id);
          const current = profile.locations.current === l.id;
          const prog = locationProgress(profile, l.id);
          const boss = bossesConfig[l.boss];
          const decay = rewardDecay(profile.bunker.level, l);
          const bonusRes = Object.entries(l.resourceMult).filter(([, v]) => (v ?? 1) > 1) as [ResourceKey, number][];
          return (
            <div key={l.id} className={`loc-card${current ? ' current' : ''}${unlocked ? '' : ' locked'}`}>
              <div className="bg" style={{ background: `linear-gradient(135deg, ${l.palette.groundAlt}, ${l.palette.accent} 60%, ${l.palette.fog})` }} />
              <div className="inner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="loc-num">ЛОКАЦИЯ {l.id} · Т{l.tier}</span>
                  {current && <span className="tag">Текущая</span>}
                  {!unlocked && (
                    <span className="muted">
                      <UiIcon kind="lock" size={16} />
                    </span>
                  )}
                </div>
                <div className="loc-name">{l.name}</div>
                <div className="small" style={{ color: '#c5cdd3', lineHeight: 1.4 }}>
                  {l.description}
                </div>
                {unlocked ? (
                  <>
                    <div className="small" style={{ marginTop: 8 }}>
                      <b style={{ color: '#ff6b5a' }}>{boss.name}</b> <span className="muted">— {boss.title}</span>
                    </div>
                    <div className="hud-row" style={{ marginTop: 6 }}>
                      <span>Группы</span>
                      <div className="grow">
                        <Bar value={prog.groups} max={l.groupsForBoss} color={canSummonBoss(profile, l.id) ? '#5fd16a' : '#d9772e'} thin />
                      </div>
                      <span>
                        <b>{prog.groups}</b>/{l.groupsForBoss}
                      </span>
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>
                      Побед над боссом: {prog.bossKills} · рекомендуемый уровень {l.recommendedLevel}
                      {decay < 1 && <span className="neg"> · награды за роботов снижены до {Math.round(decay * 100)}%</span>}
                    </div>
                    <div className="small" style={{ marginTop: 6 }}>
                      <span className="muted">Противники: </span>
                      {l.enemies.map((e) => robotsConfig[e.kind].name.toLowerCase()).join(', ')}
                    </div>
                    {bonusRes.length > 0 && (
                      <div className="small" style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className="muted">Больше ресурсов:</span>
                        {bonusRes.map(([k]) => (
                          <span key={k}>
                            <ResourceIcon type={k} /> {ru.resource[k]}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="small" style={{ marginTop: 4 }}>
                      <span className="muted">Уникальные трофеи: </span>
                      {boss.uniques.map((u) => `${itemTemplates.find((t) => t.id === u.template)?.name} (${Math.round(u.chance * 100)}%)`).join(', ')}
                    </div>
                    {!current && (
                      <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={() => go(l.id)}>
                        Перейти
                      </button>
                    )}
                  </>
                ) : (
                  <div className="small muted" style={{ marginTop: 8 }}>
                    Откроется после победы над боссом локации {l.id - 1}.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
