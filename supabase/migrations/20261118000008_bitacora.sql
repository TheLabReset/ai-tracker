create table tracker.bitacora (
  id bigserial primary key,
  usuario_id uuid,
  entidad text not null,
  entidad_id text not null,
  accion text not null check (accion in ('insertar', 'actualizar', 'borrar')),
  antes jsonb,
  despues jsonb,
  fecha timestamptz not null default now()
);

create index bitacora_fecha_idx on tracker.bitacora (fecha desc, id desc);
create index bitacora_entidad_idx on tracker.bitacora (entidad, fecha desc);

alter table tracker.bitacora enable row level security;

create policy bitacora_leer on tracker.bitacora for select to authenticated
  using (tracker.es_admin());

create function tracker.registrar_cambio() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_antes jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_despues jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_fila jsonb := coalesce(v_despues, v_antes);
  v_clave text;
begin
  if tg_op = 'UPDATE' and v_antes = v_despues then
    return null;
  end if;
  v_clave := coalesce(
    v_fila ->> 'id',
    (v_fila ->> 'usuario_id') || '/' || (v_fila ->> 'marca_id'),
    (v_fila ->> 'proyecto_id') || '/' || coalesce(v_fila ->> 'marca_id', v_fila ->> 'motor_id')
  );
  insert into tracker.bitacora (usuario_id, entidad, entidad_id, accion, antes, despues)
  values (
    auth.uid(), tg_table_name, v_clave,
    case tg_op when 'INSERT' then 'insertar' when 'UPDATE' then 'actualizar' else 'borrar' end,
    v_antes, v_despues
  );
  return null;
end
$$;

revoke execute on function tracker.registrar_cambio() from public, anon, authenticated;

create trigger bitacora_usuarios after insert or update or delete on tracker.usuarios
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_membresias after insert or update or delete on tracker.membresias
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_sectores after insert or update or delete on tracker.sectores
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_marcas after insert or update or delete on tracker.marcas
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_alias after insert or update or delete on tracker.alias
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_motores after insert or update or delete on tracker.motores
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_plantillas after insert or update or delete on tracker.plantillas
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_proyectos after insert or update or delete on tracker.proyectos
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_proyecto_competidores after insert or update or delete on tracker.proyecto_competidores
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_proyecto_motores after insert or update or delete on tracker.proyecto_motores
  for each row execute function tracker.registrar_cambio();
create trigger bitacora_preguntas after insert or update or delete on tracker.preguntas
  for each row execute function tracker.registrar_cambio();
