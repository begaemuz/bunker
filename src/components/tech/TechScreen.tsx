import { useState } from 'react';
import { getTech, techBranches, techConfig, type TechBranch, type TechEffect, type TechNode } from '../../game/config/techConfig';
import { formatStatValue } from '../../game/items/statInfo';
import { branchPoints, effectValue, researchBlock, researchCost, techLevel } from '../../game/progression/TechnologyTree';
import { RESOURCE_KEYS, type StatKey } from '../../game/types';
import { fmtNum } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { ResourceIcon, UiIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';


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
          <button className="btn btn-primary btn-hazard" style={{ flex: 2 }} disabled={!!block} onClick={() => learn(1)}>
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

/** Глифы навыков: линейные пиктограммы 24×24. */
const GLYPH: Record<string, string> = {
  e_gen: 'M13 2 5 13h6l-1 9 8-11h-6z',
  c_rate: 'M12 2v20M4 6.5l16 11M20 6.5l-16 11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5',
  e_cap: 'M7 6h10v15H7zM10 3h4v3M10 11h4M10 15h4',
  c_cap: 'M9 4a3 3 0 0 1 6 0v10a5 5 0 1 1-6 0zM12 9v8',
  e_charge: 'M3 12h4l3-7 4 14 3-7h4',
  c_heat: 'M12 3c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 1 4 3 4 0-4-2-6 0-9z',
  e_loss: 'M4 8h13l-3-3M20 16H7l3 3',
  c_stab: 'M4 17a8 8 0 1 1 16 0M12 17l4-6M8 13h.01M16 13h.01',
  e_drain: 'M9 2v5M15 2v5M7 7h10v4a5 5 0 0 1-10 0zM12 16v6',
  c_load: 'M7 7h10v10H7zM10 2v5M14 2v5M10 17v5M14 17v5M2 10h5M2 14h5M17 10h5M17 14h5',
  m_power: 'M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3M12 9l1.5 3-1.5 3-1.5-3z',
  m_radius: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 11.5v1',
  m_rate: 'M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0 2 3 2 3',
  m_cost: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11zM9 15h6',
  m_crit: 'M12 2v6M12 16v6M2 12h6M16 12h6M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12',
  m_critdmg: 'M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z',
  m_chain: 'M3 4l5 6-4 1 6 9M14 4l3 5-3 1 5 9',
  m_break: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5zM12 6l-2 5h4l-2 6',
  d_hull: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  g_salvage: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M9 9h4.5a2 2 0 0 1 0 4H9v-6M9 13v4M8 15h5',
  d_regen: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  g_cost: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
  d_dr: 'M4 6l8-3 8 3M4 11l8-3 8 3M4 16l8-3 8 3M4 6v10M20 6v10',
  g_chance: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01',
  d_emerg: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  g_maxlvl: 'M4 20h4v-6H4zM10 20h4V9h-4zM16 20h4V4h-4z',
  d_contour: 'M2 18a10 10 0 0 1 20 0M6 18a6 6 0 0 1 12 0M12 18h.01',
  g_drops: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
};

function TechGlyph({ id, color, size = 30 }: { id: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={GLYPH[id] ?? 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18'} />
    </svg>
  );
}

const ROW_H = 132;

function shortValue(n: TechNode, lvl: number): string {
  return n.effects.length ? fmtEffect(n.effects[0], lvl) : '';
}

function BranchTree({ branch, onOpen }: { branch: (typeof techBranches)[number]; onOpen: (n: TechNode) => void }) {
  const profile = useProfile((s) => s.profile)!;
  const nodes = techConfig.filter((t) => t.branch === branch.id);
  const tiers = Math.max(...nodes.map((n) => n.tier)) + 1;
  const height = tiers * ROW_H;
  const X = [27, 73];
  const cy = (tier: number) => tier * ROW_H + 50;
  return (
    <div className="skill-tree" style={{ height, ['--bc' as string]: branch.color }}>
      <svg className="skill-lines" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height}>
        {Array.from({ length: tiers }, (_, t) => (
          <line key={`r${t}`} x1={X[0]} y1={cy(t)} x2={X[1]} y2={cy(t)} stroke="#20272e" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="3 5" />
        ))}
        {nodes.flatMap((n) =>
          n.requires.map((r) => {
            const parent = getTech(r.id);
            if (!parent || parent.branch !== n.branch) return null;
            const met = techLevel(profile, r.id) >= r.level;
            const x1 = X[parent.col];
            const x2 = X[n.col];
            const y1 = cy(parent.tier) + 34;
            const y2 = cy(n.tier) - 34;
            const d = x1 === x2 ? `M${x1} ${y1} V${y2}` : `M${x1} ${y1} V${(y1 + y2) / 2} H${x2} V${y2}`;
            return (
              <g key={`${r.id}-${n.id}`}>
                <path d={d} fill="none" stroke="#0a0d10" strokeWidth="8" vectorEffect="non-scaling-stroke" />
                <path d={d} fill="none" stroke={met ? branch.color : '#2b333b'} strokeWidth="3" vectorEffect="non-scaling-stroke" className={met ? 'flow' : undefined} />
              </g>
            );
          }),
        )}
      </svg>
      {nodes.map((n) => {
        const lvl = techLevel(profile, n.id);
        const block = researchBlock(profile, n);
        const locked = block === 'level' || block === 'requires';
        const state = locked ? 'locked' : !block ? 'ready' : lvl > 0 ? 'active' : 'idle';
        return (
          <button
            key={n.id}
            className={`tnode ${state}${lvl > 0 ? ' learned' : ''}`}
            style={{ left: `${X[n.col]}%`, top: cy(n.tier) - 38 }}
            onClick={() => onOpen(n)}
          >
            <span className="tnode-medal">
              <svg className="tnode-hex" viewBox="0 0 100 100" aria-hidden>
                <path d="M50 3 93 27v46L50 97 7 73V27z" />
                <path className="inner" d="M50 13 84 32v36L50 87 16 68V32z" />
              </svg>
              <span className="tnode-glyph">
                {locked ? <UiIcon kind="lock" size={24} /> : <TechGlyph id={n.id} color={lvl > 0 ? branch.color : '#9aa4ad'} />}
              </span>
              <span className="tnode-lvl">{lvl}</span>
              {state === 'ready' && <span className="tnode-plus">+</span>}
            </span>
            <span className="tnode-name">{n.name}</span>
            <span className="tnode-val">{locked && block === 'level' ? `Нужен ур. ${n.levelReq}` : lvl > 0 ? shortValue(n, lvl) : shortValue(n, 1)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TechScreen() {
  const profile = useProfile((s) => s.profile)!;
  const [open, setOpen] = useState<TechNode | null>(null);
  const [tab, setTab] = useState<TechBranch>('energy');
  const r = profile.resources;
  const branch = techBranches.find((b) => b.id === tab)!;
  const readyIn = (b: TechBranch) => techConfig.filter((n) => n.branch === b && !researchBlock(profile, n)).length;
  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Наука</h2>
        <span className="lvl-badge">УР {profile.bunker.level}</span>
      </div>
      <div className="tabs skill-tabs">
        {techBranches.map((b) => {
          const n = readyIn(b.id);
          return (
            <button key={b.id} className={`tab${tab === b.id ? ' on' : ''}`} style={{ ['--bc' as string]: b.color }} onClick={() => setTab(b.id)}>
              <span className="tab-dot" />
              {({ energy: 'Энергия', em: 'Оружие', defense: 'Защита' } as Record<TechBranch, string>)[b.id]}
              {n > 0 && <span className="tab-count">{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="screen-body skill-body" style={{ ['--bc' as string]: branch.color }}>
        <div className="skill-head">
          <div className="grow">
            <div className="skill-title">{branch.name}</div>
            <div className="small muted">{branch.description}</div>
          </div>
          <div className="skill-points">
            <b>{branchPoints(profile, branch.id)}</b>
            <span>очков</span>
          </div>
        </div>
        <div className="res-strip skill-res">
          {(['coins', 'scrap', 'techParts', 'blueprints', 'energyCores'] as const).map((k) => (
            <span key={k} className="res">
              <ResourceIcon type={k} /> {fmtNum(r[k])}
            </span>
          ))}
        </div>
        <BranchTree branch={branch} onOpen={setOpen} />
        <div className="small muted" style={{ margin: '4px 0 12px', textAlign: 'center' }}>
          Знак «+» — можно изучить сейчас. Уровни навыков не ограничены.
        </div>
      </div>
      {open && <NodeSheet node={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
