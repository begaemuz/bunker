// Серверная функция игры: вход через Telegram, сохранения, таблица лидеров.
// Каждый запрос подписан Telegram (initData) — подделать игрока нельзя.
import { createClient } from 'npm:@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-init-data',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'content-type': 'application/json' } });

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

interface TgUser {
  id: number;
  first_name?: string;
  username?: string;
}

/** Проверка подписи initData по правилам Telegram Mini Apps. */
async function verify(initData: string): Promise<TgUser | null> {
  if (!initData || !BOT_TOKEN) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const check = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = await hmac(new TextEncoder().encode('WebAppData'), BOT_TOKEN);
  if (hex(await hmac(secret, check)) !== hash) return null;
  // Подпись живёт 30 дней: мини-приложение может долго оставаться открытым.
  const authDate = Number(params.get('auth_date') ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 30 * 86400) return null;
  try {
    return JSON.parse(params.get('user') ?? 'null');
  } catch {
    return null;
  }
}

const BOARDS: Record<string, string> = { power: 'power', level: 'level', bosses: 'bosses' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const user = await verify(req.headers.get('x-init-data') ?? '');
  if (!user) return json({ error: 'auth' }, 401);
  const body = await req.json().catch(() => ({}));

  switch (body.action) {
    case 'load': {
      const { data, error } = await db.from('players').select('save, save_updated').eq('tg_id', user.id).maybeSingle();
      if (error) return json({ error: 'db' }, 500);
      return json({ save: data?.save ?? null, updatedAt: data?.save_updated ?? 0 });
    }

    case 'save': {
      const save = body.save;
      const updatedAt = Number(body.updatedAt ?? 0);
      const s = body.summary ?? {};
      if (!save || typeof save !== 'object') return json({ error: 'bad' }, 400);
      if (JSON.stringify(save).length > 2_000_000) return json({ error: 'too_big' }, 413);
      // Не затираем более свежее сохранение с другого устройства.
      const { data: cur } = await db.from('players').select('save_updated').eq('tg_id', user.id).maybeSingle();
      if (cur && Number(cur.save_updated) > updatedAt) return json({ ok: false, conflict: true });
      const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
      const { error } = await db.from('players').upsert({
        tg_id: user.id,
        username: user.username ?? null,
        nick: String(s.nick ?? user.first_name ?? '').slice(0, 16),
        avatar: int(s.avatar, 99),
        frame: String(s.frame ?? 'steel').slice(0, 24),
        level: int(s.level, 100000),
        power: int(s.power, 1e12),
        bosses: int(s.bosses, 1e9),
        save,
        save_updated: updatedAt,
        updated_at: new Date().toISOString(),
      });
      if (error) return json({ error: 'db' }, 500);
      return json({ ok: true });
    }

    case 'leaders': {
      const col = BOARDS[body.board] ?? 'power';
      const { data: top, error } = await db
        .from('players')
        .select(`tg_id, nick, avatar, frame, level, vip_points, ${col}`)
        .order(col, { ascending: false })
        .limit(100);
      if (error) return json({ error: 'db' }, 500);
      const { data: me } = await db.from('players').select(col).eq('tg_id', user.id).maybeSingle();
      let rank: number | null = null;
      if (me) {
        const { count } = await db.from('players').select('tg_id', { count: 'exact', head: true }).gt(col, (me as Record<string, number>)[col]);
        rank = (count ?? 0) + 1;
      }
      return json({
        list: (top ?? []).map((r: Record<string, unknown>) => ({
          me: r.tg_id === user.id,
          nick: r.nick,
          avatar: r.avatar,
          frame: r.frame,
          level: r.level,
          vip: r.vip_points,
          value: r[col],
        })),
        rank,
      });
    }

    case 'ping':
      return json({ ok: true, id: user.id });

    default:
      return json({ error: 'action' }, 400);
  }
});
