import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ETIQUETA_ESTADO, ETIQUETA_ROL } from '../app/etiquetas';
import { estiloBotonMod } from '../app/estilos';
import { puedeCrearMarcas } from '../app/guardas';
import { useDatos } from '../app/proveedores';
import { useSesion } from '../sesion/useSesion';

const estiloCelda = 'px-e4 py-e3 text-left';

export function Consolidado() {
  const datos = useDatos();
  const { perfil } = useSesion();
  const proyectos = useQuery({ queryKey: ['proyectos'], queryFn: () => datos.listarProyectos() });
  if (proyectos.isPending) return <p role="status">Cargando…</p>;
  if (proyectos.isError && !proyectos.data)
    return (
      <div role="alert" className="flex flex-col items-start gap-e4 py-e8">
        <p className="text-error">No pudimos cargar tus marcas.</p>
        <button type="button" onClick={() => proyectos.refetch()} className={estiloBotonMod}>
          Reintentar
        </button>
      </div>
    );

  const lista = proyectos.data ?? [];
  const botonNueva =
    perfil && puedeCrearMarcas(perfil) ? (
      <Link to="/marcas/nueva" className={estiloBotonMod}>
        Nueva marca
      </Link>
    ) : null;

  if (lista.length === 0)
    return (
      <div className="flex flex-col items-start gap-e4 py-e8">
        <p className="text-(length:--t-16)">Todavía no tienes marcas asignadas. Pídele acceso a The Lab.</p>
        {botonNueva}
      </div>
    );

  return (
    <div className="flex flex-col gap-e6 py-e8">
      <div className="flex flex-wrap items-end justify-between gap-e4">
        <div>
          <h1 className="font-display text-(length:--t-40) uppercase">Consolidado</h1>
          <p className="text-tinta-2">{lista.length === 1 ? '1 marca' : `${lista.length} marcas`}</p>
        </div>
        {botonNueva}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-(length:--t-16)">
          <thead>
            <tr className="border-b border-linea text-(length:--t-14) text-tinta-2">
              <th scope="col" className={estiloCelda}>Marca</th>
              <th scope="col" className={estiloCelda}>Sector</th>
              <th scope="col" className={estiloCelda}>Estado</th>
              <th scope="col" className={estiloCelda}>Tu rol</th>
              <th scope="col" className={estiloCelda}>Vueltas</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-b border-linea">
                <td className={estiloCelda}>
                  <Link to={`/marcas/${p.id}/configuracion`} className="font-semibold underline">
                    {p.marcaNombre}
                  </Link>
                </td>
                <td className={estiloCelda}>{p.sectorNombre}</td>
                <td className={estiloCelda}>{ETIQUETA_ESTADO[p.estado]}</td>
                <td className={estiloCelda}>{p.miRol === 'admin' ? 'Admin' : ETIQUETA_ROL[p.miRol]}</td>
                <td className={`${estiloCelda} text-tinta-2`}>Sin vueltas todavía</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
