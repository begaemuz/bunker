// Серверная функция игры: вход через Telegram, сохранения, таблица лидеров, аукцион.
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

// ═════ Оплата звёздами ═════
/** Наборы кристаллов (должны совпадать с игрой). Очки VIP = звёзды. */
const PACKS: Record<string, { crystals: number; stars: number }> = {
  c60: { crystals: 60, stars: 50 },
  c300: { crystals: 330, stars: 250 },
  c650: { crystals: 750, stars: 500 },
  c1400: { crystals: 1700, stars: 1000 },
  c3000: { crystals: 3900, stars: 2000 },
};

const tg = (method: string, body: unknown) =>
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

/** Секрет вебхука выводится из токена бота: снаружи его не узнать. */
async function webhookSecret(): Promise<string> {
  return hex(await hmac(new TextEncoder().encode('bunker-webhook'), BOT_TOKEN)).slice(0, 48);
}

/** Обновления от Telegram: подтверждение и зачисление оплаты. */
async function handleWebhook(req: Request): Promise<Response> {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== (await webhookSecret())) return new Response('forbidden', { status: 403 });
  const u = await req.json().catch(() => ({}));
  const q = u.pre_checkout_query;
  if (q) {
    let ok = false;
    try {
      const pl = JSON.parse(q.invoice_payload);
      ok = !!PACKS[pl.p] && PACKS[pl.p].stars === q.total_amount && q.currency === 'XTR' && pl.u === q.from.id;
    } catch {
      ok = false;
    }
    await tg('answerPreCheckoutQuery', ok ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: 'Набор недоступен, попробуйте ещё раз' });
    return new Response('ok');
  }
  const pay = u.message?.successful_payment;
  if (pay) {
    const userId = u.message.from.id;
    let pack = '';
    try {
      pack = JSON.parse(pay.invoice_payload).p;
    } catch {
      pack = '';
    }
    const def = PACKS[pack];
    if (def) {
      // charge_id уникален — повторное уведомление не начислит дважды
      const { error } = await db.from('payments').insert({ charge_id: pay.telegram_payment_charge_id, tg_id: userId, pack, stars: pay.total_amount, crystals: def.crystals });
      if (!error) {
        await db.from('deliveries').insert([
          { tg_id: userId, kind: 'crystals', amount: def.crystals, note: `Покупка: ${def.crystals} кристаллов` },
          { tg_id: userId, kind: 'vip', amount: pay.total_amount, note: `+${pay.total_amount} очков VIP` },
        ]);
        const { data: me } = await db.from('players').select('vip_points').eq('tg_id', userId).maybeSingle();
        if (me) await db.from('players').update({ vip_points: Number(me.vip_points ?? 0) + pay.total_amount }).eq('tg_id', userId);
      }
    }
  }
  return new Response('ok');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  if (new URL(req.url).searchParams.get('webhook') !== null) return handleWebhook(req);
  // Время сервера — без входа: по нему у всех одинаково наступают новые сутки.
  if (new URL(req.url).searchParams.get('time') !== null) return json({ now: Date.now() });

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

    // ═════ Аукцион за кристаллы ═════
    case 'auction_list': {
      await db.rpc('auction_settle');
      const cols = 'id, seller, seller_nick, kind, payload, name, rarity, category, quality, start_price, buyout, bid, bidder, bidder_nick, bids, ends_at, status';
      const [market, mine, bids] = await Promise.all([
        db.from('lots').select(cols).eq('status', 'open').neq('seller', user.id).order('ends_at', { ascending: true }).limit(200),
        db.from('lots').select(cols).eq('seller', user.id).order('created_at', { ascending: false }).limit(30),
        db.from('lots').select(cols).eq('bidder', user.id).eq('status', 'open').limit(50),
      ]);
      if (market.error || mine.error || bids.error) return json({ error: 'db' }, 500);
      const pub = (r: Record<string, unknown>) => ({
        id: r.id,
        kind: r.kind,
        payload: r.payload,
        sellerNick: r.seller_nick,
        start: r.start_price,
        buyout: r.buyout,
        bid: r.bid,
        bids: r.bids,
        leading: r.bidder === user.id,
        bidderNick: r.bidder_nick,
        endsAt: r.ends_at,
        status: r.status,
        mine: r.seller === user.id,
      });
      return json({ market: (market.data ?? []).map(pub), mine: (mine.data ?? []).map(pub), bids: (bids.data ?? []).map(pub), fee: 0.1 });
    }

    case 'auction_create': {
      const kind = ['item', 'part', 'res'].includes(body.kind) ? (body.kind as string) : null;
      const payload = body.payload;
      const start = Math.floor(Number(body.start) || 0);
      const buyout = Math.floor(Number(body.buyout) || 0);
      const hours = [12, 24, 48].includes(Number(body.hours)) ? Number(body.hours) : 24;
      if (!kind || !payload || typeof payload !== 'object') return json({ error: 'bad' }, 400);
      if (start < 1 || buyout <= start || buyout > 1_000_000) return json({ error: 'price' }, 400);
      if (JSON.stringify(payload).length > 50_000) return json({ error: 'too_big' }, 413);
      const { count } = await db.from('lots').select('id', { count: 'exact', head: true }).eq('seller', user.id).eq('status', 'open');
      if ((count ?? 0) >= 5) return json({ error: 'limit' });
      const RES_NAMES: Record<string, string> = { skillResets: 'Сброс навыков' };
      const main =
        kind === 'item'
          ? payload.item
          : kind === 'part'
            ? payload.part
            : RES_NAMES[payload.res] && Number(payload.amount) === 1
              ? { name: RES_NAMES[payload.res], rarity: 'legendary' }
              : null;
      if (!main || typeof main !== 'object') return json({ error: 'bad' }, 400);
      const { data: me } = await db.from('players').select('nick').eq('tg_id', user.id).maybeSingle();
      const { data, error } = await db
        .from('lots')
        .insert({
          seller: user.id,
          seller_nick: String(me?.nick || user.first_name || 'Инженер').slice(0, 16),
          kind,
          payload,
          name: String(main.name ?? '').slice(0, 60),
          rarity: String(main.rarity ?? 'common').slice(0, 16),
          category: kind === 'item' ? String(main.category ?? '').slice(0, 16) : kind,
          quality: Math.max(0, Math.min(1, Number(body.quality) || 0)),
          start_price: start,
          buyout,
          ends_at: new Date(Date.now() + hours * 3600_000).toISOString(),
        })
        .select('id')
        .single();
      if (error) return json({ error: 'db' }, 500);
      return json({ ok: true, id: data.id });
    }

    case 'auction_bid': {
      const amount = Math.floor(Number(body.amount) || 0);
      if (amount < 1) return json({ error: 'bad' }, 400);
      const { data: me } = await db.from('players').select('nick').eq('tg_id', user.id).maybeSingle();
      const { data, error } = await db.rpc('auction_bid', {
        p_lot: Number(body.id),
        p_user: user.id,
        p_nick: String(me?.nick || user.first_name || 'Инженер').slice(0, 16),
        p_amount: amount,
      });
      if (error) return json({ error: 'db' }, 500);
      return json({ result: data });
    }

    case 'auction_cancel': {
      const { data, error } = await db.rpc('auction_cancel', { p_lot: Number(body.id), p_user: user.id });
      if (error) return json({ error: 'db' }, 500);
      return json({ result: data });
    }

    case 'deliveries': {
      await db.rpc('auction_settle');
      const { data, error } = await db.rpc('claim_deliveries', { p_user: user.id });
      if (error) return json({ error: 'db' }, 500);
      return json({
        list: (data ?? []).map((d: Record<string, unknown>) => ({ id: d.id, kind: d.kind, amount: d.amount, payload: d.payload, note: d.note })),
      });
    }

    case 'invoice': {
      const def = PACKS[String(body.pack)];
      if (!def) return json({ error: 'pack' }, 400);
      const r = await tg('createInvoiceLink', {
        title: `${def.crystals} кристаллов`,
        description: `Кристаллы для BUNKER: LAST SIGNAL и +${def.stars} очков VIP`,
        payload: JSON.stringify({ u: user.id, p: body.pack, n: crypto.randomUUID().slice(0, 8) }),
        currency: 'XTR',
        prices: [{ label: `${def.crystals} кристаллов`, amount: def.stars }],
      });
      if (!r.ok) return json({ error: 'telegram', detail: r.description }, 502);
      return json({ link: r.result });
    }

    case 'ping':
      return json({ ok: true, id: user.id });

    default:
      return json({ error: 'action' }, 400);
  }
});
