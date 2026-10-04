-- CLONE persistent state: run once in the Supabase SQL editor (or `supabase db push`).
-- Mirrors memcoinz `preset-seats/supabase/schema.sql`: versioned jsonb documents,
-- RLS ON with NO policies, so the anon/public key can't touch these tables.
-- Only the server (SUPABASE_SERVICE_ROLE_KEY, never exposed to the browser) reads/writes.

-- The city: one row (id = 'city') holding summons, the Overheard feed and
-- speech/awake bookkeeping. src/lib/clone-store.ts
create table if not exists public.clone_city (
  id          text primary key,
  data        jsonb not null,
  version     integer not null default 0, -- optimistic concurrency: every write bumps it
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The $CLONE guest list: one row per mint (the seats, waitlist, batches…).
-- Same table the memcoinz seats preset uses. src/lib/seats/store.ts
create table if not exists public.seat_coins (
  mint        text primary key,
  data        jsonb not null,
  version     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.clone_city enable row level security;
alter table public.seat_coins enable row level security;

create index if not exists seat_coins_created_at on public.seat_coins (created_at desc);
