import { ErrorDatos, type Proyecto } from '@lab/datos';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { estiloBotonMod } from '../../app/estilos';
import { useDatos } from '../../app/proveedores';
import { estiloCampo } from '../../sesion/MarcoAcceso';
import { Mensajes, useCambio } from './useCambio';

const MAXIMO = 5;

export function Competidores({ proyecto, puedeEditar }: { proyecto: Proyecto; puedeEditar: boolean }) {
  const datos = useDatos();
  const catalogo = useQuery({ queryKey: ['sectores', proyecto.sector.id, 'marcas'], queryFn: () => datos.listarMarcas(proyecto.sector.id), enabled: puedeEditar });
  const [elegidos, setElegidos] = useState(() => proyecto.competidores.map((c) => c.id));
  const [principal, setPrincipal] = useState(proyecto.competidorPrincipalId);
  const [limite, setLimite] = useState(false);
  const guardar = useCambio(
    proyecto.id,
    async (c: { ids: string[]; principalId: string }) => {
      await datos.cambiarCompetidores(proyecto.id, c.ids);
      if (c.principalId === proyecto.competidorPrincipalId) return;
      try {
        await datos.actualizarProyecto(proyecto.id, { competidorPrincipalId: c.principalId });
      } catch (falla) {
        const detalle = falla instanceof ErrorDatos ? falla.message : 'inténtalo de nuevo';
        throw new ErrorDatos(falla instanceof ErrorDatos ? falla.codigo : 'otro', `Guardamos los competidores, pero no el principal: ${detalle}`);
      }
    },
    'Competidores guardados.',
  );

  const titulo = (
    <h2 id="sec-competidores" className="font-display text-(length:--t-26) uppercase">
      Competidores
    </h2>
  );

  if (!puedeEditar) {
    const principalActual = proyecto.competidores.find((c) => c.id === proyecto.competidorPrincipalId);
    return (
      <section aria-labelledby="sec-competidores" className="flex flex-col gap-e2">
        {titulo}
        <ul className="list-disc pl-e6">
          {proyecto.competidores.map((c) => (
            <li key={c.id}>{c.nombre}</li>
          ))}
        </ul>
        {principalActual && <p className="text-(length:--t-14) text-tinta-2">{`Competidor principal (para P2): ${principalActual.nombre}`}</p>}
      </section>
    );
  }

  const delCatalogo = (catalogo.data ?? []).filter((m) => m.id !== proyecto.marca.id);
  const ofrecidas = [...delCatalogo, ...proyecto.competidores.filter((c) => !delCatalogo.some((m) => m.id === c.id))];
  const seleccion = ofrecidas.filter((m) => elegidos.includes(m.id));
  const principalVisible = seleccion.some((m) => m.id === principal) ? principal! : (seleccion[0]?.id ?? '');

  function alternar(id: string) {
    if (elegidos.includes(id)) {
      setLimite(false);
      return setElegidos(elegidos.filter((x) => x !== id));
    }
    if (elegidos.length >= MAXIMO) return setLimite(true);
    setLimite(false);
    setElegidos([...elegidos, id]);
  }

  if (catalogo.isPending) return <p role="status">Cargando…</p>;

  return (
    <section aria-labelledby="sec-competidores" className="flex max-w-[34rem] flex-col gap-e4">
      {titulo}
      <ul className="flex flex-col gap-e2">
        {ofrecidas.map((m) => (
          <li key={m.id}>
            <label className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
              <input type="checkbox" checked={elegidos.includes(m.id)} onChange={() => alternar(m.id)} />
              {m.nombre}
            </label>
          </li>
        ))}
      </ul>
      {limite && (
        <p role="status" className="text-(length:--t-14) text-tinta-2">
          Hasta 5 competidores.
        </p>
      )}
      {seleccion.length > 0 && (
        <label className="flex max-w-[26rem] flex-col gap-e2 text-(length:--t-14) font-semibold">
          Competidor principal (para P2)
          <select value={principalVisible} onChange={(e) => setPrincipal(e.target.value)} className={estiloCampo}>
            {seleccion.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {seleccion.length === 0 && <p className="text-(length:--t-14) text-error">Elige al menos un competidor.</p>}
      <Mensajes error={guardar.error} aviso={guardar.aviso} />
      <button
        type="button"
        disabled={seleccion.length === 0 || guardar.pendiente}
        onClick={() => guardar.ejecutar({ ids: seleccion.map((m) => m.id), principalId: principalVisible })}
        className={`${estiloBotonMod} self-start`}
      >
        Guardar competidores
      </button>
    </section>
  );
}
