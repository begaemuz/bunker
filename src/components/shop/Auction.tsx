import { useCallback, useEffect, useMemo, useState } from 'react';
import { AUCTION_DURATIONS, AUCTION_FEE, AUCTION_MAX_LOTS, lotInfo, minBid, TRADABLE_RES, type LotKind, type LotPayload } from '../../game/meta/auction';
import { itemQuality } from '../../game/items/ItemGenerator';
import { partQuality } from '../../game/items/Parts';
import { isEquipped } from '../../game/profile/Profile';
import { EQUIP_CATEGORIES, type EquipCategory, type Part } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { auctionBid, auctionCancel, auctionCreate, auctionList, serverAvailable, type AuctionData, type Lot } from '../../services/server';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { CategoryGlyph, PartGlyph, ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { shortStats } from '../inventory/ItemRow';
import { qualityColor } from '../inventory/Roll';
import { partStatsText } from '../parts/Parts';
import { consumableInfo } from '../../game/consumables';

type Cat = 'all' | 'parts' | 'other' | EquipCategory;
type View = 'market' | 'mine';
type Sort = 'ending' | 'cheap' | 'expensive' | 'quality';

const Cr = ({ size = 13 }: { size?: number }) => <ResourceIcon type="crystals" size={size} />;

function lotPrice(l: Lot): number {
  return l.bid ?? l.start;
}

function timeLeft(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return 'завершён';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} ч ${m % 60} мин` : `${Math.floor(h / 24)} д ${h % 24} ч`;
}

function useNow(ms = 30000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Значок вещи или модификации с цветом редкости. */
function LotGlyph({ payload, size = 26 }: { payload: LotPayload; size?: number }) {
  if ('res' in payload) return <ResourceIcon type={payload.res} size={size} />;
  const info = lotInfo(payload);
  const col = rarityColor[info.rarity];
  return 'part' in payload ? <PartGlyph color={col} size={size} /> : <CategoryGlyph category={info.category!} color={col} size={size} />;
}

function QualityText({ q }: { q: number | null }) {
  if (q == null) return <span className="muted">предмет</span>;
  return <span style={{ color: qualityColor(q) }}>{Math.round(q * 100)}%</span>;
}

/** Аукцион игроков за кристаллы. */
export function AuctionTab() {
  const online = serverAvailable();
  const toast = useUi((s) => s.toast);
  const pullDeliveries = useProfile((s) => s.pullDeliveries);
  const [view, setView] = useState<View>('market');
  const [cat, setCat] = useState<Cat>('all');
  const [sort, setSort] = useState<Sort>('ending');
  const [listing, setListing] = useState(false);
  const [data, setData] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Lot | null>(null);
  const now = useNow();

  const reload = useCallback(async () => {
    if (!online) return;
    setLoading(true);
    const r = await auctionList();
    setLoading(false);
    if (r) setData(r);
    else toast('Не удалось загрузить аукцион', 'bad');
    const got = await pullDeliveries();
    if (got.length) toast(got.map((d) => d.note).join(' · '), 'good');
  }, [online, toast, pullDeliveries]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const market = useMemo(() => {
    const list = (data?.market ?? []).filter((l) => {
      if (cat === 'all') return true;
      if (cat === 'parts') return l.kind === 'part';
      if (cat === 'other') return l.kind === 'res';
      return l.kind === 'item' && lotInfo(l.payload).category === cat;
    });
    const by: Record<Sort, (a: Lot, b: Lot) => number> = {
      ending: (a, b) => a.endsAt.localeCompare(b.endsAt),
      cheap: (a, b) => lotPrice(a) - lotPrice(b),
      expensive: (a, b) => lotPrice(b) - lotPrice(a),
      quality: (a, b) => (lotInfo(b.payload).quality ?? 2) - (lotInfo(a.payload).quality ?? 2),
    };
    return [...list].sort(by[sort]);
  }, [data, cat, sort]);

  const openMine = (data?.mine ?? []).filter((l) => l.status === 'open').length;

  if (!online) {
    return (
      <div className="auc-empty">
        <div className="auc-empty-icon">
          <Cr size={34} />
        </div>
        <b>Аукцион работает в Telegram</b>
        <span className="small muted">Откройте игру через бота @bunkerwarai_bot, чтобы торговать с другими игроками.</span>
      </div>
    );
  }

  return (
    <>
      <div className="auc-head">
        <div className="seg auc-view">
          <button className={view === 'market' ? 'on' : ''} onClick={() => setView('market')}>
            Лоты
          </button>
          <button className={view === 'mine' ? 'on' : ''} onClick={() => setView('mine')}>
            Мои торги
          </button>
        </div>
        <button className="btn btn-gold btn-sm" disabled={openMine >= AUCTION_MAX_LOTS} onClick={() => setListing(true)}>
          + Выставить
        </button>
      </div>

      {view === 'market' && (
        <>
          <div className="cx-grades auc-cats">
            {(['all', ...EQUIP_CATEGORIES, 'parts', 'other'] as Cat[]).map((c) => (
              <button key={c} className={`cx-grade tier${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
                {c === 'all' ? 'Все' : c === 'parts' ? 'Модификации' : c === 'other' ? 'Предметы' : ru.category[c]}
              </button>
            ))}
          </div>
          <div className="auc-sort">
            {(
              [
                ['ending', 'скоро конец'],
                ['cheap', 'дешевле'],
                ['expensive', 'дороже'],
                ['quality', 'качество'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={`auc-sort-b${sort === id ? ' on' : ''}`} onClick={() => setSort(id)}>
                {label}
              </button>
            ))}
            <button className="auc-sort-b auc-refresh" onClick={() => void reload()} disabled={loading}>
              {loading ? '…' : '↻'}
            </button>
          </div>
          {market.length === 0 ? (
            <div className="auc-empty">
              <div className="auc-empty-icon">
                <Cr size={30} />
              </div>
              <b>{loading ? 'Загружаем лоты…' : 'Лотов пока нет'}</b>
              <span className="small muted">Здесь появляются вещи и модификации, которые выставили другие игроки.</span>
            </div>
          ) : (
            <div className="auc-list">
              {market.map((l) => (
                <LotRow key={l.id} lot={l} now={now} onClick={() => setOpen(l)} />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'mine' && (
        <>
          <div className="section-title">Мои ставки</div>
          {(data?.bids ?? []).length === 0 ? (
            <div className="empty">Вы пока не делали ставок.</div>
          ) : (
            <div className="auc-list">
              {data!.bids.map((l) => (
                <LotRow key={l.id} lot={l} now={now} onClick={() => setOpen(l)} />
              ))}
            </div>
          )}
          <div className="section-title">
            Мои лоты · {openMine}/{AUCTION_MAX_LOTS}
          </div>
          {(data?.mine ?? []).length === 0 ? (
            <div className="empty">Выставьте вещь или модификацию со склада.</div>
          ) : (
            <div className="auc-list">
              {data!.mine.map((l) => (
                <LotRow key={l.id} lot={l} now={now} onClick={() => setOpen(l)} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="auc-rules">
        <div className="section-title" style={{ marginTop: 14 }}>
          Как работает аукцион
        </div>
        <ul>
          <li>Выставьте вещь или модификацию со склада, задайте стартовую цену и цену выкупа в кристаллах.</li>
          <li>Каждая следующая ставка выше предыдущей минимум на 5%. Если вашу ставку перебили, кристаллы вернутся.</li>
          <li>Цена выкупа сразу забирает лот. Ставка в последние 2 минуты продлевает торги.</li>
          <li>Без ставок вещь возвращается продавцу. Снять лот можно, пока на него нет ставок.</li>
          <li>Комиссия аукциона — {Math.round(AUCTION_FEE * 100)}% с суммы продажи.</li>
        </ul>
      </div>

      {listing && (
        <ListingSheet
          onClose={() => setListing(false)}
          onDone={() => {
            setListing(false);
            setView('mine');
            void reload();
          }}
        />
      )}
      {open && (
        <LotSheet
          lot={open}
          now={now}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null);
            void reload();
          }}
        />
      )}
    </>
  );
}

function LotRow({ lot, now, onClick }: { lot: Lot; now: number; onClick: () => void }) {
  const main = lotInfo(lot.payload);
  const col = rarityColor[main.rarity];
  const closed = lot.status !== 'open';
  return (
    <button className={`auc-lot${lot.leading ? ' leading' : ''}${closed ? ' closed' : ''}`} style={{ ['--rc' as string]: col }} onClick={onClick}>
      <span className="auc-lot-ic">
        <LotGlyph payload={lot.payload} />
      </span>
      <span className="auc-lot-mid">
        <b style={{ color: col }}>{main.name}</b>
        <span className="small">
          <QualityText q={main.quality} />
          <span className="muted"> · {closed ? statusWord(lot) : timeLeft(lot.endsAt, now)}</span>
          {lot.leading && <span className="auc-lead"> · ваша ставка</span>}
        </span>
      </span>
      <span className="auc-lot-price">
        <span className="auc-lot-bid">
          <Cr /> {fmtNum(lotPrice(lot))}
        </span>
        <span className="small muted">
          выкуп {fmtNum(lot.buyout)}
        </span>
      </span>
    </button>
  );
}

function statusWord(l: Lot): string {
  return l.status === 'sold' ? `продан за ${fmtNum(l.bid ?? 0)}` : l.status === 'expired' ? 'без ставок, возвращён' : l.status === 'cancelled' ? 'снят' : '';
}

/** Карточка лота: характеристики, ставка и выкуп. */
function LotSheet({ lot, now, onClose, onDone }: { lot: Lot; now: number; onClose: () => void; onDone: () => void }) {
  const crystals = useProfile((s) => s.profile!.resources.crystals);
  const payCrystals = useProfile((s) => s.payCrystals);
  const toast = useUi((s) => s.toast);
  const main = lotInfo(lot.payload);
  const col = rarityColor[main.rarity];
  const min = minBid(lot.start, lot.bid);
  const [amount, setAmount] = useState(String(Math.min(min, lot.buyout)));
  const [busy, setBusy] = useState(false);
  const n = Math.floor(Number(amount) || 0);
  const open = lot.status === 'open';
  const canAct = open && !lot.mine && !lot.leading;
  const p = lot.payload;
  const stats = 'res' in p ? consumableInfo[p.res].description : 'part' in p ? partStatsText(p.part) : shortStats(p.item, 8);
  const parts: Part[] = 'item' in p ? p.parts : [];

  const place = async (value: number) => {
    if (value > crystals) {
      toast('Не хватает кристаллов', 'bad');
      return;
    }
    setBusy(true);
    const r = await auctionBid(lot.id, value);
    setBusy(false);
    const res = r?.result;
    if (res === 'ok' || res === 'sold') {
      payCrystals(value);
      toast(res === 'sold' ? `Лот выкуплен: ${main.name}` : 'Ставка принята', 'good');
      onDone();
      return;
    }
    const why: Record<string, string> = {
      low: 'Ставку уже перебили — обновите лот',
      closed: 'Торги по лоту закончились',
      own: 'Нельзя торговаться за свой лот',
      leading: 'Ваша ставка и так первая',
      not_found: 'Лот не найден',
    };
    toast(why[res ?? ''] ?? 'Сервер не ответил, попробуйте ещё раз', 'bad');
    if (res === 'low' || res === 'closed') onDone();
  };

  const cancel = async () => {
    setBusy(true);
    const r = await auctionCancel(lot.id);
    setBusy(false);
    if (r?.result === 'ok') {
      toast('Лот снят, вещь вернётся на склад', 'good');
      onDone();
    } else toast(r?.result === 'has_bids' ? 'На лот уже есть ставки' : 'Не удалось снять лот', 'bad');
  };

  return (
    <Sheet
      title="Лот"
      onClose={onClose}
      actions={
        lot.mine ? (
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Закрыть
            </button>
            {open && (
              <button className="btn btn-danger" style={{ flex: 2 }} disabled={busy || lot.bid != null} onClick={() => void cancel()}>
                Снять с торгов
              </button>
            )}
          </>
        ) : canAct ? (
          <>
            <button className="btn btn-ghost" disabled={busy || n < min || n >= lot.buyout} onClick={() => void place(n)}>
              Ставка {fmtNum(n)}
            </button>
            <button className="btn btn-gold btn-hazard" style={{ flex: 2 }} disabled={busy} onClick={() => void place(lot.buyout)}>
              Выкупить за <Cr /> {fmtNum(lot.buyout)}
            </button>
          </>
        ) : (
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Закрыть
          </button>
        )
      }
    >
      <div className="auc-card" style={{ ['--rc' as string]: col }}>
        <span className="auc-card-ic">
          <LotGlyph payload={lot.payload} size={40} />
        </span>
        <div className="grow">
          <b style={{ color: col }}>{main.name}</b>
          <div className="small muted">
            {main.quality == null ? (
              'Расходник'
            ) : (
              <>
                {ru.rarity[main.rarity]} · качество <QualityText q={main.quality} />
              </>
            )}
          </div>
          <div className="small muted">Продавец: {lot.mine ? 'вы' : lot.sellerNick || 'Инженер'}</div>
        </div>
      </div>
      <div className="auc-stats">{stats}</div>
      {parts.length > 0 && (
        <div className="auc-stats">
          <span className="muted">Установлено: </span>
          {parts.map((p) => p.name).join(', ')}
        </div>
      )}

      <div className="auc-facts">
        <span>
          <span className="muted">{lot.bid != null ? 'Ставка' : 'Старт'}</span>
          <b>
            <Cr /> {fmtNum(lotPrice(lot))}
          </b>
        </span>
        <span>
          <span className="muted">Выкуп</span>
          <b>
            <Cr /> {fmtNum(lot.buyout)}
          </b>
        </span>
        <span>
          <span className="muted">{open ? 'Осталось' : 'Итог'}</span>
          <b>{open ? timeLeft(lot.endsAt, now) : statusWord(lot)}</b>
        </span>
      </div>
      {lot.bids > 0 && (
        <div className="small muted" style={{ marginTop: 6 }}>
          Ставок: {lot.bids}
          {lot.leading ? ' · лидирует ваша ставка' : lot.bidderNick ? ` · лидирует ${lot.bidderNick}` : ''}
        </div>
      )}

      {canAct && (
        <>
          <div className="section-title">Ваша ставка</div>
          <div className="auc-bid-row">
            <span className="auc-input">
              <Cr /> <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
            </span>
            <button className="auc-sort-b" onClick={() => setAmount(String(min))}>
              мин. {fmtNum(min)}
            </button>
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            У вас <Cr /> {fmtNum(crystals)}. Если ставку перебьют, кристаллы вернутся.
          </div>
        </>
      )}
      {lot.mine && open && lot.bid == null && (
        <div className="small muted" style={{ marginTop: 10 }}>
          Ставок пока нет — лот можно снять, вещь вернётся на склад.
        </div>
      )}
    </Sheet>
  );
}

/** Форма выставления лота. */
function ListingSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const lotTake = useProfile((s) => s.lotTake);
  const lotReturn = useProfile((s) => s.lotReturn);
  const toast = useUi((s) => s.toast);
  const [pick, setPick] = useState<{ kind: LotKind; id: string } | null>(null);
  const [start, setStart] = useState('20');
  const [buyout, setBuyout] = useState('60');
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);

  const goods = useMemo(() => {
    const items = Object.values(profile.items)
      .filter((i) => !isEquipped(profile, i.id))
      .map((i) => ({ kind: 'item' as const, id: i.id, name: i.name, rarity: i.rarity, q: itemQuality(i), category: i.category }));
    const parts = Object.values(profile.parts)
      .filter((p) => !p.installedIn)
      .map((p) => ({ kind: 'part' as const, id: p.id, name: p.name, rarity: p.rarity, q: partQuality(p), category: null }));
    const res = TRADABLE_RES.filter((r) => profile.resources[r] > 0).map((r) => ({ kind: 'res' as const, id: r, name: ru.resource[r], rarity: 'legendary' as const, q: 2, category: null }));
    return [...res, ...items, ...parts].sort((a, b) => b.q - a.q);
  }, [profile]);

  const st = Math.max(0, Math.floor(Number(start) || 0));
  const bo = Math.max(0, Math.floor(Number(buyout) || 0));
  const valid = !!pick && st >= 1 && bo > st && bo <= 1_000_000;

  const submit = async () => {
    if (!pick || !valid) return;
    setBusy(true);
    const taken = lotTake(pick.kind, pick.id);
    if (!taken) {
      setBusy(false);
      toast('Эту вещь нельзя выставить', 'bad');
      return;
    }
    const r = await auctionCreate({ kind: pick.kind, payload: taken.payload, start: st, buyout: bo, hours, quality: taken.quality });
    setBusy(false);
    if (r?.ok) {
      toast('Лот выставлен', 'good');
      onDone();
      return;
    }
    lotReturn(taken.payload);
    toast(r?.error === 'limit' ? `Можно держать не больше ${AUCTION_MAX_LOTS} лотов` : 'Сервер не принял лот, вещь осталась на складе', 'bad');
  };

  return (
    <Sheet
      title="Выставить лот"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-gold btn-hazard" style={{ flex: 2 }} disabled={!valid || busy} onClick={() => void submit()}>
            {busy ? 'Выставляем…' : 'Выставить'}
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
                {g.kind === 'res' ? <ResourceIcon type={g.id as 'skillResets'} size={24} /> : g.kind === 'part' ? <PartGlyph color={col} size={24} /> : <CategoryGlyph category={g.category!} color={col} size={26} />}
                <span className="auc-good-q" style={{ color: g.kind === 'res' ? col : qualityColor(g.q) }}>
                  {g.kind === 'res' ? `×${profile.resources[g.id as 'skillResets']}` : `${Math.round(g.q * 100)}%`}
                </span>
                <span className="auc-good-n">{g.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="section-title">Цены в кристаллах</div>
      <div className="auc-prices">
        <label>
          <span className="small muted">Стартовая</span>
          <span className="auc-input">
            <Cr /> <input inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))} />
          </span>
        </label>
        <label>
          <span className="small muted">Выкуп</span>
          <span className="auc-input">
            <Cr /> <input inputMode="numeric" value={buyout} onChange={(e) => setBuyout(e.target.value.replace(/\D/g, ''))} />
          </span>
        </label>
      </div>
      {bo <= st && <div className="warn-box" style={{ marginTop: 8 }}>Цена выкупа должна быть выше стартовой.</div>}

      <div className="section-title">Длительность</div>
      <div className="seg" style={{ display: 'flex' }}>
        {AUCTION_DURATIONS.map((h) => (
          <button key={h} style={{ flex: 1 }} className={hours === h ? 'on' : ''} onClick={() => setHours(h)}>
            {h} ч
          </button>
        ))}
      </div>
      <div className="small muted" style={{ marginTop: 10 }}>
        При продаже по выкупу вы получите <Cr /> {fmtNum(Math.floor(bo * (1 - AUCTION_FEE)))} (комиссия {Math.round(AUCTION_FEE * 100)}%). Пока лот на торгах, вещи нет на складе.
      </div>
    </Sheet>
  );
}
