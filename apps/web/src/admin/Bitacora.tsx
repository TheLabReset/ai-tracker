import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fechaLima } from '../app/etiquetas';
import { useDatos } from '../app/proveedores';
import { estiloCampo } from '../sesion/MarcoAcceso';
import { estiloBotonMod } from '../app/estilos';

const LIMITE = 100;
const ENTIDADES = [
  'usuarios',
  'membresias',
  'sectores',
  'marcas',
  'alias',
  'motores',
  'plantillas',
  'proyectos',
  'proyecto_competidores',
  'proyecto_motores',
  'preguntas',
];
const ETIQUETA_ACCION = { insertar: 'Creó', actualizar: 'Cambió', borrar: 'Borró' } as const;

export function Bitacora() {
  const datos = useDatos();
  const [entidad, setEntidad] = useState('');
  const entradas = useQuery({
    queryKey: ['bitacora', entidad],
    queryFn: () => datos.listarBitacora({ entidad: entidad || undefined, limite: LIMITE }),
  });

  return (
    <div className="flex flex-col gap-e6">
      <h1 className="font-display text-(length:--t-40) uppercase">Bitácora</h1>
      <label className="flex max-w-[20rem] flex-col gap-e2 text-(length:--t-14) font-semibold">
        Entidad
        <select value={entidad} onChange={(e) => setEntidad(e.target.value)} className={estiloCampo}>
          <option value="">Todas</option>
          {ENTIDADES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </label>
      {entradas.isPending && <p role="status">Cargando…</p>}
      {entradas.isError && !entradas.data && (
        <div role="alert" className="flex flex-col items-start gap-e4">
          <p className="text-error">No pudimos cargar la bitácora.</p>
          <button type="button" onClick={() => entradas.refetch()} className={estiloBotonMod}>
            Reintentar
          </button>
        </div>
      )}
      {entradas.data && entradas.data.length === 0 && <p>Sin cambios todavía.</p>}
      {entradas.data && entradas.data.length > 0 && (
        <table className="w-full text-left text-(length:--t-14)">
          <thead>
            <tr>
              <th className="py-e2">Fecha</th>
              <th>Correo</th>
              <th>Entidad</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {entradas.data.map((e, i) => (
              <tr key={`${e.fecha}-${e.entidad}-${e.entidadId}-${i}`} className="border-t border-linea">
                <td className="py-e2">{fechaLima(e.fecha)}</td>
                <td>{e.usuarioCorreo ?? 'Sistema'}</td>
                <td>{e.entidad}</td>
                <td>{ETIQUETA_ACCION[e.accion]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
