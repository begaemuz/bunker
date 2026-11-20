import { useMemo, useState } from 'react';
import { itemQuality } from '../../game/items/ItemGenerator';
import { partQuality } from '../../game/items/Parts';
import { isEquipped } from '../../game/profile/Profile';
import { EQUIP_CATEGORIES, type EquipCategory } from '../../game/types';
import { ru } from '../../i18n/ru';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { CategoryGlyph, PartGlyph } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { qualityColor } from '../inventory/Roll';

type Cat = 'all' | 'parts' | EquipCategory;
type View = 'market' | 'mine';

const DURATIONS = [12, 24, 48];
/** Комиссия аукциона с продажи. */
const FEE = 0.1;

/**
 * Аукцион игроков: лоты за звёзды Telegram, стартовая цена и выкуп.
 * Торги идут через сервер, поэтому до его подключения витрина пуста,
 * а выставление лота показывает форму без отправки.
 */
export function AuctionTab() {
  const [view, setView] = useState<View>('market');
  const [cat, setCat] = useState<Cat>('all');
  const [sort, setSort] = useState<'ending' | 'cheap' | 'expensive'>('ending');
  const [listing, setListing] = useState(false);

  return (
    <>
      <div className="auc-head">
        <div className="seg auc-view">
          <button className={view === 'market' ? 'on' : ''} onClick={() => setView('market')}>
            Лоты
          </button>
          <button className={view === 'mine' ? 'on' : ''} onClick={() => setView('mine')}>
            Мои лоты
          </button>
        </div>
        <button className="btn btn-gold btn-sm" onClick={() => setListing(true)}>
          + Выставить
        </button>
      </div>

      {view === 'market' && (
        <>
          <div className="cx-grades auc-cats">
            {(['all', ...EQUIP_CATEGORIES, 'parts'] as Cat[]).map((c) => (
              <button key={c} className={`cx-grade tier${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
                {c === 'all' ? 'Все' : c === 'parts' ? 'Модификации' : ru.category[c]}
              </button>
            ))}
          </div>
          <div className="auc-sort">
            <span className="small muted">Сортировка:</span>
            {(
              [
                ['ending', 'скоро конец'],
                ['cheap', 'дешевле'],
                ['expensive', 'дороже'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={`auc-sort-b${sort === id ? ' on' : ''}`} onClick={() => setSort(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="auc-empty">
            <div className="auc-empty-icon">⭐</div>
            <b>Лотов пока нет</b>
            <span className="small muted">
              Здесь будут вещи и модификации, которые выставили другие игроки. Торги за звёзды Telegram заработают вместе с сервером игры.
            </span>
          </div>
        </>
      )}

      {view === 'mine' && (
        <div className="auc-empty">
          <div className="auc-empty-icon">📦</div>
          <b>У вас нет лотов</b>
          <span className="small muted">Выставьте вещь или модификацию со склада: задайте стартовую цену и цену выкупа в звёздах.</span>
          <button className="btn btn-gold btn-sm" style={{ marginTop: 8 }} onClick={() => setListing(true)}>
            Выставить лот
          </button>
        </div>
      )}

      <div className="auc-rules">
        <div className="section-title" style={{ marginTop: 14 }}>
          Как работает аукцион
        </div>
        <ul>
          <li>Продавец выставляет вещь или модификацию, задаёт стартовую цену и цену выкупа в ⭐.</li>
          <li>Покупатели делают ставки — каждая следующая выше предыдущей. Кто заплатит цену выкупа, сразу забирает лот.</li>
          <li>Когда время выходит, лот достаётся тому, чья ставка выше. Без ставок вещь возвращается продавцу.</li>
          <li>Комиссия аукциона — {Math.round(FEE * 100)}% с суммы продажи.</li>
        </ul>
      </div>

      {listing && <ListingSheet onClose={() => setListing(false)} />}
    </>
  );
}

/** Форма выставления лота. */
function ListingSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const toast = useUi((s) => s.toast);
  const [pick, setPick] = useState<{ kind: 'item' | 'part'; id: string } | null>(null);
  const [start, setStart] = useState('50');
  const [buyout, setBuyout] = useState('150');
  const [hours, setHours] = useState(24);

  const goods = useMemo(() => {
    const items = Object.values(profile.items)
      .filter((i) => !isEquipped(profile, i.id))
      .map((i) => ({ kind: 'item' as const, id: i.id, name: i.name, rarity: i.rarity, q: itemQuality(i), category: i.category }));
    const parts = Object.values(profile.parts)
      .filter((p) => !p.installedIn)
      .map((p) => ({ kind: 'part' as const, id: p.id, name: p.name, rarity: p.rarity, q: partQuality(p), category: null }));
    return [...items, ...parts].sort((a, b) => b.q - a.q);
  }, [profile]);

  const st = Math.max(0, Math.floor(Number(start) || 0));
  const bo = Math.max(0, Math.floor(Number(buyout) || 0));
  const valid = !!pick && st >= 1 && bo > st;

  return (
    <Sheet
      title="Выставить лот"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-gold btn-hazard" style={{ flex: 2 }} disabled={!valid} onClick={() => toast('Аукцион откроется вместе с сервером игры', 'info')}>
            Выставить
          </button>
        </>
      }
    >
      <div className="section-title" style={{ marginTop: 0 }}>
        Что продаём
      </div>
      {goods.length === 0 ? (
        <div className="empty">На складе нет свободных вещей и модификаций.</div>
      ) : (
        <div className="auc-goods">
          {goods.slice(0, 60).map((g) => {
            const col = rarityColor[g.rarity];
            const on = pick?.id === g.id;
            return (
              <button key={g.id} className={`auc-good${on ? ' on' : ''}`} style={{ ['--rc' as string]: col }} onClick={() => setPick({ kind: g.kind, id: g.id })}>
                {g.kind === 'part' ? <PartGlyph color={col} size={24} /> : <CategoryGlyph category={g.category!} color={col} size={26} />}
                <span className="auc-good-q" style={{ color: qualityColor(g.q) }}>
                  {Math.round(g.q * 100)}%
                </span>
                <span className="auc-good-n">{g.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="section-title">Цены в звёздах</div>
      <div className="auc-prices">
        <label>
          <span className="small muted">Стартовая</span>
          <span className="auc-input">
            ⭐ <input inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))} />
          </span>
        </label>
        <label>
          <span className="small muted">Выкуп</span>
          <span className="auc-input">
            ⭐ <input inputMode="numeric" value={buyout} onChange={(e) => setBuyout(e.target.value.replace(/\D/g, ''))} />
          </span>
        </label>
      </div>
      {bo <= st && <div className="warn-box" style={{ marginTop: 8 }}>Цена выкупа должна быть выше стартовой.</div>}

      <div className="section-title">Длительность</div>
      <div className="seg" style={{ display: 'flex' }}>
        {DURATIONS.map((h) => (
          <button key={h} style={{ flex: 1 }} className={hours === h ? 'on' : ''} onClick={() => setHours(h)}>
            {h} ч
          </button>
        ))}
      </div>
      <div className="small muted" style={{ marginTop: 10 }}>
        При продаже по выкупу вы получите ⭐ {Math.floor(bo * (1 - FEE))} (комиссия {Math.round(FEE * 100)}%). Пока лот на аукционе, вещь недоступна на складе.
      </div>
    </Sheet>
  );
}
