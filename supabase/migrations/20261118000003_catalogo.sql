create table tracker.sectores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (length(trim(nombre)) > 0),
  categoria text not null,
  pais text not null default 'Perú',
  idioma text not null default 'es'
);

create table tracker.marcas (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references tracker.sectores (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  clave text not null,
  ambiguo boolean not null default false,
  es_cliente boolean not null default false,
  empresa_id text references tracker.empresas (id),
  dominios text[] not null default '{}',
  unique (sector_id, clave)
);

create table tracker.alias (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references tracker.marcas (id) on delete cascade,
  texto text not null check (length(trim(texto)) > 0),
  clave text not null,
  ambiguo boolean not null default false
);

create index alias_marca_idx on tracker.alias (marca_id);

alter table tracker.membresias
  add constraint membresias_marca_fk foreign key (marca_id) references tracker.marcas (id) on delete cascade;

alter table tracker.sectores enable row level security;
alter table tracker.marcas enable row level security;
alter table tracker.alias enable row level security;

create function tracker.marcas_preparar() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_otra text;
begin
  new.clave := tracker.clave(new.nombre);
  select m.nombre into v_otra from tracker.marcas m
    where m.sector_id = new.sector_id and m.id <> new.id and m.clave = new.clave
  union all
  select m.nombre from tracker.alias a join tracker.marcas m on m.id = a.marca_id
    where m.sector_id = new.sector_id and m.id <> new.id and a.clave = new.clave
  limit 1;
  if v_otra is not null then
    raise exception using message = 'colision_alias', detail = '«' || new.nombre || '» ya es de ' || v_otra;
  end if;
  return new;
end
$$;

create function tracker.alias_preparar() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_sector uuid;
  v_otra text;
begin
  new.clave := tracker.clave(new.texto);
  select sector_id into v_sector from tracker.marcas where id = new.marca_id;
  select m.nombre into v_otra from tracker.marcas m
    where m.sector_id = v_sector and m.id <> new.marca_id and m.clave = new.clave
  union all
  select m.nombre from tracker.alias a join tracker.marcas m on m.id = a.marca_id
    where m.sector_id = v_sector and m.id <> new.marca_id and a.clave = new.clave
  limit 1;
  if v_otra is not null then
    raise exception using message = 'colision_alias', detail = '«' || new.texto || '» ya es de ' || v_otra;
  end if;
  return new;
end
$$;

create trigger marcas_preparar before insert or update on tracker.marcas
  for each row execute function tracker.marcas_preparar();
create trigger alias_preparar before insert or update on tracker.alias
  for each row execute function tracker.alias_preparar();

create function tracker.puede_ampliar_catalogo() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select tracker.es_admin()
    or exists (select 1 from tracker.membresias where usuario_id = auth.uid() and rol = 'lider')
$$;

create function tracker.crear_marca(sector uuid, datos jsonb) returns uuid
language plpgsql volatile security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  a jsonb;
begin
  insert into tracker.marcas (sector_id, nombre, ambiguo, dominios)
  values (
    sector,
    datos ->> 'nombre',
    coalesce((datos ->> 'ambiguo')::boolean, false),
    coalesce(array(select jsonb_array_elements_text(coalesce(datos -> 'dominios', '[]'::jsonb))), '{}')
  )
  returning id into v_id;
  for a in select * from jsonb_array_elements(coalesce(datos -> 'alias', '[]'::jsonb)) loop
    insert into tracker.alias (marca_id, texto, ambiguo)
    values (v_id, a ->> 'texto', coalesce((a ->> 'ambiguo')::boolean, false));
  end loop;
  return v_id;
end
$$;

create policy sectores_leer on tracker.sectores for select to authenticated
  using (tracker.es_usuario());
create policy sectores_insertar on tracker.sectores for insert to authenticated
  with check (tracker.puede_ampliar_catalogo());
create policy sectores_actualizar on tracker.sectores for update to authenticated
  using (tracker.es_admin()) with check (tracker.es_admin());
create policy sectores_borrar on tracker.sectores for delete to authenticated
  using (tracker.es_admin());

create policy marcas_leer on tracker.marcas for select to authenticated
  using (tracker.es_usuario());
create policy marcas_insertar on tracker.marcas for insert to authenticated
  with check (tracker.puede_ampliar_catalogo());
create policy marcas_actualizar on tracker.marcas for update to authenticated
  using (tracker.es_admin()) with check (tracker.es_admin());
create policy marcas_borrar on tracker.marcas for delete to authenticated
  using (tracker.es_admin());

create policy alias_leer on tracker.alias for select to authenticated
  using (tracker.es_usuario());
create policy alias_insertar on tracker.alias for insert to authenticated
  with check (tracker.puede_ampliar_catalogo());
create policy alias_actualizar on tracker.alias for update to authenticated
  using (tracker.es_admin()) with check (tracker.es_admin());
create policy alias_borrar on tracker.alias for delete to authenticated
  using (tracker.es_admin());
