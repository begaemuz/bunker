import { useMemo, useState } from 'react';
import { computeBunkerStats } from '../../game/bunker/BunkerStats';
import { rarityIndex } from '../../game/items/ItemRarity';
import { isEquipped, xpForLevel } from '../../game/profile/Profile';
import { DAMAGE_TYPES, EQUIP_CATEGORIES, type EquipCategory } from '../../game/types';
import { ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { colors, damageColor, rarityColor } from '../../ui/theme';
import { Bar } from '../common/Common';
import { CategoryGlyph, ItemIcon, UiIcon } from '../common/Icons';
import { ItemCard } from '../inventory/ItemCard';
import { ItemRow, shortStats } from '../inventory/ItemRow';

function BStat({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="bstat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {hint && <div className="small muted">{hint}</div>}
    </div>
  );
}

export function EquipmentScreen() {
  const profile = useProfile((s) => s.profile)!;
  const hud = useUi((s) => s.hud);
  const selected = useUi((s) => s.selectedItemId);
  const selectItem = useUi((s) => s.selectItem);
  const setEquipTarget = useUi((s) => s.setEquipTarget);
  const [picker, setPicker] = useState<{ category: EquipCategory; slot: number } | null>(null);

  const stats = useMemo(() => computeBunkerStats(profile), [profile]);
  const en = stats.energy;
  const lvl = profile.bunker.level;

  const candidates = useMemo(() => {
    if (!picker) return [];
    return Object.values(profile.items)
      .filter((i) => i.category === picker.category && !isEquipped(profile, i.id))
      .sort((a, b) => rarityIndex(b.rarity) - rarityIndex(a.rarity) || b.level - a.level);
  }, [picker, profile]);

  const openSlot = (category: EquipCategory, slot: number, itemId: string | null) => {
    if (itemId) {
      setEquipTarget(null);
      selectItem(itemId);
    } else setPicker({ category, slot });
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Экипировка бункера</h2>
      </div>
      <div className="screen-body">
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="hud-row">
            <span className="lvl-badge">УР {lvl}</span>
            <div className="grow">
              <Bar value={profile.bunker.xp} max={xpForLevel(lvl)} color={colors.xp} thin />
            </div>
            <span>
              {Math.floor(profile.bunker.xp)} / {xpForLevel(lvl)} опыта
            </span>
          </div>
          <div className="small muted">Каждый уровень: +6% урона и +5% прочности бункера.</div>
        </div>

        <div className="section-title">Характеристики</div>
        <div className="bunker-stats">
          <BStat k="Урон импульса" v={stats.damage.toFixed(0)} />
          <BStat k="Частота" v={`${stats.pulseRate.toFixed(2)}/с`} />
          <BStat k="DPS по цели" v={stats.singleTargetDps.toFixed(0)} />
          <BStat k="Радиус" v={stats.radius.toFixed(0)} />
          <BStat k="Прочность" v={stats.maxHp.toFixed(0)} />
          <BStat k="Регенерация" v={`${stats.regen.toFixed(1)}/с`} />
          <BStat k="Крит. импульс" v={`${(stats.critChance * 100).toFixed(0)}% ×${stats.critMultiplier.toFixed(2)}`} />
          <BStat k="Слоты эффектов" v={`${stats.effects.length} / ${stats.effectSlots}`} />
        </div>

        <div className="section-title">Типы урона</div>
        <div className="panel small">
          {stats.components.map((c) => (
            <div className="stat-line" key={c.type}>
              <span style={{ color: damageColor[c.type] }}>{ru.damage[c.type]}</span>
              <span>{(c.mult * 100).toFixed(0)}% урона импульса</span>
            </div>
          ))}
        </div>

        <div className="section-title">Дополнительные эффекты</div>
        <div className="panel small">
          {stats.effects.length === 0 && stats.inactiveEffects.length === 0 && (
            <div className="muted">Нет эффектов. Их дают катушки, конденсаторы и реакторы.</div>
          )}
          {stats.effects.map((e) => (
            <div className="stat-line" key={e.kind}>
              <span>{ru.effect[e.kind]}</span>
              <span className="pos">{(e.chance * 100).toFixed(1)}%</span>
            </div>
          ))}
          {stats.inactiveEffects.map((e) => (
            <div className="stat-line" key={e.kind}>
              <span className="muted">{ru.effect[e.kind]} — не активен</span>
              <span className="muted">нет слота</span>
            </div>
          ))}
        </div>

        <div className="section-title">Энергосистема</div>
        <div className="panel energy-box">
          <div className="stat-line">
            <span>Выработка</span>
            <span className="pos">{en.generation.toFixed(1)}/с</span>
          </div>
          <div className="stat-line">
            <span>Потребление</span>
            <span className="neg">{en.consumption.toFixed(1)}/с</span>
          </div>
          <div className="stat-line">
            <span>Баланс</span>
            <span className={en.balance >= 0 ? 'pos' : 'neg'}>
              {en.balance >= 0 ? '+' : ''}
              {en.balance.toFixed(1)}/с
            </span>
          </div>
          <div className="stat-line">
            <span>Энергорезерв</span>
            <span>{en.batteryCap}</span>
          </div>
          {hud && (
            <Bar value={hud.battery} max={hud.batteryCap} color={colors.energy} label={`Заряд ${Math.round(hud.battery)} / ${hud.batteryCap}`} />
          )}
          <div className="small muted">
            {en.balance >= 0
              ? 'Энергии хватает: всё оборудование работает на 100%.'
              : `Дефицит ${Math.abs(en.balance).toFixed(1)}/с покрывается из резерва (~${Math.floor(en.batteryCap / Math.abs(en.balance))} с). Затем бонусы оборудования ослабнут до ${Math.round((en.generation / en.consumption) * 100)}%. Ядро бункера работает всегда.`}
          </div>
        </div>

        <div className="section-title">Сопротивления</div>
        <div className="panel small">
          {DAMAGE_TYPES.filter((t) => stats.resist[t] > 0).length === 0 ? (
            <div className="muted">Нет сопротивлений.</div>
          ) : (
            DAMAGE_TYPES.filter((t) => stats.resist[t] > 0).map((t) => (
              <div className="stat-line" key={t}>
                <span>{ru.damage[t]}</span>
                <span className="pos">{(stats.resist[t] * 100).toFixed(0)}%</span>
              </div>
            ))
          )}
        </div>

        {EQUIP_CATEGORIES.map((c) => (
          <div key={c}>
            <div className="section-title">
              <span>{ru.categoryPlural[c]}</span>
              <span>
                {profile.equipment[c].filter(Boolean).length} / {profile.equipment[c].length}
              </span>
            </div>
            {profile.equipment[c].map((id, i) => {
              const it = id ? profile.items[id] : null;
              return (
                <button
                  key={i}
                  className={`slot-card${it ? ' filled' : ''}`}
                  style={it ? { borderLeftColor: rarityColor[it.rarity] } : undefined}
                  onClick={() => openSlot(c, i, it?.id ?? null)}
                >
                  {it ? (
                    <ItemIcon category={it.category} rarity={it.rarity} level={it.level} />
                  ) : (
                    <div className="item-icon" style={{ borderColor: '#333940', borderStyle: 'dashed' }}>
                      <CategoryGlyph category={c} color="#4a525a" />
                    </div>
                  )}
                  <div className="grow">
                    {it ? (
                      <>
                        <div className="item-name" style={{ color: rarityColor[it.rarity] }}>
                          {it.name}
                        </div>
                        <div className="item-stats">{shortStats(it)}</div>
                        <div className="item-sub">Энергия: {it.energyCost > 0 ? `−${it.energyCost.toFixed(1)}/с` : 'не потребляет'}</div>
                      </>
                    ) : (
                      <>
                        <div className="item-name muted">Пустой слот</div>
                        <div className="item-sub">Нажмите, чтобы установить {ru.category[c].toLowerCase()}</div>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {picker && (
        <div className="modal-back" onClick={() => setPicker(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="screen-header" style={{ paddingTop: 10, borderRadius: '14px 14px 0 0' }}>
              <h2 className="grow">{ru.categoryPlural[picker.category]}</h2>
              <button className="btn btn-ghost icon-btn" onClick={() => setPicker(null)}>
                <UiIcon kind="close" />
              </button>
            </div>
            <div className="sheet-body">
              {candidates.length === 0 ? (
                <div className="empty">Нет свободных предметов этой категории.</div>
              ) : (
                candidates.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    onClick={() => {
                      setEquipTarget(picker);
                      setPicker(null);
                      selectItem(it.id);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <ItemCard
          itemId={selected}
          onClose={() => {
            selectItem(null);
            setEquipTarget(null);
          }}
        />
      )}
    </div>
  );
}
