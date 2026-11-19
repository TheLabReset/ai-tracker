import { ErrorDatos, type EstadoProyecto, type Proyecto } from '@lab/datos';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { estiloBotonLinea } from '../app/estilos';
import { ETIQUETA_ESTADO } from '../app/etiquetas';
import { puedeEditarMarca } from '../app/guardas';
import { useDatos } from '../app/proveedores';
import { useSesion } from '../sesion/useSesion';
import { Competidores } from './configuracion/Competidores';
import { MotoresYCadencia } from './configuracion/MotoresYCadencia';
import { Pesos } from './configuracion/Pesos';
import { Preguntas } from './configuracion/Preguntas';
import { Mensajes, useCambio } from './configuracion/useCambio';

function Cabecera({ proyecto, puedeEditar }: { proyecto: Proyecto; puedeEditar: boolean }) {
  const datos = useDatos();
  const cambio = useCambio(proyecto.id, (estado: EstadoProyecto) => datos.cambiarEstado(proyecto.id, estado));
  return (
    <header className="flex flex-col gap-e2">
      <h1 className="font-display text-(length:--t-40) uppercase">{proyecto.marca.nombre}</h1>
      <p className="flex gap-e4 text-(length:--t-14) text-tinta-2">
        <span>{proyecto.sector.nombre}</span>
        <span>{ETIQUETA_ESTADO[proyecto.estado]}</span>
      </p>
      {puedeEditar && (
        <div className="flex gap-e4">
          {proyecto.estado === 'activo' ? (
            <>
              <button type="button" disabled={cambio.pendiente} onClick={() => cambio.ejecutar('pausado')} className={estiloBotonLinea}>
                Pausar
              </button>
              <button type="button" disabled={cambio.pendiente} onClick={() => cambio.ejecutar('archivado')} className={estiloBotonLinea}>
                Archivar
              </button>
            </>
          ) : (
            <button type="button" disabled={cambio.pendiente} onClick={() => cambio.ejecutar('activo')} className={estiloBotonLinea}>
              Reactivar
            </button>
          )}
        </div>
      )}
      <Mensajes error={cambio.error} aviso={null} />
    </header>
  );
}

export function Configuracion() {
  const datos = useDatos();
  const { proyectoId = '' } = useParams();
  const { perfil } = useSesion();
  const proyecto = useQuery({ queryKey: ['proyecto', proyectoId], queryFn: () => datos.obtenerProyecto(proyectoId) });

  if (proyecto.data === undefined) {
    if (proyecto.isPending) return <p role="status">Cargando…</p>;
    const sinAcceso = proyecto.error instanceof ErrorDatos && proyecto.error.codigo === 'sin_permiso';
    return (
      <div role="alert" className="flex flex-col items-start gap-e4 py-e8">
        <p className="text-error">{sinAcceso ? 'No tienes acceso a esta marca.' : 'No pudimos cargar la marca.'}</p>
        {!sinAcceso && (
          <button type="button" onClick={() => proyecto.refetch()} className="rounded-pildora bg-mod px-e6 py-e2 font-bold text-mod-tinta">
            Reintentar
          </button>
        )}
      </div>
    );
  }

  const p = proyecto.data;
  const puedeEditar = perfil !== null && puedeEditarMarca(perfil, p.marca.id);
  return (
    <div className="flex flex-col gap-e8">
      <Cabecera proyecto={p} puedeEditar={puedeEditar} />
      {!puedeEditar && (
        <p role="status" className="rounded-card bg-capsula p-e4 text-(length:--t-14)">
          Solo lectura: pídele al líder de la marca que haga los cambios.
        </p>
      )}
      <Competidores proyecto={p} puedeEditar={puedeEditar} />
      <Preguntas proyecto={p} puedeEditar={puedeEditar} />
      <MotoresYCadencia proyecto={p} puedeEditar={puedeEditar} />
      <Pesos proyecto={p} puedeEditar={puedeEditar} />
    </div>
  );
}
