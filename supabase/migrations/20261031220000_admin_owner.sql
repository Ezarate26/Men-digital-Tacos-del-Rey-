-- Dashboard del propietario.
-- Ejecutar después de 20261031190000_public_menu.sql.
-- Esta migración no queda aplicada hasta correrla en Supabase.
--
-- El rol owner se comprueba en la base. El visitante del menú no puede
-- editar carta, mesas, meseros ni estadísticas. El WhatsApp de un mesero
-- vive en public.waiters y no tiene permiso de lectura pública.

alter table public.profiles
  add column if not exists email text not null default '';

alter table public.restaurant_settings
  add column if not exists display_name text not null default 'Tacos del Rey',
  add column if not exists tagline text not null default 'TAQUERÍA',
  add column if not exists logo_url text,
  add column if not exists public_site_url text;

alter table public.menu_sections
  add column if not exists image_url text;

alter table public.products
  add column if not exists is_featured boolean not null default false;

create table if not exists public.waiters (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 80),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,15}$'),
  is_active boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.attention_requests
  add column if not exists assigned_waiter_id uuid references public.waiters (id) on delete set null;

create table if not exists public.menu_visits (
  id uuid primary key default gen_random_uuid(),
  visited_at timestamptz not null default now(),
  table_code text check (table_code is null or table_code ~ '^[A-Za-z0-9-]{1,12}$')
);

create index if not exists menu_visits_visited_at_idx
  on public.menu_visits (visited_at desc);

create index if not exists attention_requests_waiter_idx
  on public.attention_requests (assigned_waiter_id);

update public.profiles as profiles
set email = users.email
from auth.users as users
where profiles.id = users.id
  and profiles.email = ''
  and users.email is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  );
$$;

revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

create or replace function public.set_profile_role(
  target_id uuid,
  next_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role public.app_role;
  owner_count integer;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select profiles.role
  into current_role
  from public.profiles as profiles
  where profiles.id = target_id;

  if current_role is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if current_role = 'owner' and next_role <> 'owner' then
    select count(*)
    into owner_count
    from public.profiles
    where role = 'owner';

    if owner_count <= 1 then
      raise exception 'last_owner' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles
  set role = next_role
  where id = target_id;
end;
$$;

revoke all on function public.set_profile_role(uuid, public.app_role) from public, anon;
grant execute on function public.set_profile_role(uuid, public.app_role) to authenticated;

create or replace function public.record_menu_visit(p_table_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if p_table_code is not null and p_table_code ~ '^[A-Za-z0-9-]{1,12}$' then
    if exists (
      select 1
      from public.dining_tables
      where code = p_table_code
        and is_active = true
    ) then
      v_code := p_table_code;
    end if;
  end if;

  insert into public.menu_visits (table_code)
  values (v_code);
end;
$$;

revoke all on function public.record_menu_visit(text) from public;
grant execute on function public.record_menu_visit(text) to anon, authenticated;

create or replace function public.owner_dashboard_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  local_now timestamp;
  today_start timestamptz;
  week_start timestamptz;
  month_start timestamptz;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  local_now := timezone('America/Mexico_City', pg_catalog.now());
  today_start := date_trunc('day', local_now) at time zone 'America/Mexico_City';
  week_start := (date_trunc('day', local_now) - interval '6 days') at time zone 'America/Mexico_City';
  month_start := date_trunc('month', local_now) at time zone 'America/Mexico_City';

  return jsonb_build_object(
    'visits_total', (select count(*) from public.menu_visits),
    'visits_today', (select count(*) from public.menu_visits where visited_at >= today_start),
    'visits_week', (select count(*) from public.menu_visits where visited_at >= week_start),
    'visits_month', (select count(*) from public.menu_visits where visited_at >= month_start),
    'visits_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', to_char(day_row.day, 'YYYY-MM-DD'),
        'total', day_row.total
      ) order by day_row.day), '[]'::jsonb)
      from (
        select days.day::date as day, count(visits.id) as total
        from generate_series(
          (local_now::date - 6),
          local_now::date,
          interval '1 day'
        ) as days (day)
        left join public.menu_visits as visits
          on timezone('America/Mexico_City', visits.visited_at)::date = days.day::date
        group by days.day
      ) as day_row
    ),
    'attention_pending', (select count(*) from public.attention_requests where status = 'pending'),
    'attention_assigned', (select count(*) from public.attention_requests where status = 'assigned'),
    'attention_resolved', (select count(*) from public.attention_requests where status = 'resolved'),
    'attention_total', (select count(*) from public.attention_requests),
    'active_tables', (select count(*) from public.dining_tables where is_active = true),
    'active_products', (select count(*) from public.products where is_active = true),
    'active_sections', (select count(*) from public.menu_sections where is_active = true)
  );
end;
$$;

revoke all on function public.owner_dashboard_counts() from public, anon;
grant execute on function public.owner_dashboard_counts() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'waiters_set_updated_at'
      and tgrelid = 'public.waiters'::regclass
  ) then
    create trigger waiters_set_updated_at
    before update on public.waiters
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

alter table public.waiters enable row level security;
alter table public.menu_visits enable row level security;

revoke all on table public.waiters from public, anon, authenticated;
revoke all on table public.menu_visits from public, anon, authenticated;

grant select, insert, update, delete on table public.waiters to authenticated;
grant select on table public.menu_visits to authenticated;

grant insert, update, delete on table public.menu_sections to authenticated;
grant insert, update, delete on table public.products to authenticated;
grant insert, update, delete on table public.dining_tables to authenticated;
grant update on table public.restaurant_settings to authenticated;
grant select, update on table public.attention_requests to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Owners read profiles'
  ) then
    create policy "Owners read profiles"
    on public.profiles
    for select
    to authenticated
    using (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'menu_sections' and policyname = 'Owners manage sections'
  ) then
    create policy "Owners manage sections"
    on public.menu_sections
    for all
    to authenticated
    using (public.is_owner())
    with check (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'Owners manage products'
  ) then
    create policy "Owners manage products"
    on public.products
    for all
    to authenticated
    using (public.is_owner())
    with check (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dining_tables' and policyname = 'Owners manage tables'
  ) then
    create policy "Owners manage tables"
    on public.dining_tables
    for all
    to authenticated
    using (public.is_owner())
    with check (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restaurant_settings' and policyname = 'Owners update settings'
  ) then
    create policy "Owners update settings"
    on public.restaurant_settings
    for update
    to authenticated
    using (public.is_owner())
    with check (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attention_requests' and policyname = 'Owners read attention requests'
  ) then
    create policy "Owners read attention requests"
    on public.attention_requests
    for select
    to authenticated
    using (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attention_requests' and policyname = 'Owners update attention requests'
  ) then
    create policy "Owners update attention requests"
    on public.attention_requests
    for update
    to authenticated
    using (public.is_owner())
    with check (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'waiters' and policyname = 'Owners manage waiters'
  ) then
    create policy "Owners manage waiters"
    on public.waiters
    for all
    to authenticated
    using (public.is_owner())
    with check (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'menu_visits' and policyname = 'Owners read menu visits'
  ) then
    create policy "Owners read menu visits"
    on public.menu_visits
    for select
    to authenticated
    using (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Owners insert menu images'
  ) then
    create policy "Owners insert menu images"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'menu' and public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Owners update menu images'
  ) then
    create policy "Owners update menu images"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'menu' and public.is_owner())
    with check (bucket_id = 'menu' and public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Owners delete menu images'
  ) then
    create policy "Owners delete menu images"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'menu' and public.is_owner());
  end if;
end
$$;

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'menu';
