import { useState } from 'react';
import { fusionConfig, fusionCost } from '../../game/config/partsConfig';
import { dismantleValue, fusionChance, massFusePlan, nextRarity, partsInRange } from '../../game/items/Parts';
import { RARITIES, type Rarity } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { ConfirmDialog } from '../common/Common';
import { ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';

/** Двойной ползунок диапазона качества, 0–100%. */
function QualityRange({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  return (
    <div className="qrange">
      <div className="qrange-head">
        <span>Качество</span>
        <b>
          {min}% – {max}%
        </b>
      </div>
      <div className="qrange-row">
        <span className="small muted">от</span>
        <input className="range" type="range" min={0} max={100} step={5} value={min} onChange={(e) => onChange(Math.min(Number(e.target.value), max), max)} />
      </div>
      <div className="qrange-row">
        <span className="small muted">до</span>
        <input className="range" type="range" min={0} max={100} step={5} value={max} onChange={(e) => onChange(min, Math.max(Number(e.target.value), min))} />
      </div>
    </div>
  );
}

function RarityChips({ value, onToggle, multi, only }: { value: Rarity[]; onToggle: (r: Rarity) => void; multi?: boolean; only?: Rarity[] }) {
  const list = only ?? RARITIES.filter((r) => r !== 'unique' && r !== 'mythic');
  return (
    <div className="rar-chips row">
      {list.map((r) => (
        <button key={r} className={`rar-chip${value.includes(r) ? ' on' : ''}`} style={{ ['--rc' as string]: rarityColor[r] }} onClick={() => onToggle(r)}>
          <span className="gem" />
          <span className="grow">{ru.rarity[r]}</span>
          {multi && <span className="small">{value.includes(r) ? '✓' : ''}</span>}
        </button>
      ))}
    </div>
  );
}

/** Массовый разбор модификаций на компоненты синтеза. */
export function MassDismantleSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const dismantle = useProfile((s) => s.dismantle);
  const toast = useUi((s) => s.toast);
  const [rars, setRars] = useState<Rarity[]>(['common']);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(60);
  const [confirm, setConfirm] = useState(false);
  const list = partsInRange(profile, rars, min / 100, max / 100);
  const gain = list.reduce((s, x) => s + dismantleValue(x), 0);

  return (
    <>
      <Sheet
        title="Разобрать модификации"
        onClose={onClose}
        actions={
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Закрыть
            </button>
            <button className="btn btn-rust btn-hazard" style={{ flex: 2 }} disabled={!list.length} onClick={() => setConfirm(true)}>
              Разобрать {list.length > 0 ? `×${list.length}` : ''}
            </button>
          </>
        }
      >
        <div className="small muted" style={{ marginBottom: 10 }}>
          Модификации превращаются в компоненты синтеза — они нужны для объединения. Чем выше редкость и качество, тем больше компонентов. Установленные в оборудование не затрагиваются.
        </div>
        <div className="section-title" style={{ marginTop: 0 }}>
          Цвет
        </div>
        <RarityChips multi value={rars} onToggle={(r) => setRars((v) => (v.includes(r) ? v.filter((x) => x !== r) : [...v, r]))} />
        <QualityRange
          min={min}
          max={max}
          onChange={(a, b) => {
            setMin(a);
            setMax(b);
          }}
        />
        <div className="mass-sum">
          <span>
            Будет разобрано: <b>{list.length}</b>
          </span>
          <span className="res">
            + <ResourceIcon type="components" /> {fmtNum(gain)}
          </span>
        </div>
      </Sheet>
      {confirm && (
        <ConfirmDialog
          title="Разобрать модификации?"
          text={`${list.length} шт. → ${fmtNum(gain)} компонентов синтеза.`}
          warning="Разобранные модификации не вернуть."
          confirmLabel="Разобрать"
          danger
          onConfirm={() => {
            setConfirm(false);
            const r = dismantle(list.map((x) => x.id));
            sfx.item(false);
            toast(`Разобрано ${r.count}: +${fmtNum(r.components)} компонентов`, 'good');
            onClose();
          }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}

/** Массовая сборка: тройки одного типа выбранного цвета и диапазона качества. */
export function MassAssembleSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const fuseMany = useProfile((s) => s.fuseMany);
  const toast = useUi((s) => s.toast);
  const fusable = RARITIES.filter((r) => fusionCost[r] && nextRarity(r));
  const [rar, setRar] = useState<Rarity>(fusable[0]);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100);
  const [confirm, setConfirm] = useState(false);
  const plan = massFusePlan(profile, rar, min / 100, max / 100);
  const next = nextRarity(rar);
  const chance = Math.round(fusionChance(rar, profile) * 100);

  return (
    <>
      <Sheet
        title="Собрать модификации"
        onClose={onClose}
        actions={
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Закрыть
            </button>
            <button className="btn btn-gold btn-hazard" style={{ flex: 2 }} disabled={!plan.triples.length} onClick={() => setConfirm(true)}>
              Собрать {plan.triples.length > 0 ? `×${plan.triples.length}` : ''}
            </button>
          </>
        }
      >
        <div className="small muted" style={{ marginBottom: 10 }}>
          Одинаковые модификации выбранного цвета собираются тройками в следующую редкость. Тройки подбираются из близких по качеству — так результат лучше.
        </div>
        <div className="section-title" style={{ marginTop: 0 }}>
          Цвет
        </div>
        <RarityChips value={[rar]} only={fusable} onToggle={setRar} />
        <QualityRange
          min={min}
          max={max}
          onChange={(a, b) => {
            setMin(a);
            setMax(b);
          }}
        />
        <div className="mass-sum">
          <span>
            Сборок: <b>{plan.triples.length}</b> · {fusionConfig.count} → 1 {next ? ru.rarity[next].toLowerCase() : ''} · шанс {chance}%
          </span>
        </div>
        <div className="mass-sum">
          <span>Стоимость:</span>
          <span className="res">
            <ResourceIcon type="coins" /> {fmtNum(plan.coins)}
          </span>
          <span className="res">
            <ResourceIcon type="components" /> {fmtNum(plan.components)}
          </span>
        </div>
        {plan.limited && <div className="warn-box" style={{ marginTop: 8 }}>Ресурсов хватает не на все тройки — соберутся сначала самые качественные.</div>}
      </Sheet>
      {confirm && (
        <ConfirmDialog
          title="Собрать модификации?"
          text={`${plan.triples.length} сборок, шанс каждой ${chance}%. Стоимость: ${fmtNum(plan.coins)} монет и ${fmtNum(plan.components)} компонентов.`}
          warning="При неудаче тройка теряется."
          confirmLabel="Собрать"
          onConfirm={() => {
            setConfirm(false);
            const r = fuseMany(plan.triples);
            if (r.success) sfx.levelUp();
            else sfx.defeat();
            toast(`Успешно: ${r.success}${r.failed ? ` · неудач: ${r.failed}` : ''}`, r.success ? 'rare' : 'bad');
            onClose();
          }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}
