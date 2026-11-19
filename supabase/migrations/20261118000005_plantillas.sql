create table tracker.plantillas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null check (length(trim(codigo)) > 0),
  sector_id uuid references tracker.sectores (id) on delete cascade,
  tipo text not null check (tipo in ('descubrimiento', 'comparativa', 'marca')),
  texto text not null check (length(trim(texto)) > 0),
  unique nulls not distinct (sector_id, codigo)
);

alter table tracker.plantillas enable row level security;

insert into tracker.plantillas (codigo, sector_id, tipo, texto) values
  ('P1', null, 'descubrimiento', '¿Qué marca de {categoria} me recomiendas en Perú?'),
  ('P2', null, 'comparativa', '¿{marca} o {competidor}? ¿Cuál me conviene?'),
  ('P3', null, 'descubrimiento', '¿Qué marcas de {categoria} son confiables en Perú?'),
  ('P4', null, 'descubrimiento', '¿Cuál es la mejor opción de {categoria} en Perú hoy?'),
  ('P5', null, 'marca', '¿Qué opinan de {marca}?');

create policy plantillas_leer on tracker.plantillas for select to authenticated
  using (tracker.es_usuario());
create policy plantillas_insertar on tracker.plantillas for insert to authenticated
  with check (
    case when sector_id is null then tracker.es_admin() else tracker.puede_ampliar_catalogo() end
  );
create policy plantillas_actualizar on tracker.plantillas for update to authenticated
  using (tracker.es_admin()) with check (tracker.es_admin());
create policy plantillas_borrar on tracker.plantillas for delete to authenticated
  using (tracker.es_admin());
