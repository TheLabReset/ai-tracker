create table tracker.empresas (
  id text primary key,
  dominio text not null unique
);
insert into tracker.empresas (id, dominio) values ('reset', 'reset.com.pe'), ('wanted', 'wanted.pe');

create table tracker.admins (
  correo text primary key check (correo = lower(correo))
);

create table tracker.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  correo text not null unique,
  nombre text not null,
  empresa_id text not null references tracker.empresas (id),
  es_admin boolean not null default false
);

create table tracker.membresias (
  usuario_id uuid not null references tracker.usuarios (id) on delete cascade,
  marca_id uuid not null,
  rol text not null check (rol in ('lider', 'responsable', 'planning', 'lector')),
  primary key (usuario_id, marca_id)
);

alter table tracker.empresas enable row level security;
alter table tracker.admins enable row level security;
alter table tracker.usuarios enable row level security;
alter table tracker.membresias enable row level security;

create function tracker.es_usuario() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from tracker.usuarios where id = auth.uid())
$$;

create function tracker.es_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from tracker.usuarios where id = auth.uid() and es_admin)
$$;

create function tracker.rol_en_marca(marca uuid) returns text
language sql stable security definer
set search_path = ''
as $$
  select rol from tracker.membresias where usuario_id = auth.uid() and marca_id = marca
$$;

create function tracker.puede_ver_marca(marca uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select tracker.es_admin() or tracker.rol_en_marca(marca) is not null
$$;

create function tracker.puede_editar_marca(marca uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select tracker.es_admin() or tracker.rol_en_marca(marca) = 'lider'
$$;

create function tracker.perfil_de(usuario uuid) returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', u.id,
    'correo', u.correo,
    'nombre', u.nombre,
    'empresaId', u.empresa_id,
    'esAdmin', u.es_admin,
    'membresias', coalesce(
      (select jsonb_agg(jsonb_build_object('marcaId', m.marca_id, 'rol', m.rol) order by m.marca_id)
       from tracker.membresias m where m.usuario_id = u.id),
      '[]'::jsonb)
  )
  from tracker.usuarios u where u.id = usuario
$$;

create function tracker.sincronizar_perfil() returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_id uuid := auth.uid();
  v_correo text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_nombre text;
  v_empresa text;
begin
  if v_id is null or not tracker.es_correo_permitido(v_correo) then
    raise exception using message = 'correo_no_permitido', detail = 'Usa tu correo de Reset o Wanted.';
  end if;
  select id into v_empresa from tracker.empresas where v_correo like '%@' || dominio;
  v_nombre := coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    initcap(replace(split_part(v_correo, '@', 1), '.', ' '))
  );
  insert into tracker.usuarios (id, correo, nombre, empresa_id, es_admin)
  values (v_id, v_correo, v_nombre, v_empresa, exists (select 1 from tracker.admins where correo = v_correo))
  on conflict (id) do update set
    correo = excluded.correo,
    empresa_id = excluded.empresa_id,
    es_admin = tracker.usuarios.es_admin or excluded.es_admin;
  return tracker.perfil_de(v_id);
end
$$;

create function tracker.cambiar_admin(usuario uuid, valor boolean) returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_correo text;
begin
  if not tracker.es_admin() then
    raise exception using message = 'sin_permiso', detail = 'Solo un admin puede cambiar esto.', errcode = '42501';
  end if;
  update tracker.usuarios set es_admin = valor where id = usuario returning correo into v_correo;
  if v_correo is null then
    raise exception using message = 'datos_invalidos', detail = 'No encontramos a esa persona.';
  end if;
  if not valor then
    delete from tracker.admins where correo = v_correo;
  end if;
end
$$;

create policy usuarios_leer on tracker.usuarios for select to authenticated
  using (tracker.es_usuario());

create policy empresas_leer on tracker.empresas for select to authenticated
  using (tracker.es_usuario());

create policy membresias_leer on tracker.membresias for select to authenticated
  using (tracker.es_usuario() and (tracker.es_admin() or usuario_id = auth.uid() or tracker.puede_ver_marca(marca_id)));
create policy membresias_insertar on tracker.membresias for insert to authenticated
  with check (tracker.es_admin());
create policy membresias_actualizar on tracker.membresias for update to authenticated
  using (tracker.es_admin()) with check (tracker.es_admin());
create policy membresias_borrar on tracker.membresias for delete to authenticated
  using (tracker.es_admin());
