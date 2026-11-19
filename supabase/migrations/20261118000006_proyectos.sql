create table tracker.proyectos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null unique references tracker.marcas (id) on delete cascade,
  sector_id uuid not null references tracker.sectores (id),
  categorias_extra text[] not null default '{}',
  competidor_principal_id uuid references tracker.marcas (id),
  cadencia text not null default 'semanal' check (cadencia in ('semanal', 'quincenal', 'manual')),
  dia_semana int not null default 3 check (dia_semana between 0 and 6),
  hora time not null default '07:00',
  zona_horaria text not null default 'America/Lima',
  muestras int not null default 3 check (muestras between 1 and 10),
  pesos jsonb not null default '{"1":3,"2":2,"3":1}'::jsonb,
  tope_gasto_mensual numeric check (tope_gasto_mensual is null or tope_gasto_mensual >= 0),
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'archivado')),
  creado_por uuid references tracker.usuarios (id) on delete set null
);

create table tracker.proyecto_competidores (
  proyecto_id uuid not null references tracker.proyectos (id) on delete cascade,
  marca_id uuid not null references tracker.marcas (id) on delete cascade,
  orden int not null,
  primary key (proyecto_id, marca_id)
);

create table tracker.proyecto_motores (
  proyecto_id uuid not null references tracker.proyectos (id) on delete cascade,
  motor_id uuid not null references tracker.motores (id),
  primary key (proyecto_id, motor_id)
);

create table tracker.preguntas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references tracker.proyectos (id) on delete cascade,
  codigo text not null check (length(trim(codigo)) > 0),
  tipo text not null check (tipo in ('descubrimiento', 'comparativa', 'marca')),
  set text not null check (set in ('compat', 'extendido', 'propia')),
  categoria text,
  texto text not null check (length(trim(texto)) > 0),
  version int not null default 1 check (version >= 1),
  activa boolean not null default true,
  reemplaza_a uuid references tracker.preguntas (id),
  unique (proyecto_id, codigo, version)
);

create index proyecto_competidores_marca_idx on tracker.proyecto_competidores (marca_id);
create index proyecto_motores_motor_idx on tracker.proyecto_motores (motor_id);

alter table tracker.proyectos enable row level security;
alter table tracker.proyecto_competidores enable row level security;
alter table tracker.proyecto_motores enable row level security;
alter table tracker.preguntas enable row level security;

create policy proyectos_leer on tracker.proyectos for select to authenticated
  using (tracker.puede_ver_marca(marca_id));
create policy proyecto_competidores_leer on tracker.proyecto_competidores for select to authenticated
  using (exists (select 1 from tracker.proyectos p where p.id = proyecto_id and tracker.puede_ver_marca(p.marca_id)));
create policy proyecto_motores_leer on tracker.proyecto_motores for select to authenticated
  using (exists (select 1 from tracker.proyectos p where p.id = proyecto_id and tracker.puede_ver_marca(p.marca_id)));
create policy preguntas_leer on tracker.preguntas for select to authenticated
  using (exists (select 1 from tracker.proyectos p where p.id = proyecto_id and tracker.puede_ver_marca(p.marca_id)));

create function tracker.crear_proyecto(d jsonb) returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_yo uuid := auth.uid();
  v_admin boolean;
  v_sector uuid;
  v_sector_nuevo boolean;
  v_marca uuid;
  v_proyecto uuid;
  v_lider uuid;
  v_responsable uuid;
  v_comp jsonb := coalesce(d -> 'competidores', '[]'::jsonb);
  v_motores jsonb := coalesce(d -> 'motorIds', '[]'::jsonb);
  v_preguntas jsonb := coalesce(d -> 'preguntas', '[]'::jsonb);
  v_ids uuid[] := '{}';
  v_id uuid;
  v_principal int;
  v_cadencia text := coalesce(d ->> 'cadencia', 'semanal');
  v_dia int := 3;
  v_muestras int := 3;
  v_hora text := coalesce(d ->> 'hora', '07:00');
  v_tope numeric;
  c jsonb;
  a jsonb;
  q jsonb;
  m text;
  i int;
