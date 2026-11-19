create table tracker.motores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  proveedor text not null,
  modelo text,
  busqueda_web boolean not null default true,
  parametros jsonb not null default '{}'::jsonb,
  costo_estimado numeric check (costo_estimado is null or costo_estimado >= 0),
  activo boolean not null default true,
  vigente_desde timestamptz not null default now(),
  orden int not null
);

create table tracker.motores_historial (
  id uuid primary key default gen_random_uuid(),
  motor_id uuid not null references tracker.motores (id) on delete cascade,
  modelo text,
  busqueda_web boolean not null,
  parametros jsonb not null,
  vigente_hasta timestamptz not null,
  cambiado_por uuid
);

create index motores_historial_motor_idx on tracker.motores_historial (motor_id, vigente_hasta desc);

alter table tracker.motores enable row level security;
alter table tracker.motores_historial enable row level security;

create function tracker.motores_historiar() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.modelo is distinct from old.modelo
    or new.busqueda_web is distinct from old.busqueda_web
    or new.parametros is distinct from old.parametros then
    new.vigente_desde := now();
    insert into tracker.motores_historial (motor_id, modelo, busqueda_web, parametros, vigente_hasta, cambiado_por)
    values (old.id, old.modelo, old.busqueda_web, old.parametros, new.vigente_desde, auth.uid());
  end if;
  return new;
end
$$;

revoke execute on function tracker.motores_historiar() from public, anon, authenticated;

create trigger motores_historiar before update on tracker.motores
  for each row execute function tracker.motores_historiar();

create policy motores_leer on tracker.motores for select to authenticated
  using (tracker.es_usuario());
create policy motores_actualizar on tracker.motores for update to authenticated
  using (tracker.es_admin()) with check (tracker.es_admin());

create policy motores_historial_leer on tracker.motores_historial for select to authenticated
  using (tracker.es_usuario());

insert into tracker.motores (codigo, nombre, proveedor, orden) values
  ('chatgpt', 'ChatGPT', 'OpenAI', 1),
  ('gemini', 'Gemini', 'Google', 2),
  ('claude', 'Claude', 'Anthropic', 3),
  ('perplexity', 'Perplexity', 'Perplexity', 4);
