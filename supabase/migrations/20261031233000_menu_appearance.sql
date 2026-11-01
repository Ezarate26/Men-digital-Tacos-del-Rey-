-- Apariencia del menú por negocio.
-- Ejecutar después de 20261031220000_admin_owner.sql.
-- El visitante solo puede leer la versión publicada, mediante published_menu_theme.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  constraint businesses_slug_format check (slug ~ '^[a-z0-9-]{2,48}$'),
  constraint businesses_name_not_blank check (length(btrim(name)) > 0)
);

create table if not exists public.menu_themes (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  draft jsonb not null,
  published jsonb not null,
  previous_published jsonb,
  publish_immediately boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint menu_themes_draft_object check (jsonb_typeof(draft) = 'object'),
  constraint menu_themes_published_object check (jsonb_typeof(published) = 'object'),
  constraint menu_themes_previous_object check (
    previous_published is null or jsonb_typeof(previous_published) = 'object'
  )
);

insert into public.businesses (slug, name)
values ('tacos-del-rey', 'Tacos del Rey')
on conflict (slug) do nothing;

insert into public.menu_themes (business_id, draft, published, publish_immediately)
select business.id, payload.theme, payload.theme, false
from public.businesses as business
cross join lateral (
  select jsonb_build_object(
    'content', jsonb_build_object(
      'businessName', coalesce(settings.display_name, 'Tacos del Rey'),
      'slogan', '',
      'welcomeMessage', '',
      'headerText', coalesce(settings.tagline, 'Taquería'),
      'contact', '',
      'hours', '',
      'address', '',
      'attentionButton', 'ESTOY LISTO PARA ORDENAR'
    ),
    'images', jsonb_build_object(
      'logoUrl', settings.logo_url,
      'heroUrl', null,
      'bannerUrl', null,
      'coverUrl', null
    ),
    'colors', jsonb_build_object(
      'background', '#101010',
      'primary', '#c9a45c',
      'secondary', '#e4c783',
      'button', '#c9a45c',
      'text', '#f5f0e6'
    ),
    'typography', jsonb_build_object(
      'font', 'neutral',
      'titleSize', 'md'
    ),
    'shape', jsonb_build_object(
      'radius', 'md',
      'border', 'thin',
      'shadow', 'strong',
      'cardStyle', 'elevated',
      'spacing', 'regular'
    )
  ) as theme
  from public.restaurant_settings as settings
  where settings.id = 1
) as payload
where business.slug = 'tacos-del-rey'
on conflict (business_id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'menu_themes_set_updated_at'
      and tgrelid = 'public.menu_themes'::regclass
  ) then
    create trigger menu_themes_set_updated_at
    before update on public.menu_themes
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

create or replace function public.published_menu_theme(business_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select themes.published
  from public.menu_themes as themes
  join public.businesses as businesses on businesses.id = themes.business_id
  where businesses.slug = $1
    and $1 ~ '^[a-z0-9-]{2,48}$'
$$;

revoke all on function public.published_menu_theme(text) from public;
grant execute on function public.published_menu_theme(text) to anon, authenticated;

alter table public.businesses enable row level security;
alter table public.menu_themes enable row level security;

revoke all on table public.businesses from public, anon, authenticated;
revoke all on table public.menu_themes from public, anon, authenticated;

grant select on table public.businesses to authenticated;
grant select, update on table public.menu_themes to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'businesses' and policyname = 'Owners read businesses'
  ) then
    create policy "Owners read businesses"
    on public.businesses
    for select
    to authenticated
    using (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'menu_themes' and policyname = 'Owners read menu themes'
  ) then
    create policy "Owners read menu themes"
    on public.menu_themes
    for select
    to authenticated
    using (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'menu_themes' and policyname = 'Owners update menu themes'
  ) then
    create policy "Owners update menu themes"
    on public.menu_themes
    for update
    to authenticated
    using (public.is_owner())
    with check (public.is_owner());
  end if;
end;
$$;
