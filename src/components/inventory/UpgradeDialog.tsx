import { useState } from 'react';
import { balanceConfig } from '../../game/config/balanceConfig';
import { coilProps, itemModifiers } from '../../game/items/ItemGenerator';
import { bunkerLevelCap, effectiveMaxLevel, upgradeBlock, upgradeChance, upgradeCost } from '../../game/items/ItemUpgrade';
import { formatStatValue } from '../../game/items/statInfo';
import { RESOURCE_KEYS, type Item } from '../../game/types';
import { fmtNum, ru, statLabel } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ItemIcon, ResourceIcon } from '../common/Icons';

function preview(item: Item): { label: string; from: string; to: string }[] {
  const next = { ...item, level: item.level + 1 };
  const c0 = coilProps(item);
  const c1 = coilProps(next);
  if (c0 && c1) {
    return [
      { label: 'Мощность импульса', from: c0.power.toFixed(1), to: c1.power.toFixed(1) },
      { label: 'Радиус', from: c0.radius.toFixed(0), to: c1.radius.toFixed(0) },
      { label: 'Интервал', from: `${c0.interval.toFixed(2)} с`, to: `${c1.interval.toFixed(2)} с` },
    ];
  }
  const a = itemModifiers(item);
  const b = itemModifiers(next);
  return a
    .map((m, i) => ({ label: statLabel(m.stat), from: formatStatValue(m.stat, m.value), to: formatStatValue(m.stat, b[i].value) }))
    .filter((r) => r.from !== r.to);
}

export function UpgradeDialog({ itemId, onClose, onDestroyed }: { itemId: string; onClose: () => void; onDestroyed: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const upgrade = useProfile((s) => s.upgrade);
  const toast = useUi((s) => s.toast);
  const [useStab, setUseStab] = useState(profile.resources.stabilizers > 0 && (profile.items[itemId]?.level ?? 1) >= 4);
  const item = profile.items[itemId];
  if (!item) return null;

  const cost = upgradeCost(profile, item);
  const p = upgradeChance(profile, item);
  const block = upgradeBlock(profile, item, useStab);
  const maxLvl = effectiveMaxLevel(profile, item);
  const cap = bunkerLevelCap(profile);
  const rows = preview(item);

  const go = () => {
    const r = upgrade(item.id, useStab);
    if (r.error) {
      toast('Улучшение недоступно', 'bad');
      return;
    }
    if (r.outcome === 'success') {
      sfx.levelUp();
      toast(`Успех! ${item.name} — уровень ${item.level + 1}`, 'good');
    } else if (r.outcome === 'failed_protected') {
      sfx.hit();
      toast('Неудача. Стабилизатор сохранил оборудование', 'bad');
    } else {
      sfx.defeat();
      toast(`${item.name} уничтожено при улучшении`, 'bad');
      for (const g of r.granted) toast(`Выдано аварийное оборудование: ${g.name}`, 'info');
      onDestroyed();
      return;
    }
  };

  return (
    <div className="modal-back center" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <ItemIcon category={item.category} rarity={item.rarity} level={item.level} size={52} />
          <div className="grow">
            <h3 style={{ margin: 0, color: rarityColor[item.rarity] }}>{item.name}</h3>
            <div className="item-sub">
              Улучшение: уровень {item.level} → <b style={{ color: '#fff' }}>{item.level + 1}</b> (макс. {maxLvl})
            </div>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="stat-list" style={{ marginBottom: 10 }}>
            {rows.map((r) => (
              <div className="stat-line" key={r.label}>
                <span>{r.label}</span>
                <span>
                  <span className="muted">{r.from}</span> → <span className="pos">{r.to}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="bunker-stats" style={{ marginBottom: 10 }}>
          <div className="bstat">
            <div className="k">Шанс успеха</div>
            <div className="v pos">{Math.round(p * 100)}%</div>
          </div>
          <div className="bstat">
            <div className="k">Шанс поломки</div>
            <div className={`v ${useStab ? 'muted' : 'neg'}`}>{useStab ? '0%' : `${Math.round((1 - p) * 100)}%`}</div>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 0 }}>
          Стоимость
        </div>
        <div className="cost-row" style={{ marginBottom: 10 }}>
          {RESOURCE_KEYS.filter((k) => cost[k]).map((k) => (
            <span key={k} className={profile.resources[k] < (cost[k] ?? 0) ? 'lack' : ''}>
              <ResourceIcon type={k} /> {fmtNum(cost[k]!)} / {fmtNum(profile.resources[k])}
            </span>
          ))}
        </div>

        <button
          className="toggle-row"
          style={{ width: '100%', marginBottom: 10, textAlign: 'left' }}
          onClick={() => setUseStab(!useStab)}
          disabled={profile.resources.stabilizers < 1}
        >
          <span>
            <ResourceIcon type="stabilizers" /> Использовать стабилизатор
            <br />
            <span className="small muted">
              Есть: {profile.resources.stabilizers}. Защищает от уничтожения, шанс успеха не меняет.
            </span>
          </span>
          <span className={`switch${useStab ? ' on' : ''}`} />
        </button>

        {!useStab && (
          <div className="warn-box">
            При неудаче ({Math.round((1 - p) * 100)}%) оборудование будет уничтожено вместе с установленными модификациями.
            Ресурсы за попытку не возвращаются.
          </div>
        )}
        {block === 'bunker' && (
          <div className="info-box" style={{ marginBottom: 10 }}>
            Уровень оборудования не может быть выше уровня бункера + {balanceConfig.item.levelOverBunker} (сейчас до {cap}). Повышайте уровень бункера.
          </div>
        )}
        {block === 'max' && (
          <div className="info-box" style={{ marginBottom: 10 }}>
            Достигнут максимальный уровень. Его повышает технология «Предельные нагрузки».
          </div>
        )}

        <div className="row">
          <button className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
          <button className={`btn ${useStab ? 'btn-primary' : 'btn-gold'}`} disabled={!!block} onClick={go}>
            Улучшить
          </button>
        </div>
        <div className="small muted" style={{ marginTop: 8, textAlign: 'center' }}>
          {ru.rarity[item.rarity]} · технологический уровень {item.tier}
        </div>
      </div>
    </div>
  );
}
