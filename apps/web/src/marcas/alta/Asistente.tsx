import type { Perfil } from '@lab/datos';
import { useQuery } from '@tanstack/react-query';
import { useReducer, useState, type ComponentType } from 'react';
import { estiloBotonLinea, estiloBotonMod } from '../../app/estilos';
import { puedeCrearMarcas } from '../../app/guardas';
import { useDatos } from '../../app/proveedores';
import { useSesion } from '../../sesion/useSesion';
import { aplicar, borradorInicial, erroresDelPaso, PASOS } from './borrador';
import { PasoCompetidores } from './PasoCompetidores';
import { PasoConfirmar } from './PasoConfirmar';
import { PasoExploracion } from './PasoExploracion';
import { PasoMarca } from './PasoMarca';
import { PasoMotores } from './PasoMotores';
import { PasoPreguntas } from './PasoPreguntas';
import { PasoSector } from './PasoSector';
import type { PropsPaso } from './tipos';

const COMPONENTES: Array<ComponentType<PropsPaso>> = [PasoMarca, PasoSector, PasoExploracion, PasoCompetidores, PasoPreguntas, PasoMotores, PasoConfirmar];

function Asistido({ perfil }: { perfil: Perfil }) {
  const datos = useDatos();
  const sectores = useQuery({ queryKey: ['sectores'], queryFn: () => datos.listarSectores() });
  const [borrador, despachar] = useReducer(aplicar, perfil, borradorInicial);
  const [paso, setPaso] = useState(1);
  const errores = erroresDelPaso(borrador, paso, { sectores: sectores.data ?? [] });
  const Paso = COMPONENTES[paso - 1]!;
  const etiqueta = (n: number) => `${n}. ${PASOS[n - 1]}`;

  return (
    <div className="flex flex-col gap-e6 py-e6">
      <h1 className="font-display text-(length:--t-40) uppercase">Nueva marca</h1>
      <ol className="flex flex-wrap gap-e4 text-(length:--t-14)">
        {PASOS.map((_, i) => (
          <li key={i} aria-current={paso === i + 1 ? 'step' : undefined} className={paso === i + 1 ? 'font-bold' : 'text-tinta-3'}>
            {etiqueta(i + 1)}
          </li>
        ))}
      </ol>
      <h2 className="font-display text-(length:--t-26) uppercase">{etiqueta(paso)}</h2>
      <Paso borrador={borrador} despachar={despachar} />
      <div className="flex gap-e4">
        {paso > 1 && (
          <button type="button" onClick={() => setPaso(paso - 1)} className={estiloBotonLinea}>
            Volver
          </button>
        )}
        {paso < PASOS.length && (
          <button type="button" disabled={errores.length > 0} onClick={() => setPaso(paso + 1)} className={estiloBotonMod}>
            Seguir
          </button>
        )}
      </div>
    </div>
  );
}

export function Asistente() {
  const { perfil, cargando } = useSesion();
  if (cargando) return <p role="status">Cargando…</p>;
  if (!perfil || !puedeCrearMarcas(perfil)) return <p className="py-e8 text-tinta-2">Solo un admin o un líder puede dar de alta una marca.</p>;
  return <Asistido perfil={perfil} />;
}
