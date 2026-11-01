-- Owner único, permisos individuales e invitaciones.
-- Ejecutar después de 20261101120000_collaborator_role.sql, en otra transacción.
-- El alta del propietario se hace en /setup. No insertes un UUID a mano.

alter table public.profiles
  add column if not exists is_active boolean not null default true;

create table if not exists public.owner_registry (
  id smallint primary key default 1,
  user_id uuid not null unique references auth.users (id) on delete restrict,
  claimed_at timestamptz not null default now(),
  constraint owner_registry_singleton check (id = 1)
);

create table if not exists public.permissions (
  key text primary key,
  label text not null,
  description text not null,
  group_name text not null
);

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  permissions text[] not null default '{}',
  status text not null default 'pending',
  invited_by uuid not null references auth.users (id) on delete restrict,
  accepted_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint invitations_status check (status in ('pending', 'accepted', 'expired', 'revoked')),
  constraint invitations_email check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create unique index if not exists invitations_one_pending_email
  on public.invitations (email)
  where status = 'pending';

insert into public.permissions (key, label, description, group_name)
values
  ('dashboard.view', 'Ver resumen', 'Consulta las cifras generales del negocio.', 'Dashboard'),
  ('analytics.view', 'Ver estadísticas', 'Consulta visitas y solicitudes de atención.', 'Estadísticas'),
  ('products.view', 'Ver productos', 'Abre el listado de productos.', 'Productos'),
  ('products.create', 'Crear productos', 'Da de alta platillos.', 'Productos'),
  ('products.update', 'Editar productos', 'Cambia los datos del platillo.', 'Productos'),
  ('products.delete', 'Eliminar productos', 'Borra platillos.', 'Productos'),
  ('products.update_price', 'Cambiar precios', 'Modifica solo el precio.', 'Productos'),
  ('products.update_availability', 'Cambiar disponibilidad', 'Activa o pausa un platillo.', 'Productos'),
  ('products.upload_images', 'Subir fotografías', 'Reemplaza la foto de un platillo.', 'Productos'),
  ('categories.view', 'Ver secciones', 'Abre las secciones del menú.', 'Categorías'),
  ('categories.create', 'Crear secciones', 'Agrega una sección.', 'Categorías'),
  ('categories.update', 'Editar secciones', 'Cambia una sección.', 'Categorías'),
  ('categories.delete', 'Eliminar secciones', 'Borra una sección.', 'Categorías'),
  ('categories.reorder', 'Reordenar secciones', 'Cambia el orden.', 'Categorías'),
  ('branding.view', 'Ver diseño', 'Abre el editor visual.', 'Branding'),
  ('branding.update', 'Editar borrador', 'Guarda sin publicar.', 'Branding'),
  ('branding.publish', 'Publicar diseño', 'Publica la apariencia.', 'Branding'),
  ('menu.view', 'Ver estado del menú', 'Consulta si se reciben órdenes.', 'Menú público'),
  ('menu.publish', 'Publicar disponibilidad', 'Activa o pausa las órdenes.', 'Menú público'),
  ('tables.view', 'Ver mesas', 'Consulta mesas y códigos QR.', 'Mesas y QR'),
  ('tables.create', 'Crear mesas', 'Da de alta una mesa.', 'Mesas y QR'),
  ('tables.update', 'Editar mesas', 'Cambia una mesa.', 'Mesas y QR'),
  ('tables.delete', 'Eliminar mesas', 'Borra una mesa.', 'Mesas y QR'),
  ('tables.manage_qr', 'Administrar QR', 'Descarga e imprime códigos.', 'Mesas y QR'),
  ('users.view', 'Ver colaboradores', 'Consulta la lista, sin administrar accesos.', 'Colaboradores')
on conflict (key) do update
set label = excluded.label,
    description = excluded.description,
    group_name = excluded.group_name;

