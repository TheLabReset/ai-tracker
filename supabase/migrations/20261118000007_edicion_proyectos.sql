create function tracker.exigir_edicion(p uuid) returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_marca uuid;
begin
  select marca_id into v_marca from tracker.proyectos where id = p for update;
  if v_marca is null or not tracker.puede_editar_marca(v_marca) then
    raise exception using message = 'sin_permiso', detail = 'No tienes permiso para editar este proyecto.', errcode = '42501';
  end if;
end
$$;

revoke execute on function tracker.exigir_edicion(uuid) from public, anon, authenticated;

create function tracker.actualizar_proyecto(p uuid, c jsonb) returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_motores uuid[];
  v_extra text[];
  m text;
  k text;
begin
  perform tracker.exigir_edicion(p);
  if jsonb_typeof(c) is distinct from 'object' then
    raise exception using message = 'datos_invalidos', detail = 'Los cambios no son válidos.';
  end if;

  if c ? 'muestras' and (jsonb_typeof(c -> 'muestras') <> 'number' or (c ->> 'muestras')::numeric not between 1 and 10
    or (c ->> 'muestras')::numeric <> trunc((c ->> 'muestras')::numeric)) then
    raise exception using message = 'datos_invalidos', detail = 'Las muestras van de 1 a 10.';
  end if;
  if c ? 'diaSemana' and (jsonb_typeof(c -> 'diaSemana') <> 'number' or (c ->> 'diaSemana')::numeric not between 0 and 6
    or (c ->> 'diaSemana')::numeric <> trunc((c ->> 'diaSemana')::numeric)) then
    raise exception using message = 'datos_invalidos', detail = 'El día de la semana va de 0 a 6.';
  end if;
  if c ? 'cadencia' and (jsonb_typeof(c -> 'cadencia') <> 'string' or (c ->> 'cadencia') not in ('semanal', 'quincenal', 'manual')) then
    raise exception using message = 'datos_invalidos', detail = 'La cadencia no es válida.';
  end if;
  if c ? 'hora' and (jsonb_typeof(c -> 'hora') <> 'string' or (c ->> 'hora') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then
    raise exception using message = 'datos_invalidos', detail = 'La hora no es válida.';
  end if;
  if c ? 'topeGastoMensual' and jsonb_typeof(c -> 'topeGastoMensual') not in ('null', 'number') then
    raise exception using message = 'datos_invalidos', detail = 'El tope de gasto no es válido.';
  end if;
  if jsonb_typeof(c -> 'topeGastoMensual') = 'number' and (c ->> 'topeGastoMensual')::numeric < 0 then
    raise exception using message = 'datos_invalidos', detail = 'El tope de gasto no puede ser negativo.';
  end if;
  if c ? 'categoriasExtra' then
    if jsonb_typeof(c -> 'categoriasExtra') <> 'array'
      or exists (select 1 from jsonb_array_elements(c -> 'categoriasExtra') e where jsonb_typeof(e) <> 'string') then
      raise exception using message = 'datos_invalidos', detail = 'Las categorías extra no son válidas.';
    end if;
    v_extra := array(select jsonb_array_elements_text(c -> 'categoriasExtra'));
  end if;
  if c ? 'pesos' then
    if jsonb_typeof(c -> 'pesos') <> 'object' then
      raise exception using message = 'datos_invalidos', detail = 'Los pesos no son válidos.';
    end if;
    for k in select jsonb_object_keys(c -> 'pesos') loop
      if k not in ('1', '2', '3') then
        raise exception using message = 'datos_invalidos', detail = 'Los pesos solo van por puesto 1, 2 y 3.';
      end if;
    end loop;
    foreach k in array array['1', '2', '3'] loop
      if jsonb_typeof(c -> 'pesos' -> k) is distinct from 'number' or (c -> 'pesos' ->> k)::numeric < 0 then
        raise exception using message = 'datos_invalidos', detail = 'Cada peso debe ser un número de 0 en adelante.';
      end if;
    end loop;
  end if;
  if c ? 'motorIds' then
    if jsonb_typeof(c -> 'motorIds') <> 'array' or jsonb_array_length(c -> 'motorIds') < 1 then
      raise exception using message = 'datos_invalidos', detail = 'Elige al menos un motor.';
    end if;
    for m in select jsonb_array_elements_text(c -> 'motorIds') loop
      if not exists (select 1 from tracker.motores where id = m::uuid) then
        raise exception using message = 'datos_invalidos', detail = 'Hay un motor que no existe.';
      end if;
    end loop;
    v_motores := array(select distinct jsonb_array_elements_text(c -> 'motorIds')::uuid);
  end if;
  if c ? 'competidorPrincipalId' and not exists (
    select 1 from tracker.proyecto_competidores
    where proyecto_id = p and marca_id::text = c ->> 'competidorPrincipalId'
  ) then
    raise exception using message = 'datos_invalidos', detail = 'El competidor principal debe ser uno de los competidores del proyecto.';
  end if;

  update tracker.proyectos set
    muestras = case when c ? 'muestras' then (c ->> 'muestras')::int else muestras end,
    dia_semana = case when c ? 'diaSemana' then (c ->> 'diaSemana')::int else dia_semana end,
    cadencia = case when c ? 'cadencia' then c ->> 'cadencia' else cadencia end,
    hora = case when c ? 'hora' then (c ->> 'hora')::time else hora end,
    tope_gasto_mensual = case when c ? 'topeGastoMensual' then (c ->> 'topeGastoMensual')::numeric else tope_gasto_mensual end,
    categorias_extra = case when c ? 'categoriasExtra' then v_extra else categorias_extra end,
    pesos = case when c ? 'pesos' then c -> 'pesos' else pesos end,
    competidor_principal_id = case when c ? 'competidorPrincipalId' then (c ->> 'competidorPrincipalId')::uuid else competidor_principal_id end
  where id = p;

  if v_motores is not null then
    delete from tracker.proyecto_motores where proyecto_id = p;
    insert into tracker.proyecto_motores (proyecto_id, motor_id) select p, unnest(v_motores);
  end if;
end
$$;

create function tracker.cambiar_competidores(p uuid, marcas uuid[]) returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_marca uuid;
  v_sector uuid;
  v_principal uuid;
begin
  perform tracker.exigir_edicion(p);
  if coalesce(array_length(marcas, 1), 0) not between 1 and 5 then
    raise exception using message = 'limite_competidores', detail = 'Elige de 1 a 5 competidores.';
  end if;
  if (select count(distinct x) from unnest(marcas) x) <> array_length(marcas, 1) then
    raise exception using message = 'datos_invalidos', detail = 'Hay un competidor repetido.';
  end if;
  select marca_id, sector_id, competidor_principal_id into v_marca, v_sector, v_principal from tracker.proyectos where id = p;
  if v_marca = any (marcas) then
    raise exception using message = 'datos_invalidos', detail = 'La marca no puede ser su propio competidor.';
  end if;
  if (select count(*) from tracker.marcas where id = any (cambiar_competidores.marcas) and sector_id = v_sector) <> array_length(marcas, 1) then
    raise exception using message = 'datos_invalidos', detail = 'Un competidor no es del sector de la marca.';
  end if;

  delete from tracker.proyecto_competidores where proyecto_id = p;
  insert into tracker.proyecto_competidores (proyecto_id, marca_id, orden)
  select p, x, o from unnest(marcas) with ordinality t(x, o);
  if v_principal is null or not (v_principal = any (marcas)) then
    update tracker.proyectos set competidor_principal_id = marcas[1] where id = p;
  end if;
end
$$;

create function tracker.editar_pregunta(pregunta uuid, texto text) returns tracker.preguntas
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_proyecto uuid;
  v_fila tracker.preguntas;
  v_nueva tracker.preguntas;
  v_texto text := btrim(regexp_replace(coalesce(texto, ''), '\s+', ' ', 'g'));
begin
  select proyecto_id into v_proyecto from tracker.preguntas where id = pregunta;
  if v_proyecto is null then
    raise exception using message = 'sin_permiso', detail = 'No tienes permiso para editar este proyecto.', errcode = '42501';
  end if;
  perform tracker.exigir_edicion(v_proyecto);
  select * into v_fila from tracker.preguntas where id = pregunta;
  if not v_fila.activa then
    raise exception using message = 'datos_invalidos', detail = 'Esa es una versión anterior de la pregunta.';
  end if;
  if v_texto = '' then
    raise exception using message = 'datos_invalidos', detail = 'Escribe el texto de la pregunta.';
  end if;
  if v_texto = btrim(regexp_replace(v_fila.texto, '\s+', ' ', 'g')) then
    return v_fila;
  end if;

  update tracker.preguntas set activa = false where id = pregunta;
  insert into tracker.preguntas (proyecto_id, codigo, tipo, set, categoria, texto, version, activa, reemplaza_a)
  values (v_fila.proyecto_id, v_fila.codigo, v_fila.tipo, v_fila.set, v_fila.categoria, v_texto, v_fila.version + 1, true, v_fila.id)
  returning * into v_nueva;
  return v_nueva;
end
$$;

create function tracker.agregar_pregunta(proyecto uuid, tipo text, texto text, categoria text) returns tracker.preguntas
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_n int;
  v_nueva tracker.preguntas;
  v_texto text := btrim(regexp_replace(coalesce(texto, ''), '\s+', ' ', 'g'));
begin
  perform tracker.exigir_edicion(proyecto);
  if tipo is null or tipo not in ('descubrimiento', 'comparativa', 'marca') then
    raise exception using message = 'datos_invalidos', detail = 'El tipo de pregunta no es válido.';
  end if;
  if v_texto = '' then
    raise exception using message = 'datos_invalidos', detail = 'Escribe el texto de la pregunta.';
  end if;
  select coalesce(max(substr(q.codigo, 2)::int), 0) + 1 into v_n
  from tracker.preguntas q where q.proyecto_id = proyecto and q.codigo ~ '^X[0-9]{1,9}$';
  insert into tracker.preguntas (proyecto_id, codigo, tipo, set, categoria, texto)
  values (proyecto, 'X' || v_n, tipo, 'propia', nullif(btrim(categoria), ''), v_texto)
  returning * into v_nueva;
  return v_nueva;
end
$$;

create function tracker.desactivar_pregunta(pregunta uuid) returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_proyecto uuid;
  v_activa boolean;
begin
  select proyecto_id into v_proyecto from tracker.preguntas where id = pregunta;
  if v_proyecto is null then
    raise exception using message = 'sin_permiso', detail = 'No tienes permiso para editar este proyecto.', errcode = '42501';
  end if;
  perform tracker.exigir_edicion(v_proyecto);
  select activa into v_activa from tracker.preguntas where id = pregunta;
  if not v_activa then
    return;
  end if;
  if not exists (select 1 from tracker.preguntas where proyecto_id = v_proyecto and activa and id <> pregunta) then
    raise exception using message = 'datos_invalidos', detail = 'El proyecto necesita al menos una pregunta activa.';
  end if;
  update tracker.preguntas set activa = false where id = pregunta;
end
$$;

create function tracker.cambiar_estado(p uuid, estado text) returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform tracker.exigir_edicion(p);
  if estado is null or estado not in ('activo', 'pausado', 'archivado') then
    raise exception using message = 'datos_invalidos', detail = 'El estado no es válido.';
  end if;
  update tracker.proyectos set estado = cambiar_estado.estado where id = p;
end
$$;

revoke execute on function tracker.actualizar_proyecto(uuid, jsonb) from public, anon;
revoke execute on function tracker.cambiar_competidores(uuid, uuid[]) from public, anon;
revoke execute on function tracker.editar_pregunta(uuid, text) from public, anon;
revoke execute on function tracker.agregar_pregunta(uuid, text, text, text) from public, anon;
revoke execute on function tracker.desactivar_pregunta(uuid) from public, anon;
revoke execute on function tracker.cambiar_estado(uuid, text) from public, anon;
grant execute on function tracker.actualizar_proyecto(uuid, jsonb) to authenticated;
grant execute on function tracker.cambiar_competidores(uuid, uuid[]) to authenticated;
grant execute on function tracker.editar_pregunta(uuid, text) to authenticated;
grant execute on function tracker.agregar_pregunta(uuid, text, text, text) to authenticated;
grant execute on function tracker.desactivar_pregunta(uuid) to authenticated;
grant execute on function tracker.cambiar_estado(uuid, text) to authenticated;
