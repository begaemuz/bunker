import { createPortal } from 'react-dom';
import { elementConfig, RESONANCE_STEPS } from '../../game/config/partsConfig';
import type { Element } from '../../game/types';
import { useMemo, useState } from 'react';
import { fusionConfig, fusionCost } from '../../game/config/partsConfig';
import { formatStatValue } from '../../game/items/statInfo';
import { elementCounts, dismantleValue, extractCost, fusionQualityRange, partPowerScore, partStatRoll, partQuality, fusionPick, fusableCount, fusionChance, fusionGroup, getPartTemplate, nextRarity } from '../../game/items/Parts';
import { rarityIndex } from '../../game/items/ItemRarity';
import { slotOf } from '../../game/profile/Profile';
import { RARITIES, type Item, type Part, type Rarity } from '../../game/types';
import { fmtNum, ru, statLabel } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ConfirmDialog } from '../common/Common';
import { ItemIcon, PartGlyph, ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { QualityLine, qualityColor, RollLine } from '../inventory/Roll';

export function partStatsText(p: Part): string {
  return p.stats.map((s) => `${statLabel(s.stat)} ${formatStatValue(s.stat, s.value)}`).join(' · ');
}

export function PartTile({ part, canFuse, onClick }: { part: Part; canFuse?: boolean; onClick: () => void }) {
  const col = rarityColor[part.rarity];
  const q = partQuality(part);
  return (
    <button className="item-tile" style={{ borderColor: col, boxShadow: `inset 0 0 18px ${col}2a` }} onClick={onClick}>
      <span className="tile-glyph">
        <PartGlyph color={col} size={32} />
      </span>
      <span className="tile-lvl" style={{ color: qualityColor(q) }}>
        {Math.round(q * 100)}%
      </span>
      {canFuse && (
        <span className="tile-fuse" title="Можно объединить">
          ×3
        </span>
      )}
      {part.element && <ElementDot el={part.element} />}
      <span className="tile-name" style={{ color: col }}>
        {part.name}
      </span>
    </button>
  );
}

/** Значок стихии модификации. */
export function ElementDot({ el, label }: { el: Element; label?: boolean }) {
  const c = elementConfig[el];
  return (
    <span className={`el-dot${label ? ' with-label' : ''}`} style={{ ['--ec' as string]: c.color }} title={c.name}>
      <i />
      {label && c.name}
    </span>
  );
}

/** Резонанс стихии: сколько стоит и какие ступени активны. */
export function ResonanceInfo({ el }: { el: Element }) {
  const profile = useProfile((s) => s.profile)!;
  const n = elementCounts(profile)[el];
  const c = elementConfig[el];
  return (
    <div className="reso" style={{ ['--ec' as string]: c.color }}>
      <div className="reso-head">
        <ElementDot el={el} label /> <span className="small muted">в надетых вещах: {n}</span>
      </div>
      {RESONANCE_STEPS.map((need, i) => (
        <div key={need} className={`reso-step${n >= need ? ' on' : ''}`}>
          <b>{need}</b> {c.text[i]}
        </div>
      ))}
    </div>
  );
}

/** Свободные модификации: каждая отдельной плиткой, как вещи. */
export function PartsGrid({ onOpen, bare, sort }: { onOpen: (id: string) => void; bare?: boolean; sort?: string }) {
  const profile = useProfile((s) => s.profile)!;
  const list = useMemo(() => {
    const free = Object.values(profile.parts).filter((p) => !p.installedIn);
    const groups = new Map<string, number>();
    for (const p of free) groups.set(`${p.templateId}|${p.rarity}`, (groups.get(`${p.templateId}|${p.rarity}`) ?? 0) + 1);
    return free
      .map((p) => ({ p, q: partQuality(p), fuse: (groups.get(`${p.templateId}|${p.rarity}`) ?? 0) >= fusionConfig.count && !!nextRarity(p.rarity) }))
      .sort((a, b) =>
        sort === 'quality'
          ? b.q - a.q
          : sort === 'new'
            ? b.p.obtainedAt - a.p.obtainedAt
            : sort === 'rarity'
              ? rarityIndex(b.p.rarity) - rarityIndex(a.p.rarity) || b.q - a.q
              : partPowerScore(b.p) - partPowerScore(a.p),
      );
  }, [profile.parts, sort]);
  const tiles = list.map(({ p, fuse }) => <PartTile key={p.id} part={p} canFuse={fuse} onClick={() => onOpen(p.id)} />);
  if (bare) return <>{tiles}</>;
  if (!list.length)
    return (
      <div className="empty">
        Модификаций пока нет. Они выпадают с роботов, мини-боссов и боссов.
      </div>
    );
  return <div className="item-grid">{tiles}</div>;
}

/** Карточка модификации: установка, объединение, разборка. */
export function PartCard({ partId, onClose }: { partId: string; onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const scrap = useProfile((s) => s.scrapPart);
  const install = useProfile((s) => s.installPart);
  const toast = useUi((s) => s.toast);
  const [picking, setPicking] = useState(false);
  const [confirmFuse, setConfirmFuse] = useState(false);
  const [confirmScrap, setConfirmScrap] = useState(false);
  const part = profile.parts[partId];
  if (!part) return null;
  const t = getPartTemplate(part.templateId);
  const col = rarityColor[part.rarity];
  const group = fusionGroup(profile, part);
  const next = nextRarity(part.rarity);
  const canFuse = !!next && group.length >= fusionConfig.count && fusionChance(part.rarity) > 0;

  // Оборудование с подходящим свободным открытым слотом.
  const targets: { item: Item; slot: number }[] = [];
  for (const it of Object.values(profile.items)) {
    if (!t.fits.includes(it.category)) continue;
    const idx = it.slots.findIndex((s) => !s.locked && !s.partId);
    if (idx >= 0) targets.push({ item: it, slot: idx });
  }
  targets.sort((a, b) => Number(!!slotOf(profile, b.item.id)) - Number(!!slotOf(profile, a.item.id)) || rarityIndex(b.item.rarity) - rarityIndex(a.item.rarity));

  return (
    <>
    <Sheet
      onClose={onClose}
      head={
        <div className="card-head" style={{ margin: 0 }}>
          <div className="item-icon" style={{ width: 52, height: 52, borderColor: col }}>
            <PartGlyph color={col} size={32} />
          </div>
          <div className="grow">
            <div style={{ color: col, fontWeight: 900, fontSize: 16 }}>{part.name}</div>
            <div className="item-sub">
              {ru.rarity[part.rarity]} модификация {part.element && <ElementDot el={part.element} label />}
            </div>
          </div>
        </div>
      }
      actions={
        <>
          <button
            className="btn btn-rust"
            onClick={() => setConfirmScrap(true)}
          >
            Разобрать +{dismantleValue(part)} <ResourceIcon type="components" />
          </button>
          <button className="btn btn-gold" disabled={!canFuse} onClick={() => setConfirmFuse(true)}>
            Объединить
          </button>
          <button className="btn btn-primary" style={{ flexBasis: '100%' }} onClick={() => setPicking(!picking)}>
            {picking ? 'Скрыть оборудование' : 'Установить в оборудование'}
          </button>
        </>
      }
    >
          <div className="small muted" style={{ marginBottom: 8 }}>
            {t.description}
          </div>
          <QualityLine q={partQuality(part)} />
          <div className="stat-list">
            {part.stats.map((s, i) => {
              const r = partStatRoll(part, i);
              return (
                <RollLine
                  key={i}
                  label={
                    <>
                      {statLabel(s.stat)}
                    </>
                  }
                  value={formatStatValue(s.stat, s.value)}
                  valueClass="pos"
                  min={r ? formatStatValue(s.stat, r.min) : undefined}
                  max={r ? formatStatValue(s.stat, r.max) : undefined}
                  quality={r?.quality}
                />
              );
            })}
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            Качество модификации: <b style={{ color: qualityColor(partQuality(part)) }}>{Math.round(partQuality(part) * 100)}%</b>. Под эффектом — диапазон для этой редкости: 100% — лучшее возможное значение.
          </div>
          {part.element && (
            <>
              <div className="section-title">Резонанс стихии</div>
              <ResonanceInfo el={part.element} />
            </>
          )}
          <div className="small muted" style={{ marginTop: 8 }}>
            Подходит для: {t.fits.map((c) => ru.category[c].toLowerCase()).join(', ')}
          </div>

          <div className="section-title">Объединение</div>
          {next ? (
            <div className="info-box">
              {fusionConfig.count} одинаковые → 1 {ru.rarity[next].toLowerCase()} с более сильным эффектом той же стихии. Есть: <b>{group.length}</b>. Шанс успеха {Math.round(fusionChance(part.rarity, profile) * 100)}%. При неудаче все три детали теряются.
              {canFuse && (
                <div style={{ marginTop: 6 }}>
                  Уйдут в объединение: эта и две самые слабые —{' '}
                  {fusionPick(profile, part)
                    .slice(1)
                    .map((x) => `${Math.round(partQuality(x) * 100)}%`)
                    .join(', ')}
                  .
                </div>
              )}
            </div>
          ) : (
            <div className="muted small">Это максимальная редкость для объединения.</div>
          )}

          {picking && (
            <>
              <div className="section-title">Куда установить (навсегда)</div>
              {targets.length === 0 && <div className="empty">Нет оборудования с открытым свободным слотом подходящего типа.</div>}
              {targets.map(({ item, slot }) => (
                <button
                  key={item.id}
                  className="item-row"
                  style={{ borderLeftColor: rarityColor[item.rarity] }}
                  onClick={() => {
                    const err = install(part.id, item.id, slot);
                    if (err) toast('Не удалось установить модификацию', 'bad');
                    else {
                      sfx.item(true);
                      toast(`${part.name} → ${item.name}`, 'good');
                      onClose();
                    }
                  }}
                >
                  <ItemIcon category={item.category} rarity={item.rarity} level={item.level} size={40} />
                  <div className="grow">
                    <div className="item-name" style={{ color: rarityColor[item.rarity] }}>
                      {item.name}
                      {slotOf(profile, item.id) && <span className="tag">Уст.</span>}
                    </div>
                    <div className="item-sub">Свободный слот {slot + 1}</div>
                  </div>
                </button>
              ))}
            </>
          )}

    </Sheet>
      {confirmScrap && (
        <ConfirmDialog
          title="Разобрать модификацию?"
          text={`«${part.name}» (${ru.rarity[part.rarity].toLowerCase()}, качество ${Math.round(partQuality(part) * 100)}%) исчезнет навсегда. Вы получите ${dismantleValue(part)} компонентов синтеза.`}
          confirmLabel="Разобрать"
          danger
          onConfirm={() => {
            setConfirmScrap(false);
            const s = scrap(part.id);
            toast(`Разобрано: +${s} компонентов синтеза`, 'good');
            onClose();
          }}
          onCancel={() => setConfirmScrap(false)}
        />
      )}
      {confirmFuse && next && <FusionPicker part={part} onDone={onClose} onCancel={() => setConfirmFuse(false)} />}
    </>
  );
}

/** Слоты модификаций внутри карточки оборудования. */
export function ItemSlots({ item }: { item: Item }) {
  const profile = useProfile((s) => s.profile)!;
  const unlock = useProfile((s) => s.unlockSlot);
  const install = useProfile((s) => s.installPart);
  const extract = useProfile((s) => s.extractPart);
  const toast = useUi((s) => s.toast);
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const [extractSlot, setExtractSlot] = useState<number | null>(null);
  const exPart = extractSlot !== null ? profile.parts[item.slots[extractSlot]?.partId ?? ''] : null;
  const exCost = exPart ? extractCost(exPart).energyCores : 0;
  const fits = Object.values(profile.parts).filter((p) => !p.installedIn && getPartTemplate(p.templateId).fits.includes(item.category));
  fits.sort((a, b) => rarityIndex(b.rarity) - rarityIndex(a.rarity));

  if (item.slots.length === 0) return <div className="muted small">Нет слотов для модификаций.</div>;
  return (
    <div className="stat-list">
      {item.slots.map((s, i) => {
        const part = s.partId ? profile.parts[s.partId] : null;
        return (
          <div key={i} className="stat-line" style={{ alignItems: 'center' }}>
            <span>
              Слот {i + 1}
              {part && (
                <>
                  <br />
                  <span className="small" style={{ color: rarityColor[part.rarity] }}>
                    {part.name}: {partStatsText(part)}
                  </span>
                </>
              )}
            </span>
            {s.locked ? (
              <button
                className="btn btn-sm"
                disabled={profile.resources.expansionKeys < 1}
                onClick={() => {
                  if (unlock(item.id, i)) toast('Слот открыт', 'good');
                }}
              >
                Открыть ключом ({profile.resources.expansionKeys})
              </button>
            ) : part ? (
              <button className="btn btn-sm btn-rust" onClick={() => setExtractSlot(i)}>
                Извлечь <ResourceIcon type="energyCores" /> {extractCost(part).energyCores}
              </button>
            ) : (
              <button className="btn btn-sm btn-primary" disabled={fits.length === 0} onClick={() => setPickSlot(pickSlot === i ? null : i)}>
                {fits.length ? 'Вставить' : 'Нет деталей'}
              </button>
            )}
          </div>
        );
      })}
      {pickSlot !== null &&
        createPortal(
          <Sheet title={`Вставить в слот ${pickSlot + 1}`} subtitle={`${item.name} · подходящие модификации: ${fits.length}`} onClose={() => setPickSlot(null)}>
            <div className="info-box" style={{ marginBottom: 10 }}>
              Модификация ставится навсегда и пропадёт вместе с оборудованием. Извлечь можно за энергоядра.
            </div>
            <div className="pick-list">
              {fits.map((p) => {
                const col = rarityColor[p.rarity];
                const q = partQuality(p);
                return (
                  <button
                    key={p.id}
                    className="pick-row"
                    style={{ ['--rc' as string]: col }}
                    onClick={() => {
                      const err = install(p.id, item.id, pickSlot);
                      if (err) toast('Не удалось установить', 'bad');
                      else {
                        sfx.item(true);
                        toast(`Установлено: ${p.name}`, 'good');
                      }
                      setPickSlot(null);
                    }}
                  >
                    <span className="pick-ic">
                      <PartGlyph color={col} size={24} />
                    </span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <b style={{ color: col }}>{p.name}</b>
                      <span className="small muted">{partStatsText(p)}</span>
                    </span>
                    <span className="pick-side">
                      <span style={{ color: qualityColor(q) }}>{Math.round(q * 100)}%</span>
                      {p.element && <ElementDot el={p.element} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Sheet>,
          document.querySelector('.app') ?? document.body,
        )}
      {exPart && extractSlot !== null && (
        <ConfirmDialog
          title="Извлечь модификацию?"
          text={
            <>
              «{exPart.name}» вернётся на склад модификаций целой. Цена: <ResourceIcon type="energyCores" /> <b>{exCost}</b> энергоядер (есть {profile.resources.energyCores}).
            </>
          }
          confirmLabel="Извлечь"
          onConfirm={() => {
            const err = extract(item.id, extractSlot);
            setExtractSlot(null);
            if (err === 'resources') toast('Не хватает энергоядер', 'bad');
            else if (err) toast('Не удалось извлечь', 'bad');
            else {
              sfx.item(true);
              toast(`Извлечено: ${exPart.name}`, 'good');
            }
          }}
          onCancel={() => setExtractSlot(null)}
        />
      )}
    </div>
  );
}

/** Массовое объединение: выбор редкости и объединение всех троек. */
export function MassFuseSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const fuseAll = useProfile((s) => s.fuseAll);
  const toast = useUi((s) => s.toast);
  const rars = RARITIES.filter((r) => fusionConfig.chance[r]);
  const [rar, setRar] = useState<Rarity>(rars.find((r) => fusableCount(profile, r) > 0) ?? rars[0]);
  const [confirm, setConfirm] = useState(false);
  const n = fusableCount(profile, rar);
  const next = nextRarity(rar);
  const chance = Math.round(fusionChance(rar, profile) * 100);
  return (
    <>
      <Sheet
        title="Массовое объединение"
        onClose={onClose}
        actions={
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Закрыть
            </button>
            <button className="btn btn-gold btn-hazard" style={{ flex: 2 }} disabled={n === 0} onClick={() => setConfirm(true)}>
              Объединить {n > 0 ? `×${n}` : ''}
            </button>
          </>
        }
      >
        <div className="small muted" style={{ marginBottom: 12 }}>
          Выберите цвет: все свободные одинаковые модификации этой редкости объединятся тройками.
        </div>
        <div className="rar-chips">
          {rars.map((r) => {
            const c = fusableCount(profile, r);
            return (
              <button key={r} className={`rar-chip${rar === r ? ' on' : ''}`} style={{ ['--rc' as string]: rarityColor[r] }} onClick={() => setRar(r)}>
                <span className="gem" />
                <span className="grow">{ru.rarity[r]}</span>
                <b>{c > 0 ? `×${c}` : '—'}</b>
              </button>
            );
          })}
        </div>
        {next && (
          <div className="fuse-flow">
            <div className="fuse-side" style={{ color: rarityColor[rar] }}>
              <PartGlyph color={rarityColor[rar]} size={30} />
              <span>3 × {ru.rarity[rar].toLowerCase()}</span>
            </div>
            <div className="fuse-arrow">
              <span>{chance}%</span>
            </div>
            <div className="fuse-side" style={{ color: rarityColor[next] }}>
              <PartGlyph color={rarityColor[next]} size={30} />
              <span>1 × {ru.rarity[next].toLowerCase()}</span>
            </div>
          </div>
        )}
        <div className="warn-box" style={{ marginTop: 12 }}>
          При неудаче тройка теряется. Установленные в оборудование модификации не участвуют.
        </div>
      </Sheet>
      {confirm && (
        <ConfirmDialog
          title="Объединить всё?"
          text={`${n} объединений: ${ru.rarity[rar].toLowerCase()} → ${next ? ru.rarity[next].toLowerCase() : ''}. Шанс каждого ${chance}%.`}
          confirmLabel="Объединить"
          onConfirm={() => {
            setConfirm(false);
            const r = fuseAll(rar);
            if (r.success) sfx.levelUp();
            else sfx.defeat();
            toast(`Успешно: ${r.success}${r.failed ? ` · неудач: ${r.failed}` : ''}`, r.success ? 'rare' : 'bad');
          }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}

/** Выбор трёх модификаций для объединения: игрок сам решает, какие отдать. */
function FusionPicker({ part, onDone, onCancel }: { part: Part; onDone: () => void; onCancel: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const fuse = useProfile((s) => s.fuse);
  const toast = useUi((s) => s.toast);
  const next = nextRarity(part.rarity)!;
  const group = fusionGroup(profile, part).sort((a, b) => partQuality(b) - partQuality(a));
  const [sel, setSel] = useState<string[]>(() => fusionPick(profile, part).map((x) => x.id));
  const chosen = group.filter((x) => sel.includes(x.id));
  const ready = chosen.length === fusionConfig.count;
  const [lo, hi] = fusionQualityRange(chosen);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= fusionConfig.count ? s : [...s, id]));
  const chance = Math.round(fusionChance(part.rarity, profile) * 100);
  const cost = fusionCost[part.rarity];
  const affordable = !cost || (profile.resources.coins >= cost.coins && profile.resources.components >= cost.components);

  return (
    <Sheet
      title="Объединение"
      subtitle={`Выберите ${fusionConfig.count}: «${part.name}», ${ru.rarity[part.rarity].toLowerCase()}`}
      onClose={onCancel}
      actions={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>
            Отмена
          </button>
          <button
            className="btn btn-gold btn-hazard"
            style={{ flex: 2 }}
            disabled={!ready || !affordable}
            onClick={() => {
              const r = fuse(part.id, sel);
              if (r.error) {
                toast(r.error === 'resources' ? 'Не хватает монет или компонентов синтеза' : 'Выберите три подходящие модификации', 'bad');
                return;
              }
              if (r.success && r.result) {
                sfx.levelUp();
                toast(`Успех: ${ru.rarity[r.result.rarity]} «${r.result.name}» · ${Math.round(partQuality(r.result) * 100)}%`, 'rare');
              } else {
                sfx.defeat();
                toast('Объединение не удалось, детали потеряны', 'bad');
              }
              onDone();
            }}
          >
            Объединить {chosen.length}/{fusionConfig.count}
          </button>
        </>
      }
    >
      <div className="fuse-flow" style={{ marginTop: 0 }}>
        <div className="fuse-side" style={{ color: rarityColor[part.rarity] }}>
          <PartGlyph color={rarityColor[part.rarity]} size={28} />
          <span>{chosen.length}/{fusionConfig.count}</span>
        </div>
        <div className="fuse-arrow">
          <span>{chance}%</span>
        </div>
        <div className="fuse-side" style={{ color: rarityColor[next] }}>
          <PartGlyph color={rarityColor[next]} size={28} />
          <span>{ready ? `${Math.round(lo * 100)}–${Math.round(hi * 100)}%` : '?'}</span>
        </div>
      </div>
      <div className="small muted" style={{ margin: '10px 2px' }}>
        Качество новой модификации ({ru.rarity[next].toLowerCase()}) определяет самая слабая из выбранных: высокий процент получится, только если все три сильные. Смешивать сильную со слабой невыгодно — сильную лучше оставить себе.
      </div>
      <div className="fuse-pick">
        {group.map((x) => {
          const q = partQuality(x);
          const on = sel.includes(x.id);
          return (
            <button key={x.id} className={`fuse-row${on ? ' on' : ''}`} onClick={() => toggle(x.id)}>
              <span className="fuse-check">{on ? '✓' : ''}</span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="fuse-row-t" style={{ color: rarityColor[x.rarity] }}>
                  {x.name}
                </span>
                <span className="fuse-row-s">{partStatsText(x)}</span>
              </span>
              <b style={{ color: qualityColor(q) }}>{Math.round(q * 100)}%</b>
            </button>
          );
        })}
      </div>
      {cost && (
        <div className={`fuse-cost${affordable ? '' : ' lack'}`}>
          <span>Стоимость:</span>
          <span className="res">
            <ResourceIcon type="coins" /> {fmtNum(cost.coins)}
          </span>
          <span className="res">
            <ResourceIcon type="components" /> {cost.components} <span className="muted">/ {fmtNum(profile.resources.components)}</span>
          </span>
        </div>
      )}
      <div className="warn-box" style={{ marginTop: 10 }}>
        При неудаче все три выбранные детали будут уничтожены.
      </div>
    </Sheet>
  );
}