insert into public.owner_registry (id, user_id)
select 1, profiles.id
from public.profiles as profiles
where profiles.role = 'owner'
order by profiles.created_at asc
limit 1
on conflict (id) do nothing;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.owner_registry as registry
    join public.profiles as profiles on profiles.id = registry.user_id
    where registry.id = 1
      and registry.user_id = auth.uid()
      and profiles.role = 'owner'
      and profiles.is_active = true
  );
$$;

create or replace function public.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner()
    or exists (
      select 1
      from public.user_permissions as grants
      join public.profiles as profiles on profiles.id = grants.user_id
      join public.permissions as catalog on catalog.key = grants.permission_key
      where grants.user_id = auth.uid()
        and grants.permission_key = permission_key
        and profiles.role = 'collaborator'
        and profiles.is_active = true
    );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'owner' and not exists (
    select 1 from public.owner_registry as registry
    where registry.id = 1 and registry.user_id = new.id
  ) then
    raise exception 'owner_protected' using errcode = 'P0001';
  end if;

  if old.role = 'owner' and new.role <> 'owner' and exists (
    select 1 from public.owner_registry as registry
    where registry.id = 1 and registry.user_id = old.id
  ) then
    raise exception 'owner_protected' using errcode = 'P0001';
  end if;

  if old.is_active = true and new.is_active = false and exists (
    select 1 from public.owner_registry as registry
    where registry.id = 1 and registry.user_id = old.id
  ) then
    raise exception 'owner_protected' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'profiles_protect_owner'
      and tgrelid = 'public.profiles'::regclass
  ) then
    create trigger profiles_protect_owner
    before update on public.profiles
    for each row
    execute function public.protect_profile_role();
  end if;
end
$$;

update public.profiles as profiles
set role = 'collaborator'
where profiles.role = 'owner'
  and not exists (
    select 1 from public.owner_registry as registry
    where registry.id = 1 and registry.user_id = profiles.id
  );

create or replace function public.protect_owner_registry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'owner_protected' using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'owner_protected' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' and new.id <> 1 then
    raise exception 'owner_protected' using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'owner_registry_protect'
      and tgrelid = 'public.owner_registry'::regclass
  ) then
    create trigger owner_registry_protect
    before insert or update or delete on public.owner_registry
    for each row
    execute function public.protect_owner_registry();
  end if;
end
$$;

create or replace function public.installation_status()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.owner_registry where id = 1);
$$;

create or replace function public.claim_owner()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmed timestamptz;
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.owner_registry
    where id = 1 and user_id = auth.uid()
  ) then
    return;
  end if;

  select users.email_confirmed_at
  into confirmed
  from auth.users as users
  where users.id = auth.uid();

  if confirmed is null then
    raise exception 'email_not_confirmed' using errcode = 'P0001';
  end if;

  begin
    insert into public.owner_registry (id, user_id)
    values (1, auth.uid());
  exception
    when unique_violation then
      raise exception 'owner_exists' using errcode = 'P0001';
  end;

  update public.profiles
  set role = 'owner', is_active = true
  where id = auth.uid();
end;
$$;

create or replace function public.my_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  active boolean;
  profile_role public.app_role;
begin
  if auth.uid() is null then
    return jsonb_build_object('kind', 'anonymous');
  end if;

  select profiles.is_active, profiles.role
  into active, profile_role
  from public.profiles as profiles
  where profiles.id = auth.uid();

  if public.is_owner() then
    return jsonb_build_object('kind', 'owner');
  end if;

  if active = false then
    return jsonb_build_object('kind', 'revoked');
  end if;

  if profile_role = 'collaborator' then
    return jsonb_build_object(
      'kind', 'collaborator',
      'permissions', coalesce((
        select jsonb_agg(grants.permission_key order by grants.permission_key)
        from public.user_permissions as grants
        where grants.user_id = auth.uid()
      ), '[]'::jsonb)
    );
  end if;

  return jsonb_build_object('kind', 'none');
end;
$$;

