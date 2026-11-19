import { useMemo, useState } from 'react';
import { computeBunkerStats, type BunkerStats, type Warning } from '../../game/bunker/BunkerStats';
import { modeConfig } from '../../game/config/gameConfig';
import { rarityIndex } from '../../game/items/ItemRarity';
import { upgradeBlock } from '../../game/items/ItemUpgrade';
import { slotOf, xpForLevel, type Profile } from '../../game/profile/Profile';
import { SLOT_CATEGORY, type SlotId } from '../../game/types';
import { ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { colors, rarityColor } from '../../ui/theme';
import { Bar } from '../common/Common';
import { CategoryGlyph, ItemIcon, UiIcon } from '../common/Icons';
import { ItemCard } from '../inventory/ItemCard';
import { ItemRow } from '../inventory/ItemRow';

const LEFT: SlotId[] = ['generator', 'converter', 'capacitor', 'cooling'];
const RIGHT: SlotId[] = ['coil1', 'coil2', 'sensor', 'shield'];

function warningText(w: Warning): { text: string; ok?: boolean } {
  switch (w.kind) {
    case 'no_generator':
      return { text: 'Нет генератора: катушкам нечем питаться.' };
    case 'no_coil':
      return { text: 'Не установлено ни одной катушки — бункер не может атаковать.' };
    case 'passive_deficit':
      return { text: `Генератор не тянет даже постоянные модули: охлаждение, сенсоры и защита работают на ${Math.round(w.efficiency * 100)}%.` };
    case 'energy_limit':
      return { text: `Энергии хватает на ${Math.round(w.factor * 100)}% темпа катушек. Нужен генератор мощнее, преобразователь или накопитель с быстрой зарядкой.` };
    case 'heat_limit':
      return { text: `Охлаждение покрывает ${Math.round(w.factor * 100)}% нагрева — катушки будут перегреваться. Улучшите систему охлаждения.` };
    case 'no_sensor':
      return { text: 'Нет сенсорного комплекса: цели не опознаются, бонус урона и поражение узлов недоступны.' };
    case 'second_coil_free':
      return { text: 'Слот катушки №2 свободен. Вторая катушка работает одновременно с первой.' };
  }
}

function engineerLine(s: BunkerStats): string {
  if (s.warnings.some((w) => w.kind === 'no_coil' || w.kind === 'no_generator')) return 'Комплекс небоеспособен. Срочно нужна катушка и генератор.';
  if (s.warnings.some((w) => w.kind === 'energy_limit')) return 'Катушки голодают по энергии. Генератор — наше узкое место.';
  if (s.warnings.some((w) => w.kind === 'heat_limit')) return 'Системы перегреваются. Без нормального охлаждения долго не продержимся.';
  if (s.warnings.some((w) => w.kind === 'second_coil_free')) return 'Есть место под вторую катушку. Два режима сразу — сильнее.';
  return 'Комплекс сбалансирован. Можно искать оборудование посерьёзнее.';
}

function Schematic({ profile, stats }: { profile: Profile; stats: BunkerStats }) {
  const on = (s: SlotId) => !!profile.equipment[s];
  const line = (s: SlotId) => (on(s) ? '#3fc8ff' : '#26313a');
  const c1 = stats.coils.find((c) => c.slot === 'coil1');
  const c2 = stats.coils.find((c) => c.slot === 'coil2');
  return (
    <div className="schematic">
      <svg viewBox="0 0 140 300" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#e8fbff" />
            <stop offset="0.4" stopColor="#3fc8ff" />
            <stop offset="1" stopColor="#3fc8ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Поверхность и грунт */}
        <path d="M0 70 H140" stroke="#3a3128" strokeWidth="2" />
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d={`M${i * 15} 75 l8 6`} stroke="#2a241e" strokeWidth="1" />
        ))}
        {/* Излучатели катушек на поверхности */}
        <g>
          <path d="M40 70 V48" stroke={c1 ? modeConfig[c1.mode].color : '#26313a'} strokeWidth="4" />
          <circle cx="40" cy="44" r="7" fill="#11161b" stroke={c1 ? modeConfig[c1.mode].color : '#26313a'} strokeWidth="2" />
          <path d="M100 70 V48" stroke={c2 ? modeConfig[c2.mode].color : '#26313a'} strokeWidth="4" />
          <circle cx="100" cy="44" r="7" fill="#11161b" stroke={c2 ? modeConfig[c2.mode].color : '#26313a'} strokeWidth="2" />
          {c1 && <circle cx="40" cy="44" r="14" fill="none" stroke={modeConfig[c1.mode].color} strokeOpacity="0.35" />}
          {c2 && <circle cx="100" cy="44" r="14" fill="none" stroke={modeConfig[c2.mode].color} strokeOpacity="0.35" />}
          {/* Антенна сенсоров */}
          <path d="M70 70 V30 M62 34 L70 26 L78 34" stroke={line('sensor')} strokeWidth="2" fill="none" />
        </g>
        {/* Корпус бункера */}
        <path d="M14 90 Q70 60 126 90 V270 H14 Z" fill="#141a20" stroke={on('shield') ? '#5fd16a' : '#3a434c'} strokeWidth={on('shield') ? 3 : 2} />
        <path d="M24 100 Q70 76 116 100 V260 H24 Z" fill="#0d1216" stroke="#232c34" />
        {/* Отсеки */}
        <rect x="32" y="120" width="34" height="30" rx="3" fill="#121a21" stroke={line('generator')} />
        <rect x="74" y="120" width="34" height="30" rx="3" fill="#121a21" stroke={line('converter')} />
        <rect x="32" y="170" width="34" height="30" rx="3" fill="#121a21" stroke={line('capacitor')} />
        <rect x="74" y="170" width="34" height="30" rx="3" fill="#121a21" stroke={line('cooling')} />
        {/* Энергошина */}
        <path d="M49 135 H91 M70 135 V185 M49 185 H91 M70 185 V230" stroke={line('converter')} strokeWidth="1.5" strokeDasharray="3 2" />
        <path d="M70 230 V90 M40 70 V95 M100 70 V95" stroke="#1b6f96" strokeWidth="1" />
        {/* Ядро */}
        <circle cx="70" cy="232" r="18" fill="url(#core)" opacity={stats.coils.length ? 1 : 0.25} />
        <circle cx="70" cy="232" r="9" fill="#0d1216" stroke="#3fc8ff" />
        {/* Охлаждающие рёбра */}
        {on('cooling') &&
          [0, 1, 2].map((i) => <path key={i} d={`M114 ${178 + i * 8} h10`} stroke="#9fe6ff" strokeWidth="2" />)}
      </svg>
    </div>
  );
}

