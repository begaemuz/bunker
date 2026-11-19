import { useState } from 'react';
import { getTech, techBranches, techConfig, type TechEffect, type TechNode } from '../../game/config/techConfig';
import { formatStatValue } from '../../game/items/statInfo';
import { branchPoints, effectValue, researchBlock, researchCost, techLevel } from '../../game/progression/TechnologyTree';
import { RESOURCE_KEYS, type StatKey } from '../../game/types';
import { fmtNum } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';

const ROW = 74;
const GAP = 22;

function fmtEffect(e: TechEffect, lvl: number): string {
  const v = effectValue(e, lvl);
  if (e.key === 'maxItemLevel') return `+${Math.floor(v)}`;
  if (e.key === 'upgradeChance' || e.key === 'upgradeCost') return `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`;
  return formatStatValue(e.key as StatKey, v);
}

function describe(n: TechNode, lvl: number): string {
  return n.description.replace('{v}', n.effects.length ? fmtEffect(n.effects[0], Math.max(lvl, 0)) : '');
}

function NodeSheet({ node, onClose }: { node: TechNode; onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const doResearch = useProfile((s) => s.research);
  const toast = useUi((s) => s.toast);
  const lvl = techLevel(profile, node.id);
  const block = researchBlock(profile, node);
  const cost = researchCost(node, lvl);
  const branch = techBranches.find((b) => b.id === node.branch)!;

  const learn = (times: number) => {
    let n = 0;
    for (let i = 0; i < times; i++) {
      if (doResearch(node.id)) break;
      n++;
    }
    if (n > 0) {
      sfx.levelUp();
      toast(`${node.name}: уровень ${lvl + n}`, 'good');
    } else toast('Не хватает ресурсов', 'bad');
  };

  return (
    <Sheet
      title={node.name}
      subtitle={`${branch.name} · уровень ${lvl}`}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
          <button className="btn btn-primary" disabled={!!block} onClick={() => learn(1)}>
            Изучить
          </button>
          <button className="btn btn-gold" disabled={!!block} onClick={() => learn(10)}>
            ×10
          </button>
        </>
      }
    >
      <div className="bunker-stats" style={{ marginBottom: 10 }}>
        <div className="bstat">
          <div className="k">Сейчас</div>
          <div className="v" style={{ fontSize: 13 }}>
            {lvl > 0 ? describe(node, lvl) : 'Не изучено'}
          </div>
        </div>
        <div className="bstat">
          <div className="k">Уровень {lvl + 1}</div>
          <div className="v pos" style={{ fontSize: 13 }}>
            {describe(node, lvl + 1)}
          </div>
        </div>
      </div>
      {node.effects.some((e) => e.cap !== undefined) && (
        <div className="small muted" style={{ marginBottom: 10 }}>
          Эффект растёт бесконечно, но приближается к пределу {fmtEffect({ ...node.effects[0], perLevel: node.effects[0].cap! }, 1)}.
        </div>
      )}
      <div className="section-title" style={{ marginTop: 0 }}>
        Стоимость уровня {lvl + 1}
      </div>
      <div className="cost-row" style={{ marginBottom: 10 }}>
        {RESOURCE_KEYS.filter((k) => cost[k]).map((k) => (
          <span key={k} className={profile.resources[k] < (cost[k] ?? 0) ? 'lack' : ''}>
            <ResourceIcon type={k} /> {fmtNum(cost[k]!)} / {fmtNum(profile.resources[k])}
          </span>
        ))}
      </div>
      <div className="small muted">Каждый следующий уровень дороже в {node.growth.toFixed(2)} раза. Уровни не ограничены.</div>
      {block === 'level' && <div className="warn-box" style={{ marginTop: 10 }}>Нужен уровень бункера {node.levelReq}.</div>}
      {block === 'requires' && (
        <div className="warn-box" style={{ marginTop: 10 }}>
          Сначала изучите: {node.requires.map((r) => `${getTech(r.id)?.name} до ур. ${r.level}`).join(', ')}.
        </div>
      )}
    </Sheet>
  );
}

function BranchColumn({ branch, onOpen }: { branch: (typeof techBranches)[number]; onOpen: (n: TechNode) => void }) {
  const profile = useProfile((s) => s.profile)!;
  const nodes = techConfig.filter((t) => t.branch === branch.id);
  const tiers = Math.max(...nodes.map((n) => n.tier)) + 1;
  const height = tiers * ROW + (tiers - 1) * GAP;
  const pos = (n: TechNode) => ({ x: n.col * 50 + 25, y: n.tier * (ROW + GAP) + 23 });
  return (
    <div className="tree-col">
      <div className="tree-head">
        <b style={{ color: branch.color }}>{branch.name}</b>
        <span className="small muted">очков: {branchPoints(profile, branch.id)}</span>
      </div>
      <div className="tree-grid" style={{ gridTemplateRows: `repeat(${tiers}, ${ROW}px)` }}>
        <svg className="tree-lines" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height}>
          {nodes.flatMap((n) =>
            n.requires.map((r) => {
              const parent = getTech(r.id);
              if (!parent || parent.branch !== n.branch) return null;
              const a = pos(parent);
              const b = pos(n);
              const met = techLevel(profile, r.id) >= r.level;
              return (
                <line
                  key={`${r.id}-${n.id}`}
                  x1={a.x}
                  y1={a.y + 23}
                  x2={b.x}
                  y2={b.y - 23}
                  stroke={met ? branch.color : '#2c343d'}
                  strokeWidth={met ? 2.5 : 2}
                  vectorEffect="non-scaling-stroke"
                  strokeOpacity={met ? 0.8 : 1}
                />
              );
            }),
          )}
        </svg>
        {nodes.map((n) => {
          const lvl = techLevel(profile, n.id);
          const block = researchBlock(profile, n);
          const locked = block === 'level' || block === 'requires';
          return (
            <button
              key={n.id}
              className={`node${lvl > 0 ? ' active' : ''}${locked ? ' locked' : ''}${!block ? ' ready' : ''}`}
              style={{ gridRow: n.tier + 1, gridColumn: n.col + 1, ['--bc' as string]: branch.color }}
              onClick={() => onOpen(n)}
            >
              <span className="node-orb" style={{ color: lvl > 0 ? branch.color : '#8a949c' }}>
                {lvl}
              </span>
              <span className="node-name">{n.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TechScreen() {
  const profile = useProfile((s) => s.profile)!;
  const [open, setOpen] = useState<TechNode | null>(null);
  const r = profile.resources;
  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Наука</h2>
        <span className="lvl-badge">УР {profile.bunker.level}</span>
      </div>
      <div className="screen-body">
        <div className="res-strip" style={{ marginBottom: 10, justifyContent: 'center' }}>
          {(['coins', 'scrap', 'techParts', 'blueprints', 'energyCores'] as const).map((k) => (
            <span key={k} className="res">
              <ResourceIcon type={k} /> {fmtNum(r[k])}
            </span>
          ))}
        </div>
        <div className="tree">
          {techBranches.map((b) => (
            <BranchColumn key={b.id} branch={b} onOpen={setOpen} />
          ))}
        </div>
        <div className="small muted" style={{ marginTop: 10, textAlign: 'center' }}>
          Нажмите на навык, чтобы изучить. Зелёная точка — можно изучить сейчас. Уровни навыков не ограничены.
        </div>
      </div>
      {open && <NodeSheet node={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
