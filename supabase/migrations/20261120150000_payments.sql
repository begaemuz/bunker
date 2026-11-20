-- Оплата звёздами Telegram: кристаллы и очки VIP приходят посылкой.
alter table public.deliveries drop constraint if exists deliveries_kind_check;
alter table public.deliveries add constraint deliveries_kind_check check (kind in ('crystals', 'lot', 'vip'));

create table if not exists public.payments (
  charge_id text primary key,
  tg_id bigint not null,
  pack text not null,
  stars int not null,
  crystals int not null,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments (tg_id);
alter table public.payments enable row level security;
grant select, insert, update, delete on public.payments to service_role;
