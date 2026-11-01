-- Agrega el rol collaborator.
-- Ejecuta este archivo solo y confírmalo antes de 20261101120100_access_control.sql.
-- Si el valor ya existe, el error de duplicado se puede ignorar.

alter type public.app_role add value 'collaborator';