function SlotTile({ slot, profile, onClick }: { slot: SlotId; profile: Profile; onClick: () => void }) {
  const id = profile.equipment[slot];
  const it = id ? profile.items[id] : null;
  const canUp = it ? !upgradeBlock(profile, it, false) : false;
  return (
    <button className={`slot-tile${it ? '' : ' empty'}`} style={it ? { borderColor: rarityColor[it.rarity], boxShadow: `inset 0 0 14px ${rarityColor[it.rarity]}22` } : undefined} onClick={onClick}>
      {canUp && (
        <span className="up">
          <UiIcon kind="up" size={11} />
        </span>
      )}
      <span className="sname">{ru.slot[slot]}</span>
      {it ? (
        <>
          <ItemIcon category={it.category} rarity={it.rarity} level={it.level} size={38} />
          <span className="iname" style={{ color: rarityColor[it.rarity] }}>
            {it.name}
          </span>
        </>
      ) : (
        <>
          <div className="item-icon" style={{ width: 38, height: 38, borderColor: '#2c343d', borderStyle: 'dashed' }}>
            <CategoryGlyph category={SLOT_CATEGORY[slot]} color="#46515c" size={22} />
          </div>
          <span className="iname muted">Пусто</span>
        </>
      )}
    </button>
  );
}

