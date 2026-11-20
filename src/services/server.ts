// Связь с сервером игры (Supabase Edge Function).
// Работает только внутри Telegram: каждый запрос подписан данными запуска.
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
