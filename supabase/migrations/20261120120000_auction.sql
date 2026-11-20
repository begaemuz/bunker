-- Права серверной роли (без них функция не могла сохранять игроков).
grant usage on schema public to service_role;
grant select, insert, update, delete on public.players to service_role;

-- ═════ Аукцион за кристаллы ═════

-- Лоты: вещь или модификация лежит здесь, пока лот не закрыт.
create table if not exists public.lots (
  id bigserial primary key,
  seller bigint not null,
  seller_nick text not null default '',
  kind text not null check (kind in ('item', 'part', 'res')),
  payload jsonb not null,
  name text not null default '',
  rarity text not null default 'common',
  category text,
  quality real not null default 0,
  start_price int not null check (start_price >= 1),
  buyout int not null,
  bid int,
  bidder bigint,
  bidder_nick text,
  bids int not null default 0,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'sold', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists lots_open_idx on public.lots (status, ends_at);
create index if not exists lots_seller_idx on public.lots (seller, status);
create index if not exists lots_bidder_idx on public.lots (bidder, status);

-- Посылки игроку: кристаллы, выигранные вещи, возвраты.
create table if not exists public.deliveries (
  id bigserial primary key,
  tg_id bigint not null,
  kind text not null check (kind in ('crystals', 'lot')),
  amount int not null default 0,
  payload jsonb,
  note text not null default '',
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index if not exists deliveries_user_idx on public.deliveries (tg_id) where claimed_at is null;

alter table public.lots enable row level security;
alter table public.deliveries enable row level security;
grant select, insert, update, delete on public.lots, public.deliveries to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Комиссия аукциона — 10%.
create or replace function public.auction_fee(price int) returns int
language sql immutable as $$ select greatest(0, floor(price * 0.10))::int $$;

-- Закрывает истёкшие лоты: победителю — вещь, продавцу — кристаллы, без ставок — вещь назад.
create or replace function public.auction_settle() returns int
language plpgsql security definer set search_path = public as $$
declare
  l record;
  n int := 0;
begin
  for l in select * from lots where status = 'open' and ends_at <= now() for update skip locked loop
    if l.bidder is not null then
      update lots set status = 'sold', closed_at = now() where id = l.id;
      insert into deliveries (tg_id, kind, payload, note) values (l.bidder, 'lot', l.payload, 'Выигран лот: ' || l.name);
      insert into deliveries (tg_id, kind, amount, note) values (l.seller, 'crystals', l.bid - auction_fee(l.bid), 'Продан лот: ' || l.name);
    else
      update lots set status = 'expired', closed_at = now() where id = l.id;
      insert into deliveries (tg_id, kind, payload, note) values (l.seller, 'lot', l.payload, 'Не продан, возвращён: ' || l.name);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Ставка или выкуп. Возвращает 'ok', 'sold' (выкуплен) или код ошибки.
create or replace function public.auction_bid(p_lot bigint, p_user bigint, p_nick text, p_amount int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  l record;
  min_bid int;
begin
  select * into l from lots where id = p_lot for update;
  if not found then return 'not_found'; end if;
  if l.status <> 'open' or l.ends_at <= now() then return 'closed'; end if;
  if l.seller = p_user then return 'own'; end if;
  if l.bidder = p_user then return 'leading'; end if;
  min_bid := case when l.bid is null then l.start_price else l.bid + greatest(1, ceil(l.bid * 0.05)::int) end;

  -- Выкуп: платим ровно цену выкупа, лот сразу закрывается.
  if p_amount >= l.buyout then
    if l.bidder is not null then
      insert into deliveries (tg_id, kind, amount, note) values (l.bidder, 'crystals', l.bid, 'Ставка перебита: ' || l.name);
    end if;
    update lots set bid = l.buyout, bidder = p_user, bidder_nick = p_nick, bids = bids + 1, status = 'sold', closed_at = now() where id = l.id;
    insert into deliveries (tg_id, kind, payload, note) values (p_user, 'lot', l.payload, 'Выкуплен лот: ' || l.name);
    insert into deliveries (tg_id, kind, amount, note) values (l.seller, 'crystals', l.buyout - auction_fee(l.buyout), 'Выкуплен лот: ' || l.name);
    return 'sold';
  end if;

  if p_amount < min_bid then return 'low'; end if;
  if l.bidder is not null then
    insert into deliveries (tg_id, kind, amount, note) values (l.bidder, 'crystals', l.bid, 'Ставка перебита: ' || l.name);
  end if;
  -- Ставка в последние 2 минуты продлевает торги, чтобы не было «снайперов».
  update lots set bid = p_amount, bidder = p_user, bidder_nick = p_nick, bids = bids + 1,
    ends_at = greatest(ends_at, now() + interval '2 minutes') where id = l.id;
  return 'ok';
end $$;

-- Снять лот можно, пока на него нет ставок: вещь возвращается посылкой.
create or replace function public.auction_cancel(p_lot bigint, p_user bigint) returns text
language plpgsql security definer set search_path = public as $$
declare
  l record;
begin
  select * into l from lots where id = p_lot for update;
  if not found or l.seller <> p_user then return 'not_found'; end if;
  if l.status <> 'open' then return 'closed'; end if;
  if l.bidder is not null then return 'has_bids'; end if;
  update lots set status = 'cancelled', closed_at = now() where id = l.id;
  insert into deliveries (tg_id, kind, payload, note) values (p_user, 'lot', l.payload, 'Снят с аукциона: ' || l.name);
  return 'ok';
end $$;

-- Забрать посылки: помечаются полученными одним запросом.
create or replace function public.claim_deliveries(p_user bigint)
returns setof public.deliveries
language sql security definer set search_path = public as $$
  update deliveries set claimed_at = now() where tg_id = p_user and claimed_at is null returning *;
$$;

revoke all on function public.auction_settle(), public.auction_bid(bigint, bigint, text, int),
  public.auction_cancel(bigint, bigint), public.claim_deliveries(bigint) from public, anon, authenticated;
grant execute on function public.auction_settle(), public.auction_bid(bigint, bigint, text, int),
  public.auction_cancel(bigint, bigint), public.claim_deliveries(bigint), public.auction_fee(int) to service_role;

-- Новые таблицы сразу доступны серверной роли.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
