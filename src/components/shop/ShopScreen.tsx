import { ResourceStrip } from '../common/Common';
import { useEffect, useState } from 'react';
import { exchangeConfig, shopConfig } from '../../game/config/metaConfig';
import { crystalPacks, vipLevel } from '../../game/meta/vip';
import { exchangeLimit, exchangeUsed, nextShopRefresh, shopRefreshCost, type Offer } from '../../game/meta/Meta';
import { canAfford } from '../../game/profile/Profile';
import { RESOURCE_KEYS, type Resources } from '../../game/types';
import { fmtNum, ru } from '../../i18n/ru';
import { sfx } from '../../services/sound';
import { useProfile } from '../../stores/profileStore';
import { useUi } from '../../stores/uiStore';
import { rarityColor } from '../../ui/theme';
import { CategoryGlyph, PartGlyph, ResourceIcon, UiIcon } from '../common/Icons';
import { Sheet } from '../common/Sheet';
import { AuctionTab } from './Auction';
import { shortStats } from '../inventory/ItemRow';
import { partStatsText } from '../parts/Parts';

type Tab = 'goods' | 'special' | 'exchange' | 'auction';

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

function OfferCard({ o, section, onOpen }: { o: Offer; section: 'regular' | 'rare'; onOpen: () => void }) {
  const profile = useProfile((s) => s.profile)!;
  const buy = useProfile((s) => s.buy);
  const toast = useUi((s) => s.toast);
  const t = offerTitle(o);
  const k = RESOURCE_KEYS.find((x) => o.give?.[x]);
  const afford = canAfford(profile, o.price);
  return (
    <div className={`ware${o.sold ? ' sold' : ''}`} style={{ ['--rc' as string]: t.color }}>
      <button className="ware-look" onClick={onOpen} disabled={o.sold}>
        <span className="ware-stand">
          {o.item ? (
            <CategoryGlyph category={o.item.category} color={t.color} size={44} />
          ) : o.part ? (
            <PartGlyph color={t.color} size={42} />
          ) : k ? (
            <ResourceIcon type={k} size={40} />
          ) : null}
          {o.item && <span className="ware-tier">Т{o.item.tier}</span>}
        </span>
        <span className="ware-name">{t.name}</span>
        <span className="ware-sub">{t.sub}</span>
      </button>
      {o.sold ? (
        <div className="ware-stamp">Продано</div>
      ) : (
        <button
          className={`ware-price${afford ? '' : ' lack'}`}
          disabled={!afford}
          onClick={() => {
            const err = buy(section, o.id);
            if (err) toast('Не хватает ресурсов', 'bad');
            else {
              sfx.item(true);
              toast(`Куплено: ${t.name}`, 'good');
            }
          }}
        >
          <Price price={o.price} />
        </button>
      )}
    </div>
  );
}

