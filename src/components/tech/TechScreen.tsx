import { useState } from 'react';
import { getTech, techBranches, techConfig, type TechBranch } from '../../game/config/techConfig';
import { requiredBunkerLevel, researchBlock, researchCost, techLevel } from '../../game/progression/TechnologyTree';
import { RESOURCE_KEYS } from '../../game/types';
import { fmtNum } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { ResourceIcon } from '../common/Icons';

export function TechScreen() {
  const profile = useProfile((s) => s.profile)!;
  const doResearch = useProfile((s) => s.research);
  const toast = useUi((s) => s.toast);
  const [branch, setBranch] = useState<TechBranch>('em');
  const nodes = techConfig.filter((t) => t.branch === branch);
  const info = techBranches.find((b) => b.id === branch)!;
  const ready = (b: TechBranch) => techConfig.filter((t) => t.branch === b && !researchBlock(profile, t)).length;

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Исследования</h2>
        <span className="lvl-badge">УР {profile.bunker.level}</span>
      </div>
      <div className="tabs">
        {techBranches.map((b) => (
          <button key={b.id} className={`tab${branch === b.id ? ' on' : ''}`} onClick={() => setBranch(b.id)}>
            {b.name}
            {ready(b.id) > 0 && <span style={{ color: '#5fd16a' }}> ●</span>}
          </button>
        ))}
      </div>
      <div className="screen-body">
        <div className="small muted" style={{ margin: '2px 2px 10px' }}>
          {info.description}
        </div>
        {nodes.map((n) => {
          const lvl = techLevel(profile, n.id);
          const block = researchBlock(profile, n);
          const cost = researchCost(n, lvl);
          const maxed = block === 'max';
          const locked = block === 'level' || block === 'requires';
          return (
            <div key={n.id} className={`tech-card${maxed ? ' maxed' : ''}${locked ? ' locked' : ''}`}>
              <div className="tech-head">
                <div className="grow">
                  <div className="tech-name">{n.name}</div>
                  <div className="small muted">{n.description}</div>
                </div>
                <span className="small" style={{ fontWeight: 900 }}>
                  {lvl}/{n.maxLevel}
                </span>
              </div>
              <div className="pips">
                {Array.from({ length: n.maxLevel }, (_, i) => (
                  <span key={i} className={`pip${i < lvl ? ' on' : ''}`} />
                ))}
              </div>
              {!maxed && (
                <>
                  {block === 'level' && (
                    <div className="small neg" style={{ marginBottom: 6 }}>
                      Нужен уровень бункера {requiredBunkerLevel(n, lvl)}
                    </div>
                  )}
                  {block === 'requires' && (
                    <div className="small neg" style={{ marginBottom: 6 }}>
                      Требуется: {n.requires.map((r) => `${getTech(r.id)?.name} ${r.level}`).join(', ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div className="cost-row grow">
                      {RESOURCE_KEYS.filter((k) => cost[k]).map((k) => (
                        <span key={k} className={profile.resources[k] < (cost[k] ?? 0) ? 'lack' : ''}>
                          <ResourceIcon type={k} /> {fmtNum(cost[k]!)}
                        </span>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!!block}
                      onClick={() => {
                        const err = doResearch(n.id);
                        if (err) toast('Исследование недоступно', 'bad');
                        else {
                          sfx.levelUp();
                          toast(`Изучено: ${n.name} ${lvl + 1}`, 'good');
                        }
                      }}
                    >
                      Изучить
                    </button>
                  </div>
                </>
              )}
              {maxed && <div className="small pos">Изучено полностью</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
