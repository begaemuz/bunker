-- Игроки: прогресс и данные для таблицы лидеров.
create table if not exists public.players (
  tg_id        bigint primary key,
  username     text,
  nick         text not null default '',
  avatar       int  not null default 0,
  frame        text not null default 'steel',
  level        int  not null default 1,
  power        int  not null default 0,
  bosses       int  not null default 0,
  vip_points   int  not null default 0,
  save         jsonb,
  save_updated bigint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists players_power_idx  on public.players (power desc);
create index if not exists players_level_idx  on public.players (level desc);
create index if not exists players_bosses_idx on public.players (bosses desc);

-- Доступ только через серверную функцию (ключ service_role), напрямую из браузера — нельзя.
alter table public.players enable row level security;
