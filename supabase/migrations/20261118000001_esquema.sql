create schema if not exists tracker;

grant usage on schema tracker to anon, authenticated, service_role;
alter default privileges in schema tracker grant all on tables to anon, authenticated, service_role;
alter default privileges in schema tracker grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema tracker grant all on functions to anon, authenticated, service_role;

create extension if not exists unaccent with schema extensions;

create function tracker.clave(t text) returns text
language sql immutable strict
set search_path = ''
as $$
  select regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, t)), '[^[:alnum:]]+', '', 'g')
$$;

create function tracker.es_correo_permitido(correo text) returns boolean
language sql immutable strict
set search_path = ''
as $$
  select lower(trim(correo)) ~ '@(reset\.com\.pe|wanted\.pe)$'
$$;
