import { ErrorDatos, type Motor } from '@lab/datos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useDatos } from '../app/proveedores';
import { estiloCampo } from '../sesion/MarcoAcceso';

const POR_DEFINIR = 'Por definir';
const estiloBotonMod = 'rounded-pildora bg-mod px-e6 py-e2 font-bold text-mod-tinta disabled:opacity-60';
const estiloBotonLinea = 'rounded-pildora border border-linea px-e4 py-e1 text-(length:--t-14) font-semibold';

const formatoFecha = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function fechaLima(iso: string) {
  const p = Object.fromEntries(formatoFecha.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

function precioValido(texto: string) {
  const t = texto.trim();
  if (t === '') return true;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0;
}

function FormularioMotor({ motor, alCerrar }: { motor: Motor; alCerrar: () => void }) {
  const datos = useDatos();
  const cliente = useQueryClient();
  const [modelo, setModelo] = useState(motor.modelo ?? '');
  const [busquedaWeb, setBusquedaWeb] = useState(motor.busquedaWeb);
  const [precio, setPrecio] = useState(motor.costoEstimado === null ? '' : motor.costoEstimado.toString());
  const [activo, setActivo] = useState(motor.activo);
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: (cambios: Parameters<typeof datos.actualizarMotor>[1]) => datos.actualizarMotor(motor.id, cambios),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['motores'] });
      alCerrar();
    },
    onError: (falla) => setError(falla instanceof ErrorDatos ? falla.message : 'No pudimos guardar el motor. Inténtalo de nuevo.'),
  });

  const valido = precioValido(precio);

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    const modeloNuevo = modelo.trim() === '' ? null : modelo.trim();
    const precioNuevo = precio.trim() === '' ? null : Number(precio);
    const cambios: Parameters<typeof datos.actualizarMotor>[1] = {};
    if (modeloNuevo !== motor.modelo) cambios.modelo = modeloNuevo;
    if (busquedaWeb !== motor.busquedaWeb) cambios.busquedaWeb = busquedaWeb;
    if (precioNuevo !== motor.costoEstimado) cambios.costoEstimado = precioNuevo;
    if (activo !== motor.activo) cambios.activo = activo;
    if (Object.keys(cambios).length === 0) return alCerrar();
    setError(null);
    guardar.mutate(cambios);
  }

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-[26rem] flex-col gap-e4 rounded-card bg-capsula p-e6">
      <h2 className="font-display text-(length:--t-26) uppercase">Editar {motor.nombre}</h2>
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Modelo
        <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} className={estiloCampo} />
      </label>
      <label className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
        <input type="checkbox" checked={busquedaWeb} onChange={(e) => setBusquedaWeb(e.target.checked)} />
        Búsqueda web
      </label>
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Precio por consulta (US$)
        <input type="text" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} className={estiloCampo} />
      </label>
      {!valido && (
        <p role="alert" className="text-(length:--t-14) text-error">
          Escribe un número mayor o igual a 0.
        </p>
      )}
      <label className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        Activo
      </label>
      {error && (
        <p role="alert" className="text-(length:--t-14) text-error">
          {error}
        </p>
      )}
      <div className="flex gap-e4">
        <button type="submit" disabled={!valido || guardar.isPending} aria-busy={guardar.isPending} className={estiloBotonMod}>
          Guardar
        </button>
        <button type="button" onClick={alCerrar} className={estiloBotonLinea}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function HistorialMotor({ motor }: { motor: Motor }) {
  const datos = useDatos();
  const historial = useQuery({ queryKey: ['motores', motor.id, 'historial'], queryFn: () => datos.historialMotor(motor.id) });
  return (
    <section className="flex flex-col gap-e2">
      <h2 className="font-display text-(length:--t-26) uppercase">Historial de {motor.nombre}</h2>
      {historial.isPending && <p role="status">Cargando…</p>}
      {historial.isError && (
        <div role="alert" className="flex flex-col items-start gap-e2">
          <p className="text-error">No pudimos cargar el historial.</p>
          <button type="button" onClick={() => historial.refetch()} className={estiloBotonMod}>
            Reintentar
          </button>
        </div>
      )}
      {historial.data && historial.data.length === 0 && <p>Sin cambios todavía.</p>}
      {historial.data && historial.data.length > 0 && (
        <ul className="flex flex-col gap-e1">
          {historial.data.map((c) => (
            <li key={c.vigenteHasta}>
              Hasta {fechaLima(c.vigenteHasta)}: {c.modelo ?? POR_DEFINIR}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Motores() {
  const datos = useDatos();
  const motores = useQuery({ queryKey: ['motores'], queryFn: () => datos.listarMotores() });
  const [editando, setEditando] = useState<string | null>(null);
  const [verHistorial, setVerHistorial] = useState<string | null>(null);

  if (motores.isPending) return <p role="status">Cargando…</p>;
  if (motores.isError && !motores.data)
    return (
      <div role="alert" className="flex flex-col items-start gap-e4 py-e8">
        <p className="text-error">No pudimos cargar los motores.</p>
        <button type="button" onClick={() => motores.refetch()} className={estiloBotonMod}>
          Reintentar
        </button>
      </div>
    );

  const lista = motores.data ?? [];
  const motorEditado = lista.find((m) => m.id === editando);
  const motorHistorial = lista.find((m) => m.id === verHistorial);

  return (
    <div className="flex flex-col gap-e6">
      <h1 className="font-display text-(length:--t-40) uppercase">Motores</h1>
      <table className="w-full text-left text-(length:--t-14)">
        <thead>
          <tr>
            <th className="py-e2">Motor</th>
            <th>Modelo</th>
            <th>Búsqueda web</th>
            <th>Precio por consulta</th>
            <th>Estado</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lista.map((m) => (
            <tr key={m.id} className="border-t border-linea">
              <td className="py-e2 font-semibold">{m.nombre}</td>
              <td>{m.modelo ?? POR_DEFINIR}</td>
              <td>{m.busquedaWeb ? 'Sí' : 'No'}</td>
              <td>{m.costoEstimado === null ? POR_DEFINIR : `US$ ${m.costoEstimado.toString()}`}</td>
              <td>{m.activo ? 'Activo' : 'Inactivo'}</td>
              <td className="flex gap-e2 py-e2">
                <button type="button" onClick={() => setEditando(m.id)} className={estiloBotonLinea}>
                  Editar
                </button>
                <button type="button" onClick={() => setVerHistorial(m.id)} className={estiloBotonLinea}>
                  Historial
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {motorEditado && <FormularioMotor key={motorEditado.id} motor={motorEditado} alCerrar={() => setEditando(null)} />}
      {motorHistorial && <HistorialMotor motor={motorHistorial} />}
    </div>
  );
}
