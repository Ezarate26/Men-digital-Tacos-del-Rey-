-- Menú público, mesas y solicitudes de atención.
-- Esta migración no está aplicada hasta que se ejecute en Supabase,
-- después de 20261031180000_initial_profiles.sql.
--
-- El visitante anónimo solo puede leer la carta, las mesas activas y
-- si el comedor está recibiendo órdenes. No puede cambiar precios,
-- secciones, fotografías ni roles.
-- El llamado al mesero entra solo por request_waiter_attention.

do $$
begin
  if not exists (
    select 1
    from pg_type as t
    join pg_namespace as n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'attention_status'
  ) then
    create type public.attention_status as enum (
      'pending',
      'assigned',
      'resolved'
    );
  end if;
end
$$;

create table if not exists public.restaurant_settings (
  id smallint primary key default 1 check (id = 1),
  menu_available boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.menu_sections (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '',
  price_cents integer not null check (price_cents >= 0 and price_cents <= 10000000),
  image_url text check (image_url is null or char_length(image_url) <= 2000),
  is_available boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Za-z0-9-]{1,12}$'),
  label text not null check (char_length(btrim(label)) between 1 and 40),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attention_requests (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.dining_tables (id) on delete cascade,
  waiter_id uuid references public.profiles (id) on delete set null,
  status public.attention_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists products_section_order_idx
  on public.products (section_id, sort_order);

create index if not exists menu_sections_public_order_idx
  on public.menu_sections (is_active, sort_order);

create index if not exists attention_requests_pending_idx
  on public.attention_requests (table_id, created_at desc)
  where status = 'pending';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'menu_sections_set_updated_at'
      and tgrelid = 'public.menu_sections'::regclass
  ) then
    create trigger menu_sections_set_updated_at
    before update on public.menu_sections
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'products_set_updated_at'
      and tgrelid = 'public.products'::regclass
  ) then
    create trigger products_set_updated_at
    before update on public.products
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'dining_tables_set_updated_at'
      and tgrelid = 'public.dining_tables'::regclass
  ) then
    create trigger dining_tables_set_updated_at
    before update on public.dining_tables
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'restaurant_settings_set_updated_at'
      and tgrelid = 'public.restaurant_settings'::regclass
  ) then
    create trigger restaurant_settings_set_updated_at
    before update on public.restaurant_settings
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

alter table public.restaurant_settings enable row level security;
alter table public.menu_sections enable row level security;
alter table public.products enable row level security;
alter table public.dining_tables enable row level security;
alter table public.attention_requests enable row level security;

revoke all on table public.restaurant_settings from public, anon, authenticated;
revoke all on table public.menu_sections from public, anon, authenticated;
revoke all on table public.products from public, anon, authenticated;
revoke all on table public.dining_tables from public, anon, authenticated;
revoke all on table public.attention_requests from public, anon, authenticated;

grant select on table public.restaurant_settings to anon, authenticated;
grant select on table public.menu_sections to anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.dining_tables to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_settings'
      and policyname = 'Public reads menu availability'
  ) then
    create policy "Public reads menu availability"
    on public.restaurant_settings
    for select
    to anon, authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'menu_sections'
      and policyname = 'Public reads active sections'
  ) then
    create policy "Public reads active sections"
    on public.menu_sections
    for select
    to anon, authenticated
    using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Public reads visible products'
  ) then
    create policy "Public reads visible products"
    on public.products
    for select
    to anon, authenticated
    using (
      is_active = true
      and exists (
        select 1
        from public.menu_sections as sections
        where sections.id = section_id
          and sections.is_active = true
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dining_tables'
      and policyname = 'Public reads active tables'
  ) then
    create policy "Public reads active tables"
    on public.dining_tables
    for select
    to anon, authenticated
    using (is_active = true);
  end if;
end
$$;

-- Sin políticas de escritura: anon y authenticated no insertan,
-- no editan y no leen solicitudes. El mesero se asigna después
-- desde el dashboard, poniendo waiter_id y status.

create or replace function public.request_waiter_attention(p_table_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table_id uuid;
  v_label text;
  v_menu_available boolean;
  v_existing uuid;
begin
  if p_table_code is null or p_table_code !~ '^[A-Za-z0-9-]{1,12}$' then
    raise exception 'mesa_invalida' using errcode = 'P0001';
  end if;

  select settings.menu_available
  into v_menu_available
  from public.restaurant_settings as settings
  where settings.id = 1;

  if coalesce(v_menu_available, false) is not true then
    raise exception 'menu_no_disponible' using errcode = 'P0001';
  end if;

  select tables.id, tables.label
  into v_table_id, v_label
  from public.dining_tables as tables
  where tables.code = p_table_code
    and tables.is_active = true;

  if v_table_id is null then
    raise exception 'mesa_invalida' using errcode = 'P0001';
  end if;

  select requests.id
  into v_existing
  from public.attention_requests as requests
  where requests.table_id = v_table_id
    and requests.status = 'pending'
    and requests.created_at > pg_catalog.now() - interval '3 minutes'
  order by requests.created_at desc
  limit 1;

  if v_existing is null then
    insert into public.attention_requests (table_id)
    values (v_table_id);
  end if;

  return v_label;
end;
$$;

revoke all on function public.request_waiter_attention(text) from public;
grant execute on function public.request_waiter_attention(text) to anon, authenticated;

insert into public.restaurant_settings (id, menu_available)
values (1, true)
on conflict (id) do nothing;

insert into public.menu_sections (name, slug, sort_order)
values
  ('Especialidades y tacos', 'especialidades-y-tacos', 1),
  ('Bebidas', 'bebidas', 2),
  ('Combos y ofertas', 'combos-y-ofertas', 3),
  ('Postres', 'postres', 4)
on conflict (slug) do nothing;

insert into public.dining_tables (code, label, is_active)
values
  ('01', 'Mesa 01', true),
  ('02', 'Mesa 02', true),
  ('03', 'Mesa 03', true),
  ('99', 'Mesa 99', false)
on conflict (code) do nothing;

insert into storage.buckets (id, name, public)
values ('menu', 'menu', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public reads menu images'
  ) then
    create policy "Public reads menu images"
    on storage.objects
    for select
    to anon, authenticated
    using (bucket_id = 'menu');
  end if;
end
$$;