export function BunkerScreen() {
  const profile = useProfile((s) => s.profile)!;
  const selected = useUi((s) => s.selectedItemId);
  const selectItem = useUi((s) => s.selectItem);
  const setEquipTarget = useUi((s) => s.setEquipTarget);
  const [picker, setPicker] = useState<SlotId | null>(null);
  const stats = useMemo(() => computeBunkerStats(profile), [profile]);
  const lvl = profile.bunker.level;

  const candidates = useMemo(() => {
    if (!picker) return [];
    const cat = SLOT_CATEGORY[picker];
    return Object.values(profile.items)
      .filter((i) => i.category === cat && profile.equipment[picker] !== i.id)
      .sort((a, b) => rarityIndex(b.rarity) - rarityIndex(a.rarity) || b.tier - a.tier || b.level - a.level);
  }, [picker, profile]);

  const open = (slot: SlotId) => {
    const id = profile.equipment[slot];
    if (id) {
      setEquipTarget(slot);
      selectItem(id);
    } else setPicker(slot);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Мой бункер</h2>
        <span className="lvl-badge">УР {lvl}</span>
      </div>
      <div className="screen-body">
        <div className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" fill="#11161b" stroke="#3a434c" />
            <circle cx="20" cy="15" r="6" fill="#5d666e" />
            <path d="M8 34c2-8 7-10 12-10s10 2 12 10" fill="#5d666e" />
            <rect x="13" y="10" width="14" height="4" rx="1" fill="#f2b53a" />
          </svg>
          <div className="grow">
            <div className="small muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
              Главный инженер
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.35 }}>«{engineerLine(stats)}»</div>
          </div>
        </div>

        <div className="bunker-layout">
          <div className="bunker-col">
            {LEFT.map((s) => (
              <SlotTile key={s} slot={s} profile={profile} onClick={() => open(s)} />
            ))}
          </div>
          <Schematic profile={profile} stats={stats} />
          <div className="bunker-col">
            {RIGHT.map((s) => (
              <SlotTile key={s} slot={s} profile={profile} onClick={() => open(s)} />
            ))}
          </div>
        </div>

        <div className="panel" style={{ marginTop: 10 }}>
          <div className="hud-row">
            <span>Опыт бункера</span>
            <div className="grow">
              <Bar value={profile.bunker.xp} max={xpForLevel(lvl)} color={colors.xp} thin />
            </div>
            <span>
              {Math.floor(profile.bunker.xp)} / {xpForLevel(lvl)}
            </span>
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            Уровень открывает исследования и повышает предел улучшения оборудования (сейчас до {lvl + 2}).
          </div>
        </div>

        <div className="section-title">Состояние комплекса</div>
        <div className="warn-list">
          {stats.warnings.length === 0 && <div className="warn-item ok">Все системы обеспечены энергией и охлаждением.</div>}
          {stats.warnings.map((w, i) => (
            <div key={i} className="warn-item">
              {warningText(w).text}
            </div>
          ))}
        </div>

        <div className="section-title">Катушки</div>
        {stats.coils.length === 0 && <div className="empty">Катушки не установлены.</div>}
        {stats.coils.map((c) => (
          <div key={c.slot} className="panel" style={{ marginBottom: 6, borderLeft: `3px solid ${modeConfig[c.mode].color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b>{ru.slot[c.slot]}</b>
              <span style={{ color: modeConfig[c.mode].color, fontWeight: 800, fontSize: 12 }}>{modeConfig[c.mode].name}</span>
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>
              Мощность {c.power.toFixed(0)} · радиус {c.radius.toFixed(0)} · раз в {c.interval.toFixed(2)} с · {c.energyPerSec.toFixed(1)} эн/с · нагрев {c.heatPerSec.toFixed(1)}/с
            </div>
            {c.effects.length > 0 && (
              <div className="small" style={{ marginTop: 4 }}>
                {c.effects.map((e) => `${ru.effect[e.kind]} ${Math.round(e.chance * 100)}%`).join(' · ')}
              </div>
            )}
          </div>
        ))}

        <div className="section-title">Характеристики</div>
        <div className="bunker-stats">
          <div className="bstat">
            <div className="k">Устойчивый DPS</div>
            <div className="v">{stats.sustainedDps.toFixed(0)}</div>
          </div>
          <div className="bstat">
            <div className="k">Прочность</div>
            <div className="v">{stats.maxHp}</div>
          </div>
          <div className="bstat">
            <div className="k">Полезная мощность</div>
            <div className="v">{stats.usablePower.toFixed(1)}/с</div>
            <div className="small muted">
              генерация {stats.generation.toFixed(1)} × КПД {Math.round(stats.conversion * 100)}%
            </div>
          </div>
          <div className="bstat">
            <div className="k">Потребление</div>
            <div className="v">{(stats.passiveDrain + stats.coils.reduce((s, c) => s + c.energyPerSec, 0)).toFixed(1)}/с</div>
            <div className="small muted">модули {stats.passiveDrain.toFixed(1)} + катушки</div>
          </div>
          <div className="bstat">
            <div className="k">Накопитель</div>
            <div className="v">{stats.capacity.toFixed(0)}</div>
            <div className="small muted">зарядка {stats.chargeRate.toFixed(0)}/с · разряд +{Math.round(stats.dischargeBonus * 100)}%</div>
          </div>
          <div className="bstat">
            <div className="k">Охлаждение</div>
            <div className="v">{stats.coolRate.toFixed(1)}/с</div>
            <div className="small muted">запас тепла {stats.heatCap.toFixed(0)}</div>
          </div>
          <div className="bstat">
            <div className="k">Снижение урона</div>
            <div className="v">{Math.round(stats.damageReduction * 100)}%</div>
            <div className="small muted">ремонт {stats.regen.toFixed(1)}/с</div>
          </div>
          <div className="bstat">
            <div className="k">Сенсоры</div>
            <div className="v">{stats.detectRange > 0 ? stats.detectRange.toFixed(0) : '—'}</div>
            <div className="small muted">
              +{Math.round((stats.identifiedBonus + stats.markBonus) * 100)}% по опознанным · узлы {Math.round(stats.critChance * 100)}%
            </div>
          </div>
        </div>
      </div>

      {picker && (
        <div className="modal-back" onClick={() => setPicker(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="screen-header" style={{ paddingTop: 12, borderRadius: '16px 16px 0 0' }}>
              <div className="grow">
                <h2>{ru.slot[picker]}</h2>
                <div className="small muted">{ru.slotHint[picker]}</div>
              </div>
              <button className="btn btn-ghost icon-btn" onClick={() => setPicker(null)}>
                <UiIcon kind="close" />
              </button>
            </div>
            <div className="sheet-body">
              {candidates.length === 0 ? (
                <div className="empty">Подходящего оборудования нет на складе.</div>
              ) : (
                candidates.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    equipped={!!slotOf(profile, it.id)}
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
          onReplace={(slot) => {
            selectItem(null);
            setPicker(slot);
          }}
        />
      )}
    </div>
  );
}
