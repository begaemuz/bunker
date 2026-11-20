// Связь с сервером игры (Supabase Edge Function).
// Работает только внутри Telegram: каждый запрос подписан данными запуска.
import type { Delivery, LotKind, LotPayload } from '../game/meta/auction';
import { tgInitData } from './telegram';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const REF = env.VITE_SUPABASE_REF ?? '';
const API = REF ? `https://${REF}.supabase.co/functions/v1/api` : '';

export function serverAvailable(): boolean {
  return !!API && !!tgInitData();
}

async function call<T>(action: string, payload: Record<string, unknown> = {}, timeoutMs = 8000): Promise<T | null> {
  if (!serverAvailable()) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-init-data': tgInitData() },
      body: JSON.stringify({ action, ...payload }),
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface ServerSummary {
  nick: string;
  avatar: number;
  frame: string;
  level: number;
  power: number;
  bosses: number;
}

export async function serverLoad(): Promise<{ save: unknown; updatedAt: number } | null> {
  return call('load');
}

export async function serverSave(save: unknown, updatedAt: number, summary: ServerSummary): Promise<boolean> {
  const r = await call<{ ok: boolean; conflict?: boolean }>('save', { save, updatedAt, summary }, 12000);
  return !!r?.ok;
}

export interface LeaderRow {
  me: boolean;
  nick: string;
  avatar: number;
  frame: string;
  level: number;
  vip: number;
  value: number;
}

export async function serverLeaders(board: string): Promise<{ list: LeaderRow[]; rank: number | null } | null> {
  return call('leaders', { board });
}

// ═════ Аукцион ═════
export interface Lot {
  id: number;
  kind: LotKind;
  payload: LotPayload;
  sellerNick: string;
  start: number;
  buyout: number;
  bid: number | null;
  bids: number;
  leading: boolean;
  bidderNick: string | null;
  endsAt: string;
  status: 'open' | 'sold' | 'expired' | 'cancelled';
  mine: boolean;
}

export interface AuctionData {
  market: Lot[];
  mine: Lot[];
  bids: Lot[];
}

export function auctionList(): Promise<AuctionData | null> {
  return call('auction_list');
}

export function auctionCreate(args: { kind: LotKind; payload: LotPayload; start: number; buyout: number; hours: number; quality: number }): Promise<{ ok?: boolean; error?: string } | null> {
  return call('auction_create', args);
}

export function auctionBid(id: number, amount: number): Promise<{ result?: string } | null> {
  return call('auction_bid', { id, amount });
}

export function auctionCancel(id: number): Promise<{ result?: string } | null> {
  return call('auction_cancel', { id });
}

export async function claimDeliveries(): Promise<Delivery[] | null> {
  const r = await call<{ list: Delivery[] }>('deliveries');
  return r?.list ?? null;
}

/** Время сервера (без входа). Возвращает UTC мс или null. */
export async function fetchServerTime(): Promise<number | null> {
  if (!API) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  try {
    const sent = Date.now();
    const r = await fetch(`${API}?time`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: ctl.signal });
    if (!r.ok) return null;
    const j = (await r.json()) as { now?: number };
    // поправка на половину времени запроса
    return typeof j.now === 'number' ? j.now + (Date.now() - sent) / 2 : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
