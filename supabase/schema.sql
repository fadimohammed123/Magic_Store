-- =====================================================================
-- MAGIC: Supabase schema
-- Run this whole file once in: Supabase Dashboard > SQL Editor > New query
-- It is safe to re-run: every statement is idempotent.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Admins: users listed here may open /admin and read/write everything.
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- products
-- kind = 'jersey'   -> drawn from colors[1] (base) and colors[2] (trim)
-- kind = 'artifact' -> drawn from art_key: spool | pendant | patch
-- image_url (optional) overrides the drawn art with real photography.
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  subtitle     text not null default '',
  description  text not null default '',
  kind         text not null check (kind in ('jersey', 'artifact')),
  price_cents  integer not null check (price_cents >= 0),
  currency     text not null default 'usd',
  colors       text[] not null default '{}',
  art_key      text,
  image_url    text,
  sizes        text[] not null default '{}',
  stock        integer not null default 0 check (stock >= 0),
  active       boolean not null default true,
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- orders: a 'pending' row is created when Checkout starts; the Stripe
-- webhook flips it to 'paid' and fills in customer + shipping details.
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  status                text not null default 'pending'
                          check (status in ('pending', 'paid', 'fulfilled', 'refunded', 'cancelled')),
  stripe_session_id     text unique,
  stripe_payment_intent text,
  email                 text,
  name                  text,
  shipping              jsonb,
  amount_subtotal       integer not null default 0,
  amount_shipping       integer not null default 0,
  amount_total          integer not null default 0,
  currency              text not null default 'usd',
  created_at            timestamptz not null default now(),
  paid_at               timestamptz,
  updated_at            timestamptz not null default now()
);

create index if not exists orders_status_created_idx on public.orders (status, created_at desc);

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  title        text not null,
  size         text not null default 'OS',
  quantity     integer not null check (quantity > 0),
  unit_amount  integer not null check (unit_amount >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------
-- mending_requests
-- ---------------------------------------------------------------------
create table if not exists public.mending_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 254),
  piece       text not null check (char_length(piece) between 1 and 120),
  note        text not null check (char_length(note) between 1 and 2000),
  status      text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists mending_touch on public.mending_requests;
create trigger mending_touch before update on public.mending_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- subscribers (First Thread list). One row per email, case-insensitive.
-- ---------------------------------------------------------------------
create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (char_length(email) between 3 and 254),
  source      text not null default 'footer',
  created_at  timestamptz not null default now()
);

create unique index if not exists subscribers_email_uidx on public.subscribers (lower(email));

-- ---------------------------------------------------------------------
-- Stock decrement, called by the Stripe webhook (service role only).
-- ---------------------------------------------------------------------
create or replace function public.decrement_stock(p_id uuid, p_qty integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products set stock = greatest(stock - p_qty, 0) where id = p_id;
$$;

revoke all on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;

-- ---------------------------------------------------------------------
-- Row Level Security
--   Public (anon):  can only READ active products.
--   Public writes (orders, mending, subscribers) go through server actions
--   that use the service role, so there are deliberately NO public insert policies.
--   Admins:         full access to everything.
-- ---------------------------------------------------------------------
alter table public.admins           enable row level security;
alter table public.products         enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.mending_requests enable row level security;
alter table public.subscribers      enable row level security;

drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins
  for select using (user_id = auth.uid());

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products
  for select using (active = true);

drop policy if exists "admin all products" on public.products;
create policy "admin all products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all orders" on public.orders;
create policy "admin all orders" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all order_items" on public.order_items;
create policy "admin all order_items" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all mending" on public.mending_requests;
create policy "admin all mending" on public.mending_requests
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all subscribers" on public.subscribers;
create policy "admin all subscribers" on public.subscribers
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Realtime: lets the Admin Studio update live. Realtime respects RLS, so
-- only signed-in admins receive these changes.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['orders', 'order_items', 'mending_requests', 'subscribers', 'products']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Seed: the launch collection. Edit freely in Admin Studio afterwards.
-- ---------------------------------------------------------------------
insert into public.products (slug, title, subtitle, description, kind, price_cents, colors, art_key, sizes, stock, sort) values
  ('jersey-no-01', 'Jersey No. 01', 'Soot, bone trim',
   'Heavyweight brushed jersey, garment-dyed in soot. The print is meant to crack.',
   'jersey', 28500, '{#10131f,#E9E2D3}', null, '{S,M,L,XL,XXL}', 40, 1),
  ('jersey-no-02', 'Jersey No. 02', 'Ash, soot trim',
   'A faded start. Washed and sun-bleached before it ever reaches you.',
   'jersey', 28500, '{#6f7482,#10131f}', null, '{S,M,L,XL,XXL}', 40, 2),
  ('jersey-no-03', 'Jersey No. 03', 'Bone, thread trim',
   'Undyed bone with red thread trim. It will take on whatever you do in it.',
   'jersey', 31000, '{#E9E2D3,#F04A2E}', null, '{S,M,L,XL,XXL}', 25, 3),
  ('thread-spool', 'Thread spool', 'Iron flanges, waxed red cord',
   'Forty meters of waxed red cord on a machined iron spool.',
   'artifact', 6400, '{}', 'spool', '{}', 100, 4),
  ('bare-branch-pendant', 'Bare branch pendant', 'Oxidized silver',
   'Our tree, cast in oxidized silver. It darkens where you touch it.',
   'artifact', 18000, '{}', 'pendant', '{}', 60, 5),
  ('weave-patch-set', 'Weave patch set', 'Woven, hand-stitched',
   'Three woven patches with a red running stitch. Sew them on or leave them loose.',
   'artifact', 4800, '{}', 'patch', '{}', 150, 6)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- AFTER creating your admin user in Authentication > Users, run:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@yourdomain.com';
-- ---------------------------------------------------------------------
