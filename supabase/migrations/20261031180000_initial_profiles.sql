-- Perfiles y roles iniciales de Tacos del Rey.
-- Esta migración no está aplicada hasta que se ejecute en Supabase.
--
-- El propietario principal se registra en /setup después de aplicar
-- todas las migraciones, incluida 20261101120100_access_control.sql.
-- El UPDATE comentado al final queda solo como nota antigua y no debe ejecutarse.
--
-- No ejecutes el UPDATE con un UUID inventado: no crearía al
-- propietario y, si coincidiera con otra fila, asignaría mal el rol.
--
-- El SQL Editor usa un rol que omite RLS. Un usuario de la aplicación
-- no puede cambiar su propio rol: no hay políticas de escritura y
-- anon/authenticated no tienen privilegio UPDATE sobre profiles.

-- Roles del sistema
do $$
begin
  if not exists (
    select 1
    from pg_type as t
    join pg_namespace as n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) then
    create type public.app_role as enum (
      'owner',
      'admin',
      'manager',
      'waiter'
    );
  end if;
end
$$;

-- Perfiles de usuarios.
-- El rol no se lee de raw_user_meta_data: el alta siempre queda en waiter.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id)
    on delete cascade,

  full_name text not null default '',

  role public.app_role not null default 'waiter',

  created_at timestamptz not null default now()
);

-- Activar seguridad por filas. No usar FORCE: el trigger es security
-- definer y el owner de la tabla debe poder insertar el perfil.
alter table public.profiles enable row level security;

revoke all on table public.profiles from public;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

-- Cada usuario puede consultar su propio perfil.
-- No hay políticas INSERT, UPDATE ni DELETE: nadie puede cambiar su rol
-- desde la API, incluido owner.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can read own profile'
  ) then
    create policy "Users can read own profile"
    on public.profiles
    for select
    to authenticated
    using (auth.uid() = id);
  end if;
end
$$;

-- Crear perfil automáticamente al registrar usuario.
-- Si este insert falla, PostgreSQL revierte también el alta en auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();
  end if;
end
$$;

-- Respaldo para usuarios creados antes de este trigger.
-- No modifica el rol de perfiles que ya existan.
insert into public.profiles (id, full_name)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', '')
from auth.users as users
where not exists (
  select 1
  from public.profiles as profiles
  where profiles.id = users.id
);

-- Primer propietario. Sustituye el UUID por el de Authentication → Users
-- y ejecuta esta consulta aparte, después de crear a esa persona.
-- No la dejes con un UUID de ejemplo.
--
-- update public.profiles
-- set role = 'owner'
-- where id = '<UUID-REAL-DEL-USUARIO>';
--
-- select id, role
-- from public.profiles
-- where id = '<UUID-REAL-DEL-USUARIO>';