create or replace function public.set_profile_role(
  target_id uuid,
  next_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'owner_protected' using errcode = 'P0001';
end;
$$;

create or replace function public.permission_keys_are_valid(keys text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(keys, '{}') <@ coalesce((
    select array_agg(catalog.key) from public.permissions as catalog
  ), '{}');
$$;

create or replace function public.create_invitation(
  p_email text,
  p_name text,
  p_permissions text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := lower(btrim(p_email));
  invitation_id uuid;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  if not public.permission_keys_are_valid(p_permissions) then
    raise exception 'invalid_permissions' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from auth.users as users
    where lower(users.email) = clean_email
      and users.id = auth.uid()
  ) then
    raise exception 'invite_self' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.profiles as profiles
    join auth.users as users on users.id = profiles.id
    where lower(users.email) = clean_email
      and (
        profiles.role = 'owner'
        or (profiles.role = 'collaborator' and profiles.is_active = true)
      )
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.invitations
    where email = clean_email and status = 'pending'
  ) then
    raise exception 'invitation_pending' using errcode = 'P0001';
  end if;

  insert into public.invitations (email, full_name, permissions, status, invited_by, expires_at)
  values (
    clean_email,
    left(btrim(coalesce(p_name, '')), 80),
    coalesce(p_permissions, '{}'),
    'pending',
    auth.uid(),
    pg_catalog.now() + interval '7 days'
  )
  returning id into invitation_id;

  return invitation_id;
end;
$$;

create or replace function public.revoke_invitation(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.invitations
  set status = 'revoked', revoked_at = pg_catalog.now()
  where id = p_id and status = 'pending';

  if not found then
    raise exception 'invitation_missing' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.accept_invitation(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_email text;
  confirmed timestamptz;
  invitation public.invitations%rowtype;
  permission_key text;
begin
  if actor is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select users.email, users.email_confirmed_at
  into actor_email, confirmed
  from auth.users as users
  where users.id = actor;

  if confirmed is null then
    raise exception 'email_not_confirmed' using errcode = 'P0001';
  end if;

  select invitations.*
  into invitation
  from public.invitations as invitations
  where invitations.email = lower(actor_email)
    and invitations.status = 'pending'
  order by invitations.created_at desc
  limit 1;

  if invitation.id is null then
    raise exception 'invitation_missing' using errcode = 'P0001';
  end if;

  if invitation.expires_at < pg_catalog.now() then
    update public.invitations
    set status = 'expired'
    where id = invitation.id and status = 'pending';
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  if not public.permission_keys_are_valid(invitation.permissions) then
    raise exception 'invalid_permissions' using errcode = 'P0001';
  end if;

  update public.profiles
  set
    role = 'collaborator',
    is_active = true,
    full_name = case
      when length(btrim(coalesce(p_name, ''))) > 0 then left(btrim(p_name), 80)
      when length(btrim(invitation.full_name)) > 0 then invitation.full_name
      else full_name
    end
  where id = actor;

  delete from public.user_permissions where user_id = actor;

  foreach permission_key in array invitation.permissions loop
    insert into public.user_permissions (user_id, permission_key)
    values (actor, permission_key);
  end loop;

  update public.invitations
  set status = 'accepted', accepted_by = actor, accepted_at = pg_catalog.now()
  where id = invitation.id;
end;
$$;

create or replace function public.set_collaborator_permissions(
  p_user_id uuid,
  p_permissions text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  permission_key text;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'owner_protected' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'collaborator'
  ) then
    raise exception 'not_collaborator' using errcode = 'P0001';
  end if;

  if not public.permission_keys_are_valid(p_permissions) then
    raise exception 'invalid_permissions' using errcode = 'P0001';
  end if;

  delete from public.user_permissions where user_id = p_user_id;

  foreach permission_key in array coalesce(p_permissions, '{}') loop
    insert into public.user_permissions (user_id, permission_key)
    values (p_user_id, permission_key);
  end loop;
end;
$$;

create or replace function public.revoke_collaborator(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_email text;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() or exists (
    select 1 from public.owner_registry where id = 1 and user_id = p_user_id
  ) then
    raise exception 'owner_protected' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles where id = p_user_id and role = 'collaborator'
  ) then
    raise exception 'not_collaborator' using errcode = 'P0001';
  end if;

  update public.profiles
  set is_active = false
  where id = p_user_id;

  select lower(users.email) into target_email
  from auth.users as users
  where users.id = p_user_id;

  update public.invitations
  set status = 'revoked', revoked_at = pg_catalog.now()
  where status = 'pending' and email = target_email;
end;
$$;

create or replace function public.list_collaborators()
returns table (
  id uuid,
  full_name text,
  email text,
  is_active boolean,
  permissions text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_owner() or public.has_permission('users.view')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    profiles.id,
    profiles.full_name,
    profiles.email,
    profiles.is_active,
    coalesce((
      select array_agg(grants.permission_key order by grants.permission_key)
      from public.user_permissions as grants
      where grants.user_id = profiles.id
    ), '{}')
  from public.profiles as profiles
  where profiles.role = 'collaborator'
  order by profiles.full_name, profiles.email;
end;
$$;

create or replace function public.my_invitation()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_email text;
  invitation public.invitations%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'missing');
  end if;

  select lower(users.email) into actor_email from auth.users as users where users.id = auth.uid();

  select invitations.*
  into invitation
  from public.invitations as invitations
  where invitations.email = actor_email
    and invitations.status = 'pending'
  order by invitations.created_at desc
  limit 1;

  if invitation.id is null then
    return jsonb_build_object('status', 'missing');
  end if;

  if invitation.expires_at < pg_catalog.now() then
    update public.invitations set status = 'expired' where id = invitation.id and status = 'pending';
    return jsonb_build_object('status', 'expired');
  end if;

  return jsonb_build_object(
    'status', 'pending',
    'email', invitation.email,
    'full_name', invitation.full_name,
    'permissions', to_jsonb(invitation.permissions),
    'expires_at', invitation.expires_at
  );
end;
$$;

create or replace function public.set_product_price(p_id uuid, p_cents integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    public.has_permission('products.update')
    or public.has_permission('products.update_price')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_cents is null or p_cents < 0 or p_cents > 10000000 then
    raise exception 'invalid_price' using errcode = 'P0001';
  end if;

  update public.products set price_cents = p_cents where id = p_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.set_product_availability(p_id uuid, p_available boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    public.has_permission('products.update')
    or public.has_permission('products.update_availability')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.products set is_available = p_available where id = p_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.set_product_image(p_id uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    public.has_permission('products.update')
    or public.has_permission('products.upload_images')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_url is not null and p_url !~ '/storage/v1/object/public/menu/products/[A-Za-z0-9-]+\.(jpg|png|webp)$' then
    raise exception 'invalid_image' using errcode = 'P0001';
  end if;

  update public.products set image_url = p_url where id = p_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.reorder_menu_sections(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  section_id uuid;
  position integer := 0;
begin
  if not (
    public.has_permission('categories.reorder')
    or public.has_permission('categories.update')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if coalesce(array_length(p_ids, 1), 0) = 0
    or (select count(*) from public.menu_sections) <> array_length(p_ids, 1)
    or (select count(distinct incoming.id) from unnest(p_ids) as incoming (id)) <> array_length(p_ids, 1)
    or exists (
      select 1
      from unnest(p_ids) as incoming (id)
      where not exists (
        select 1 from public.menu_sections as sections where sections.id = incoming.id
      )
    ) then
    raise exception 'invalid_order' using errcode = 'P0001';
  end if;

  foreach section_id in array p_ids loop
    position := position + 1;
    update public.menu_sections set sort_order = position where id = section_id;
  end loop;
end;
$$;

create or replace function public.save_menu_theme(
  p_draft jsonb,
  p_published jsonb,
  p_previous jsonb,
  p_publish_immediately boolean,
  p_publish boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_publish and not public.has_permission('branding.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not p_publish and not public.has_permission('branding.update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if jsonb_typeof(p_draft) <> 'object' or (p_publish and jsonb_typeof(p_published) <> 'object') then
    raise exception 'invalid_theme' using errcode = 'P0001';
  end if;

  if p_publish then
    update public.menu_themes as themes
    set draft = p_draft,
        published = p_published,
        previous_published = p_previous,
        publish_immediately = p_publish_immediately
    from public.businesses as businesses
    where themes.business_id = businesses.id
      and businesses.slug = 'tacos-del-rey';
  else
    update public.menu_themes as themes
    set draft = p_draft,
        publish_immediately = p_publish_immediately
    from public.businesses as businesses
    where themes.business_id = businesses.id
      and businesses.slug = 'tacos-del-rey';
  end if;
end;
$$;

create or replace function public.set_menu_available(p_available boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('menu.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.restaurant_settings
  set menu_available = p_available
  where id = 1;
end;
$$;

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
  if not (
    public.has_permission('dashboard.view')
    or public.has_permission('analytics.view')
  ) then
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

revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;

revoke all on function public.protect_profile_role() from public, anon, authenticated;
revoke all on function public.protect_owner_registry() from public, anon, authenticated;
revoke all on function public.permission_keys_are_valid(text[]) from public, anon, authenticated;

revoke all on function public.installation_status() from public;
grant execute on function public.installation_status() to anon, authenticated;

revoke all on function public.claim_owner() from public, anon;
grant execute on function public.claim_owner() to authenticated;

revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

revoke all on function public.set_profile_role(uuid, public.app_role) from public, anon, authenticated;

revoke all on function public.create_invitation(text, text, text[]) from public, anon;
grant execute on function public.create_invitation(text, text, text[]) to authenticated;

revoke all on function public.revoke_invitation(uuid) from public, anon;
grant execute on function public.revoke_invitation(uuid) to authenticated;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

revoke all on function public.set_collaborator_permissions(uuid, text[]) from public, anon;
grant execute on function public.set_collaborator_permissions(uuid, text[]) to authenticated;

revoke all on function public.revoke_collaborator(uuid) from public, anon;
grant execute on function public.revoke_collaborator(uuid) to authenticated;

revoke all on function public.list_collaborators() from public, anon;
grant execute on function public.list_collaborators() to authenticated;

revoke all on function public.my_invitation() from public, anon;
grant execute on function public.my_invitation() to authenticated;

revoke all on function public.set_product_price(uuid, integer) from public, anon;
grant execute on function public.set_product_price(uuid, integer) to authenticated;

revoke all on function public.set_product_availability(uuid, boolean) from public, anon;
grant execute on function public.set_product_availability(uuid, boolean) to authenticated;

revoke all on function public.set_product_image(uuid, text) from public, anon;
grant execute on function public.set_product_image(uuid, text) to authenticated;

revoke all on function public.reorder_menu_sections(uuid[]) from public, anon;
grant execute on function public.reorder_menu_sections(uuid[]) to authenticated;

revoke all on function public.save_menu_theme(jsonb, jsonb, jsonb, boolean, boolean) from public, anon;
grant execute on function public.save_menu_theme(jsonb, jsonb, jsonb, boolean, boolean) to authenticated;

revoke all on function public.set_menu_available(boolean) from public, anon;
grant execute on function public.set_menu_available(boolean) to authenticated;

alter table public.owner_registry enable row level security;
alter table public.permissions enable row level security;
alter table public.user_permissions enable row level security;
alter table public.invitations enable row level security;

revoke all on table public.owner_registry from public, anon, authenticated;
revoke all on table public.permissions from public, anon, authenticated;
revoke all on table public.user_permissions from public, anon, authenticated;
revoke all on table public.invitations from public, anon, authenticated;

grant select on table public.permissions to authenticated;
grant select on table public.user_permissions to authenticated;
grant select on table public.invitations to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'permissions' and policyname = 'Authenticated read permission catalog'
  ) then
    create policy "Authenticated read permission catalog"
    on public.permissions for select to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_permissions' and policyname = 'Read own or owner reads grants'
  ) then
    create policy "Read own or owner reads grants"
    on public.user_permissions for select to authenticated
    using (user_id = auth.uid() or public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invitations' and policyname = 'Owners read invitations'
  ) then
    create policy "Owners read invitations"
    on public.invitations for select to authenticated
    using (public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'Staff view products'
  ) then
    create policy "Staff view products" on public.products for select to authenticated
    using (public.has_permission('products.view'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'Staff create products'
  ) then
    create policy "Staff create products" on public.products for insert to authenticated
    with check (public.has_permission('products.create'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'Staff update products'
  ) then
    create policy "Staff update products" on public.products for update to authenticated
    using (public.has_permission('products.update'))
    with check (public.has_permission('products.update'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'Staff delete products'
  ) then
    create policy "Staff delete products" on public.products for delete to authenticated
    using (public.has_permission('products.delete'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'menu_sections' and policyname = 'Staff view sections'
  ) then
    create policy "Staff view sections" on public.menu_sections for select to authenticated
    using (public.has_permission('categories.view'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'menu_sections' and policyname = 'Staff create sections'
  ) then
    create policy "Staff create sections" on public.menu_sections for insert to authenticated
    with check (public.has_permission('categories.create'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'menu_sections' and policyname = 'Staff update sections'
  ) then
    create policy "Staff update sections" on public.menu_sections for update to authenticated
    using (public.has_permission('categories.update'))
    with check (public.has_permission('categories.update'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'menu_sections' and policyname = 'Staff delete sections'
  ) then
    create policy "Staff delete sections" on public.menu_sections for delete to authenticated
    using (public.has_permission('categories.delete'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dining_tables' and policyname = 'Staff view tables'
  ) then
    create policy "Staff view tables" on public.dining_tables for select to authenticated
    using (public.has_permission('tables.view') or public.has_permission('tables.manage_qr'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dining_tables' and policyname = 'Staff create tables'
  ) then
    create policy "Staff create tables" on public.dining_tables for insert to authenticated
    with check (public.has_permission('tables.create'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dining_tables' and policyname = 'Staff update tables'
  ) then
    create policy "Staff update tables" on public.dining_tables for update to authenticated
    using (public.has_permission('tables.update'))
    with check (public.has_permission('tables.update'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dining_tables' and policyname = 'Staff delete tables'
  ) then
    create policy "Staff delete tables" on public.dining_tables for delete to authenticated
    using (public.has_permission('tables.delete'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'menu_themes' and policyname = 'Staff view themes'
  ) then
    create policy "Staff view themes" on public.menu_themes for select to authenticated
    using (public.has_permission('branding.view'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'businesses' and policyname = 'Staff view business'
  ) then
    create policy "Staff view business" on public.businesses for select to authenticated
    using (public.has_permission('branding.view'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restaurant_settings' and policyname = 'Staff view settings'
  ) then
    create policy "Staff view settings" on public.restaurant_settings for select to authenticated
    using (public.has_permission('menu.view') or public.has_permission('menu.publish'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Staff upload menu images'
  ) then
    create policy "Staff upload menu images"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'menu'
      and (
        public.has_permission('products.upload_images')
        or public.has_permission('products.create')
        or public.has_permission('products.update')
        or public.has_permission('categories.create')
        or public.has_permission('categories.update')
        or public.has_permission('branding.update')
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Staff replace menu images'
  ) then
    create policy "Staff replace menu images"
    on storage.objects for update to authenticated
    using (bucket_id = 'menu' and public.has_permission('branding.update'))
    with check (bucket_id = 'menu' and public.has_permission('branding.update'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Staff delete menu images'
  ) then
    create policy "Staff delete menu images"
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'menu'
      and (
        public.has_permission('products.delete')
        or public.has_permission('products.upload_images')
        or public.has_permission('products.update')
        or public.has_permission('categories.delete')
        or public.has_permission('categories.update')
        or public.has_permission('branding.update')
      )
    );
  end if;
end
$$;
