import { useMemo, useState } from 'react';
import { fusionConfig } from '../../game/config/partsConfig';
import { formatStatValue } from '../../game/items/statInfo';
import { fusionChance, fusionGroup, getPartTemplate, nextRarity } from '../../game/items/Parts';
import { rarityIndex } from '../../game/items/ItemRarity';
import { slotOf } from '../../game/profile/Profile';
import type { Item, Part } from '../../game/types';
import { ru, statLabel } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ConfirmDialog } from '../common/Common';
import { ItemIcon, PartGlyph } from '../common/Icons';
import { Sheet } from '../common/Sheet';

export function partStatsText(p: Part): string {
  return p.stats.map((s) => `${statLabel(s.stat)} ${formatStatValue(s.stat, s.value)}`).join(' · ');
}

export function PartTile({ part, count, onClick }: { part: Part; count?: number; onClick: () => void }) {
  const col = rarityColor[part.rarity];
  return (
    <button className="item-tile" style={{ borderColor: col, boxShadow: `inset 0 0 18px ${col}2a` }} onClick={onClick}>
      <span className="tile-glyph">
        <PartGlyph color={col} size={32} />
      </span>
      {count !== undefined && count > 1 && <span className="tile-lvl">×{count}</span>}
      {count !== undefined && count >= fusionConfig.count && nextRarity(part.rarity) && (
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

/** Сетка свободных модификаций: одинаковые детали складываются в стопку. */
export function PartsGrid({ onOpen }: { onOpen: (id: string) => void }) {
  const profile = useProfile((s) => s.profile)!;
  const stacks = useMemo(() => {
    const free = Object.values(profile.parts).filter((p) => !p.installedIn);
    const map = new Map<string, Part[]>();
    for (const p of free) {
      const k = `${p.templateId}|${p.rarity}|${p.stats.length}`;
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return [...map.values()].sort((a, b) => rarityIndex(b[0].rarity) - rarityIndex(a[0].rarity) || b.length - a.length);
  }, [profile.parts]);
  if (!stacks.length)
    return (
      <div className="empty">
        Модификаций пока нет. Они выпадают с роботов, мини-боссов и боссов.
        <br />
        Модификация вставляется в слот оборудования навсегда, а три одинаковые можно объединить в более редкую.
      </div>
    );
  return (
    <div className="item-grid">
      {stacks.map((st) => (
        <PartTile key={st[0].id} part={st[0]} count={fusionGroup(profile, st[0]).length} onClick={() => onOpen(st[0].id)} />
      ))}
    </div>
  );
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
            {part.stats.map((s, i) => (
              <div className="stat-line" key={i}>
                <span>{statLabel(s.stat)}</span>
                <span className="pos">{formatStatValue(s.stat, s.value)}</span>
              </div>
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            Подходит для: {t.fits.map((c) => ru.category[c].toLowerCase()).join(', ')}
          </div>

          <div className="section-title">Объединение</div>
          {next ? (
            <div className="info-box">
              {fusionConfig.count} одинаковые → 1 {ru.rarity[next].toLowerCase()}. Есть: <b>{group.length}</b>. Шанс успеха {Math.round(fusionChance(part.rarity) * 100)}%. При неудаче все три детали теряются.
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
  const toast = useUi((s) => s.toast);
  const [pickSlot, setPickSlot] = useState<number | null>(null);
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
              <span className="small muted">установлена</span>
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
    </div>
  );
}