begin
  if not tracker.es_usuario() or not (tracker.es_admin() or tracker.puede_ampliar_catalogo()) then
    raise exception using message = 'sin_permiso', detail = 'Solo un admin o un líder puede dar de alta una marca.', errcode = '42501';
  end if;
  v_admin := tracker.es_admin();
  v_lider := case when v_admin then nullif(d ->> 'liderId', '')::uuid else v_yo end;
  v_responsable := nullif(d ->> 'responsableId', '')::uuid;
  if not v_admin and (
    (nullif(d ->> 'liderId', '') is not null and nullif(d ->> 'liderId', '')::uuid <> v_yo)
    or (v_responsable is not null and v_responsable <> v_yo)
  ) then
    raise exception using message = 'sin_permiso', detail = 'Solo un admin puede asignar a otra persona.', errcode = '42501';
  end if;
  if v_lider is not null and not exists (select 1 from tracker.usuarios where id = v_lider) then
    raise exception using message = 'datos_invalidos', detail = 'No encontramos al líder.';
  end if;
  if v_responsable is not null and not exists (select 1 from tracker.usuarios where id = v_responsable) then
    raise exception using message = 'datos_invalidos', detail = 'No encontramos al responsable.';
  end if;

  if jsonb_typeof(v_comp) <> 'array' or jsonb_array_length(v_comp) not between 1 and 5 then
    raise exception using message = 'limite_competidores', detail = 'Elige de 1 a 5 competidores.';
  end if;
  if jsonb_typeof(v_motores) <> 'array' or jsonb_array_length(v_motores) < 1 then
    raise exception using message = 'datos_invalidos', detail = 'Elige al menos un motor.';
  end if;
  if jsonb_typeof(v_preguntas) <> 'array' or jsonb_array_length(v_preguntas) < 1 then
    raise exception using message = 'datos_invalidos', detail = 'Agrega al menos una pregunta.';
  end if;
  if jsonb_typeof(d -> 'competidorPrincipal') is distinct from 'number'
    or (d ->> 'competidorPrincipal')::numeric not between 0 and jsonb_array_length(v_comp) - 1
    or (d ->> 'competidorPrincipal')::numeric <> trunc((d ->> 'competidorPrincipal')::numeric) then
    raise exception using message = 'datos_invalidos', detail = 'El competidor principal no es válido.';
  end if;
  v_principal := (d ->> 'competidorPrincipal')::int;

  if d ? 'muestras' then
    if jsonb_typeof(d -> 'muestras') <> 'number' or (d ->> 'muestras')::numeric not between 1 and 10
      or (d ->> 'muestras')::numeric <> trunc((d ->> 'muestras')::numeric) then
      raise exception using message = 'datos_invalidos', detail = 'Las muestras van de 1 a 10.';
    end if;
    v_muestras := (d ->> 'muestras')::int;
  end if;
  if d ? 'diaSemana' then
    if jsonb_typeof(d -> 'diaSemana') <> 'number' or (d ->> 'diaSemana')::numeric not between 0 and 6
      or (d ->> 'diaSemana')::numeric <> trunc((d ->> 'diaSemana')::numeric) then
      raise exception using message = 'datos_invalidos', detail = 'El día de la semana va de 0 a 6.';
    end if;
    v_dia := (d ->> 'diaSemana')::int;
  end if;
  if v_cadencia not in ('semanal', 'quincenal', 'manual') then
    raise exception using message = 'datos_invalidos', detail = 'La cadencia no es válida.';
  end if;
  if v_hora !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception using message = 'datos_invalidos', detail = 'La hora no es válida.';
  end if;
  if jsonb_typeof(d -> 'topeGastoMensual') = 'number' then
    v_tope := (d ->> 'topeGastoMensual')::numeric;
    if v_tope < 0 then
      raise exception using message = 'datos_invalidos', detail = 'El tope de gasto no puede ser negativo.';
    end if;
  end if;

  for m in select jsonb_array_elements_text(v_motores) loop
    if not exists (select 1 from tracker.motores where id = m::uuid) then
      raise exception using message = 'datos_invalidos', detail = 'Hay un motor que no existe.';
    end if;
  end loop;

  v_sector_nuevo := not (d -> 'sector' ? 'id');
  if not v_sector_nuevo then
    v_sector := (d -> 'sector' ->> 'id')::uuid;
    if not exists (select 1 from tracker.sectores where id = v_sector) then
      raise exception using message = 'datos_invalidos', detail = 'El sector no existe.';
    end if;
  end if;
  for c in select * from jsonb_array_elements(v_comp) loop
    if c ? 'id' then
      if v_sector_nuevo or not exists (select 1 from tracker.marcas where id = (c ->> 'id')::uuid and sector_id = v_sector) then
        raise exception using message = 'datos_invalidos', detail = 'Un competidor no es del sector de la marca.';
      end if;
    end if;
  end loop;

  if v_sector_nuevo then
    insert into tracker.sectores (nombre, categoria)
    values (d -> 'sector' ->> 'nombre', d -> 'sector' ->> 'categoria')
    returning id into v_sector;
  end if;

  insert into tracker.marcas (sector_id, nombre, ambiguo, es_cliente, empresa_id, dominios)
  values (
    v_sector,
    d -> 'marca' ->> 'nombre',
    coalesce((d -> 'marca' ->> 'ambiguo')::boolean, false),
    true,
    d -> 'marca' ->> 'empresaId',
    coalesce(array(select jsonb_array_elements_text(coalesce(d -> 'marca' -> 'dominios', '[]'::jsonb))), '{}')
  )
  returning id into v_marca;
  for a in select * from jsonb_array_elements(coalesce(d -> 'marca' -> 'alias', '[]'::jsonb)) loop
    insert into tracker.alias (marca_id, texto, ambiguo)
    values (v_marca, a ->> 'texto', coalesce((a ->> 'ambiguo')::boolean, false));
  end loop;

  for c in select * from jsonb_array_elements(v_comp) loop
    v_id := case when c ? 'id' then (c ->> 'id')::uuid else tracker.crear_marca(v_sector, c) end;
    v_ids := v_ids || v_id;
  end loop;

  insert into tracker.proyectos (
    marca_id, sector_id, categorias_extra, competidor_principal_id, cadencia, dia_semana, hora, muestras, tope_gasto_mensual, creado_por
  ) values (
    v_marca, v_sector,
    coalesce(array(select jsonb_array_elements_text(coalesce(d -> 'categoriasExtra', '[]'::jsonb))), '{}'),
    v_ids[v_principal + 1], v_cadencia, v_dia, v_hora::time, v_muestras, v_tope, v_yo
  )
  returning id into v_proyecto;

  for i in 1 .. array_length(v_ids, 1) loop
    insert into tracker.proyecto_competidores (proyecto_id, marca_id, orden) values (v_proyecto, v_ids[i], i);
  end loop;
  for m in select distinct jsonb_array_elements_text(v_motores) loop
    insert into tracker.proyecto_motores (proyecto_id, motor_id) values (v_proyecto, m::uuid);
  end loop;
  for q in select * from jsonb_array_elements(v_preguntas) loop
    insert into tracker.preguntas (proyecto_id, codigo, tipo, set, categoria, texto)
    values (v_proyecto, q ->> 'codigo', q ->> 'tipo', q ->> 'set', q ->> 'categoria', q ->> 'texto');
  end loop;

  if v_lider is not null then
    insert into tracker.membresias (usuario_id, marca_id, rol) values (v_lider, v_marca, 'lider');
  end if;
  if v_responsable is not null and v_responsable is distinct from v_lider then
    insert into tracker.membresias (usuario_id, marca_id, rol) values (v_responsable, v_marca, 'responsable');
  end if;
  return v_proyecto;
end
$$;

revoke execute on function tracker.crear_proyecto(jsonb) from public, anon;
grant execute on function tracker.crear_proyecto(jsonb) to authenticated;