/** Вывеска торговца: навес, ящики, фонарь. */
function TraderSign({ left, onRefresh, cost, can }: { left: string; onRefresh: () => void; cost: number; can: boolean }) {
  return (
    <div className="trader">
      <svg className="trader-art" viewBox="0 0 120 90" aria-hidden>
        <path d="M6 22h108l-8 16H14z" fill="#b4532a" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${6 + i * 18} 22h9l-1.3 16h-9z`} fill="#f2a93b" />
        ))}
        <path d="M14 38q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0" fill="#8c3a14" />
        <rect x="16" y="38" width="4" height="48" fill="#3a3027" />
        <rect x="100" y="38" width="4" height="48" fill="#3a3027" />
        <rect x="26" y="60" width="28" height="24" fill="#5a4630" stroke="#2a2016" strokeWidth="2" />
        <path d="M26 72h28M40 60v24" stroke="#2a2016" strokeWidth="2" />
        <rect x="58" y="68" width="22" height="16" fill="#46515c" stroke="#1d2328" strokeWidth="2" />
        <circle cx="69" cy="76" r="3" fill="#46d4ff" />
        <rect x="84" y="56" width="14" height="28" rx="3" fill="#2f363c" stroke="#1d2328" strokeWidth="2" />
        <circle cx="91" cy="64" r="2.5" fill="#f2a93b">
          <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <path d="M60 4v14M52 18h16" stroke="#3a3027" strokeWidth="2" />
        <circle cx="60" cy="10" r="4" fill="#ffd27a" opacity="0.9" />
      </svg>
      <div className="trader-text">
        <div className="trader-name">Караван торговца</div>
        <div className="small muted">Новый товар через {left}</div>
        <button className="btn btn-sm" disabled={!can} onClick={onRefresh}>
          <UiIcon kind="refresh" size={14} /> Обновить · <ResourceIcon type="coins" /> {fmtNum(cost)}
        </button>
      </div>
    </div>
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
            className="btn btn-gold btn-hazard"
            style={{ flex: 2 }}
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
  const setProfileOpen = useUi((s) => s.setProfileOpen);
  const shopTab = useUi((s) => s.shopTab);
  const clearShopTab = useUi((s) => s.clearShopTab);
  const [tab, setTab] = useState<Tab>((shopTab as Tab) ?? 'goods');
  useEffect(() => {
    if (shopTab) {
      setTab(shopTab as Tab);
      clearShopTab();
    }
  }, [shopTab, clearShopTab]);
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
        <ResourceStrip />
      </div>
      <div className="tabs">
        {(
          [
            ['goods', 'Товары'],
            ['special', 'Кристаллы'],
            ['exchange', 'Обмен'],
            ['auction', 'Аукцион'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="screen-body">
        

        {tab === 'goods' && (
          <>
            <TraderSign
              left={fmtLeft(left)}
              cost={refreshCost.coins!}
              can={canAfford(profile, refreshCost)}
              onRefresh={() => {
                if (refresh()) toast('Ассортимент обновлён', 'good');
              }}
            />
            <div className="ware-grid">
              {(['regular', 'rare'] as const).flatMap((sec) =>
                profile.shop[sec].map((o) => <OfferCard key={o.id} o={o} section={sec} onOpen={() => setOpen({ o, section: sec })} />),
              )}
            </div>
          </>
        )}

        {tab === 'auction' && <AuctionTab />}

        {tab === 'special' && (
          <div className="deal-list">
            <button className="vip-strip" onClick={() => setProfileOpen(true)}>
              <span className="vip-badge">VIP {vipLevel(profile.vip.points)}</span>
              <span className="grow small">Покупка кристаллов повышает VIP-статус и даёт постоянные бонусы</span>
              <span className="muted">›</span>
            </button>
            <div className="pack-grid">
              {crystalPacks.map((p) => (
                <button key={p.id} className="pack" onClick={() => toast('Оплата Telegram Stars скоро будет подключена', 'info')}>
                  {p.bonus > 0 && <span className="pack-bonus">+{p.bonus} бонус</span>}
                  <span className="pack-gem">
                    <ResourceIcon type="crystals" size={34} />
                  </span>
                  <span className="pack-amount">{fmtNum(p.crystals)}</span>
                  <span className="pack-price">⭐ {fmtNum(p.stars)}</span>
                </button>
              ))}
            </div>
            <div className="section-title" style={{ margin: '6px 2px 0' }}>
              За кристаллы
            </div>
            {shopConfig.special.map((o) => (
              <div key={o.id} className="deal">
                <span className="deal-gem">
                  <ResourceIcon type="crystals" size={30} />
                </span>
                <div className="grow">
                  <div className="deal-title">{o.title}</div>
                  <div className="small muted">{o.description}</div>
                </div>
                <button
                  className="btn btn-sm btn-primary"
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
          <div className="deal-list">
            {exchangeConfig.map((x) => {
              const used = exchangeUsed(profile, x.id);
              const limit = exchangeLimit(profile, x.dailyLimit);
              const ok = used < limit && r[x.from] >= x.give;
              return (
                <div key={x.id} className="swap">
                  <div className="swap-side">
                    <ResourceIcon type={x.from} size={26} />
                    <b>{fmtNum(x.give)}</b>
                    <span>{ru.resource[x.from]}</span>
                  </div>
                  <div className="swap-mid">
                    <svg width="34" height="20" viewBox="0 0 34 20" aria-hidden>
                      <path d="M2 10h28M22 3l8 7-8 7" fill="none" stroke="#f2a93b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="swap-left">сегодня {used}/{limit}</span>
                  </div>
                  <div className="swap-side">
                    <ResourceIcon type={x.to} size={26} />
                    <b>{fmtNum(x.get)}</b>
                    <span>{ru.resource[x.to]}</span>
                  </div>
                  <button
                    className="btn btn-sm btn-primary swap-btn"
                    disabled={!ok}
                    onClick={() => {
                      const err = exchange(x.id);
                      if (err) toast(err === 'limit' ? 'Дневной лимит исчерпан' : 'Не хватает ресурсов', 'bad');
                      else sfx.click();
                    }}
                  >
                    {used >= limit ? 'Лимит' : 'Обменять'}
                  </button>
                </div>
              );
            })}
            <div className="small muted" style={{ textAlign: 'center' }}>
              Курсы с комиссией и дневными лимитами: обмен туда-обратно всегда в убыток.
            </div>
          </div>
        )}
      </div>
      {open && <OfferSheet o={profile.shop[open.section].find((x) => x.id === open.o.id) ?? open.o} section={open.section} onClose={() => setOpen(null)} />}
    </div>
  );
}
