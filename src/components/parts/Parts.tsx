import { useMemo, useState } from 'react';
import { fusionConfig } from '../../game/config/partsConfig';
import { formatStatValue } from '../../game/items/statInfo';
import { extractCost, partStatRoll, partQuality, fusionPick, fusableCount, fusionChance, fusionGroup, getPartTemplate, nextRarity } from '../../game/items/Parts';
import { rarityIndex } from '../../game/items/ItemRarity';
import { slotOf } from '../../game/profile/Profile';
import { RARITIES, type Item, type Part, type Rarity } from '../../game/types';
import { ru, statLabel } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ConfirmDialog } from '../common/Common';
import { ItemIcon, PartGlyph, ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { qualityColor, RollLine } from '../inventory/Roll';

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
        <span className="tile-better" style={{ background: 'radial-gradient(circle at 40% 35%, #ffe7a3, #d99b1c)', boxShadow: '0 0 12px rgba(242,181,58,0.9)' }} title="Можно объединить">
          <span style={{ fontWeight: 900, fontSize: 11 }}>3</span>
        </span>
      )}
      <span className="tile-name" style={{ color: col }}>
        {part.name}
      </span>
    </button>
  );
}

/** Свободные модификации: каждая отдельной плиткой, как вещи. */
export function PartsGrid({ onOpen, bare }: { onOpen: (id: string) => void; bare?: boolean }) {
  const profile = useProfile((s) => s.profile)!;
  const list = useMemo(() => {
    const free = Object.values(profile.parts).filter((p) => !p.installedIn);
    const groups = new Map<string, number>();
    for (const p of free) groups.set(`${p.templateId}|${p.rarity}`, (groups.get(`${p.templateId}|${p.rarity}`) ?? 0) + 1);
    return free
      .map((p) => ({ p, q: partQuality(p), fuse: (groups.get(`${p.templateId}|${p.rarity}`) ?? 0) >= fusionConfig.count && !!nextRarity(p.rarity) }))
      .sort((a, b) => rarityIndex(b.p.rarity) - rarityIndex(a.p.rarity) || a.p.templateId.localeCompare(b.p.templateId) || b.q - a.q);
  }, [profile.parts]);
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
  const fuse = useProfile((s) => s.fuse);
  const scrap = useProfile((s) => s.scrapPart);
  const install = useProfile((s) => s.installPart);
  const toast = useUi((s) => s.toast);
  const [picking, setPicking] = useState(false);
  const [confirmFuse, setConfirmFuse] = useState(false);
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
            <div className="item-sub">{ru.rarity[part.rarity]} модификация</div>
          </div>
        </div>
      }
      actions={
        <>

          <button className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
          <button
            className="btn btn-rust"
            onClick={() => {
              const s = scrap(part.id);
              toast(`Разобрано: +${s} металлолома`, 'good');
              onClose();
            }}
          >
            Разобрать
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
          <div className="stat-list">
            {part.stats.map((s, i) => {
              const r = partStatRoll(part, i);
              return (
                <RollLine
                  key={i}
                  label={
                    <>
                      {statLabel(s.stat)}
                      {i === 0 && <span className="tag" style={{ marginLeft: 6 }}>основное</span>}
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
            Качество модификации: <b style={{ color: qualityColor(partQuality(part)) }}>{Math.round(partQuality(part) * 100)}%</b>. Под каждым свойством — диапазон для этой редкости и качество броска: 100% — лучшее возможное значение.
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            Подходит для: {t.fits.map((c) => ru.category[c].toLowerCase()).join(', ')}
          </div>

          <div className="section-title">Объединение</div>
          {next ? (
            <div className="info-box">
              {fusionConfig.count} одинаковые → 1 {ru.rarity[next].toLowerCase()} с новыми свойствами. Есть: <b>{group.length}</b>. Шанс успеха {Math.round(fusionChance(part.rarity) * 100)}%. При неудаче все три детали теряются.
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
      {confirmFuse && next && (
        <ConfirmDialog
          title="Объединить модификации?"
          text={`${fusionConfig.count} × «${part.name}» (${ru.rarity[part.rarity].toLowerCase()}) → 1 ${ru.rarity[next].toLowerCase()}. Шанс успеха ${Math.round(fusionChance(part.rarity) * 100)}%.`}
          warning="При неудаче все три детали будут уничтожены."
          confirmLabel="Объединить"
          onConfirm={() => {
            setConfirmFuse(false);
            const r = fuse(part.id);
            if (r.success && r.result) {
              sfx.levelUp();
              toast(`Успех: ${ru.rarity[r.result.rarity]} «${r.result.name}»`, 'rare');
            } else {
              sfx.defeat();
              toast('Объединение не удалось, детали потеряны', 'bad');
            }
            onClose();
          }}
          onCancel={() => setConfirmFuse(false)}
        />
      )}
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
      {pickSlot !== null && (
        <div style={{ marginTop: 8 }}>
          <div className="small muted" style={{ marginBottom: 6 }}>
            Модификация устанавливается навсегда и пропадёт вместе с оборудованием.
          </div>
          {fits.map((p) => (
            <button
              key={p.id}
              className="item-row"
              style={{ borderLeftColor: rarityColor[p.rarity] }}
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
              <div className="item-icon" style={{ width: 36, height: 36, borderColor: rarityColor[p.rarity] }}>
                <PartGlyph color={rarityColor[p.rarity]} size={22} />
              </div>
              <div className="grow">
                <div className="item-name" style={{ color: rarityColor[p.rarity] }}>
                  {p.name}
                </div>
                <div className="item-stats">{partStatsText(p)}</div>
              </div>
            </button>
          ))}
        </div>
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
  const chance = Math.round(fusionChance(rar) * 100);
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
