import { useEffect, useState } from 'react';
import { exchangeConfig, shopConfig } from '../../game/config/metaConfig';
import { exchangeUsed, nextShopRefresh, shopRefreshCost, type Offer } from '../../game/meta/Meta';
import { canAfford } from '../../game/profile/Profile';
import { RESOURCE_KEYS, type Resources } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { CategoryGlyph, PartGlyph, ResourceIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { shortStats } from '../inventory/ItemRow';
import { partStatsText } from '../parts/Parts';

type Tab = 'regular' | 'rare' | 'special' | 'exchange';

function Price({ price }: { price: Partial<Resources> }) {
  const p = useProfile((s) => s.profile)!;
  return (
    <span className="price">
      {RESOURCE_KEYS.filter((k) => price[k]).map((k) => (
        <span key={k} style={{ color: p.resources[k] < price[k]! ? '#ff6b5a' : undefined }}>
          <ResourceIcon type={k} /> {fmtNum(price[k]!)}
        </span>
      ))}
    </span>
  );
}

function offerTitle(o: Offer): { name: string; color: string; sub: string } {
  if (o.item) return { name: o.item.name, color: rarityColor[o.item.rarity], sub: `${ru.rarity[o.item.rarity]} · Т${o.item.tier}` };
  if (o.part) return { name: o.part.name, color: rarityColor[o.part.rarity], sub: `${ru.rarity[o.part.rarity]} модификация` };
  const k = RESOURCE_KEYS.find((x) => o.give?.[x]);
  return { name: k ? `${ru.resource[k]} ×${o.give![k]}` : 'Ресурсы', color: '#eef2f5', sub: 'Набор ресурсов' };
}

function OfferCard({ o, onOpen }: { o: Offer; onOpen: () => void }) {
  const t = offerTitle(o);
  const k = RESOURCE_KEYS.find((x) => o.give?.[x]);
  return (
    <button className={`shop-card${o.sold ? ' sold' : ''}`} style={{ borderColor: o.sold ? undefined : t.color }} onClick={onOpen} disabled={o.sold}>
      <div style={{ display: 'grid', placeItems: 'center', height: 54 }}>
        {o.item ? (
          <CategoryGlyph category={o.item.category} color={t.color} size={38} />
        ) : o.part ? (
          <PartGlyph color={t.color} size={36} />
        ) : k ? (
          <ResourceIcon type={k} size={34} />
        ) : null}
      </div>
      <div className="tile-name" style={{ color: t.color, fontSize: 10 }}>
        {t.name}
      </div>
      <div className="small muted" style={{ textAlign: 'center', fontSize: 9 }}>
        {t.sub}
      </div>
      {o.sold ? <div className="small" style={{ textAlign: 'center', fontWeight: 900 }}>КУПЛЕНО</div> : <Price price={o.price} />}
    </button>
  );
}

function OfferSheet({ o, section, onClose }: { o: Offer; section: 'regular' | 'rare'; onClose: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const buy = useProfile((s) => s.buy);
  const toast = useUi((s) => s.toast);
  const t = offerTitle(o);
  return (
    <Sheet
      title={<span style={{ color: t.color }}>{t.name}</span>}
      subtitle={t.sub}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
          <button
            className="btn btn-gold"
            disabled={!canAfford(profile, o.price) || o.sold}
            onClick={() => {
              const err = buy(section, o.id);
              if (err) toast('Не хватает ресурсов', 'bad');
              else {
                sfx.item(true);
                toast(`Куплено: ${t.name}`, 'good');
                onClose();
              }
            }}
          >
            Купить · <Price price={o.price} />
          </button>
        </>
      }
    >
      {o.item && (
        <>
          <div className="small muted" style={{ marginBottom: 8 }}>
            {o.item.description}
          </div>
          <div className="small">{shortStats(o.item, 5)}</div>
          {o.item.extraStats.length > 0 && <div className="small muted" style={{ marginTop: 6 }}>Доп. свойств: {o.item.extraStats.length} · слотов модификаций: {o.item.slots.length}</div>}
        </>
      )}
      {o.part && <div className="small">{partStatsText(o.part)}</div>}
      {o.give && <div className="small muted">Ресурсы сразу поступят на склад.</div>}
    </Sheet>
  );
}

function useNow(ms = 1000): number {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}

function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин ${s % 60} с`;
}

export function ShopScreen() {
  const profile = useProfile((s) => s.profile)!;
  const ensureMeta = useProfile((s) => s.ensureMeta);
  const refresh = useProfile((s) => s.refreshShop);
  const buySpecial = useProfile((s) => s.buySpecial);
  const exchange = useProfile((s) => s.exchange);
  const toast = useUi((s) => s.toast);
  const [tab, setTab] = useState<Tab>('regular');
  const [open, setOpen] = useState<{ o: Offer; section: 'regular' | 'rare' } | null>(null);
  const now = useNow();

  useEffect(() => {
    ensureMeta();
  }, [ensureMeta, now]);

  const refreshCost = shopRefreshCost(profile);
  const left = nextShopRefresh(profile) - now;
  const r = profile.resources;

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Магазин</h2>
      </div>
      <div className="tabs">
        {(
          [
            ['regular', 'Магазин'],
            ['rare', 'Редкие детали'],
            ['special', 'Кристаллы'],
            ['exchange', 'Обмен'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="screen-body">
        <div className="res-strip" style={{ justifyContent: 'center', marginBottom: 10 }}>
          {(['coins', 'scrap', 'techParts', 'blueprints', 'energyCores', 'crystals'] as const).map((k) => (
            <span key={k} className="res">
              <ResourceIcon type={k} /> {fmtNum(r[k])}
            </span>
          ))}
        </div>

        {(tab === 'regular' || tab === 'rare') && (
          <>
            <div className="toggle-row" style={{ marginBottom: 10 }}>
              <span className="small">
                Новый ассортимент через <b>{fmtLeft(left)}</b>
              </span>
              <button
                className="btn btn-sm"
                disabled={!canAfford(profile, refreshCost)}
                onClick={() => {
                  if (refresh()) toast('Ассортимент обновлён', 'good');
                }}
              >
                Обновить · <ResourceIcon type="coins" /> {fmtNum(refreshCost.coins!)}
              </button>
            </div>
            <div className="shop-grid">
              {profile.shop[tab].map((o) => (
                <OfferCard key={o.id} o={o} onOpen={() => setOpen({ o, section: tab })} />
              ))}
            </div>
          </>
        )}

        {tab === 'special' && (
          <div className="menu-list">
            {shopConfig.special.map((o) => (
              <div key={o.id} className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="grow">
                  <div style={{ fontWeight: 900 }}>{o.title}</div>
                  <div className="small muted">{o.description}</div>
                </div>
                <button
                  className="btn btn-sm btn-gold"
                  disabled={!canAfford(profile, o.price)}
                  onClick={() => {
                    const res = buySpecial(o.id);
                    if (res.error) toast('Не хватает кристаллов', 'bad');
                    else {
                      sfx.item(true);
                      toast(`Получено: ${res.got}`, 'rare');
                    }
                  }}
                >
                  <ResourceIcon type="crystals" /> {o.price.crystals}
                </button>
              </div>
            ))}
            <div className="small muted" style={{ textAlign: 'center' }}>
              Кристаллы добываются в игре: боссы, награды за вход и ежедневные задания.
            </div>
          </div>
        )}

        {tab === 'exchange' && (
          <div className="menu-list">
            {exchangeConfig.map((x) => {
              const used = exchangeUsed(profile, x.id);
              const ok = used < x.dailyLimit && r[x.from] >= x.give;
              return (
                <div key={x.id} className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="grow">
                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ResourceIcon type={x.from} size={16} /> {fmtNum(x.give)} → <ResourceIcon type={x.to} size={16} /> {fmtNum(x.get)}
                    </div>
                    <div className="small muted">
                      {ru.resource[x.from]} → {ru.resource[x.to]} · сегодня {used}/{x.dailyLimit}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={!ok}
                    onClick={() => {
                      const err = exchange(x.id);
                      if (err) toast(err === 'limit' ? 'Дневной лимит исчерпан' : 'Не хватает ресурсов', 'bad');
                      else sfx.click();
                    }}
                  >
                    Обменять
                  </button>
                </div>
              );
            })}
            <div className="small muted" style={{ textAlign: 'center' }}>
              Курсы с комиссией и дневными лимитами, обмен туда-обратно всегда в убыток.
            </div>
          </div>
        )}
      </div>
      {open && <OfferSheet o={profile.shop[open.section].find((x) => x.id === open.o.id) ?? open.o} section={open.section} onClose={() => setOpen(null)} />}
    </div>
  );
}
