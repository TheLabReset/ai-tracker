import type { NuevaMarca } from '@lab/datos';
import { claveMarca } from '@lab/nucleo';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { estiloBotonLinea, estiloBotonMod } from '../../app/estilos';
import { useDatos } from '../../app/proveedores';
import { CampoAlias, CampoTermino, type TerminoEditable } from '../../sectores/CampoAlias';
import { estiloCampo } from '../../sesion/MarcoAcceso';
import { MAX_COMPETIDORES, nombreDelCompetidor } from './borrador';
import type { PropsPaso } from './tipos';

const estiloAviso = 'text-(length:--t-14) text-tinta-2';

function FormularioCompetidor({ onAgregar, onCancelar }: { onAgregar: (m: NuevaMarca) => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState<TerminoEditable>({ texto: '', ambiguo: false });
  const [alias, setAlias] = useState<TerminoEditable[]>([]);
  return (
    <div className="flex max-w-[26rem] flex-col gap-e4 rounded-card bg-capsula p-e4">
      <CampoTermino etiquetaTexto="Nombre del competidor" etiquetaAmbiguo="Ambiguo" valor={nombre} onCambio={setNombre} />
      <CampoAlias valor={alias} onCambio={setAlias} />
      <div className="flex gap-e4">
        <button
          type="button"
          disabled={nombre.texto.trim() === ''}
          onClick={() => onAgregar({ nombre: nombre.texto.trim(), ambiguo: nombre.ambiguo, alias: alias.filter((a) => a.texto.trim() !== ''), dominios: [] })}
          className={estiloBotonMod}
        >
          Agregar
        </button>
        <button type="button" onClick={onCancelar} className={estiloBotonLinea}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function PasoCompetidores({ borrador, despachar }: PropsPaso) {
  const datos = useDatos();
  const sector = borrador.sector;
  const sectorId = sector && 'id' in sector ? sector.id : null;
  const marcas = useQuery({ queryKey: ['sectores', sectorId, 'marcas'], queryFn: () => datos.listarMarcas(sectorId!), enabled: sectorId !== null });
  const [agregando, setAgregando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const catalogo = marcas.data ?? [];
  const claveCliente = claveMarca(borrador.marca.nombre);
  const ofrecidas = catalogo.filter((m) => claveMarca(m.nombre) !== claveCliente);
  const elegida = (id: string) => borrador.competidores.some((c) => 'id' in c && c.id === id);
  const lleno = borrador.competidores.length >= MAX_COMPETIDORES;
  const avisoLimite = 'Hasta 5 competidores.';

  function alternar(id: string) {
    if (!elegida(id) && lleno) return setAviso(avisoLimite);
    setAviso(null);
    despachar({ tipo: 'alternarCompetidor', id });
  }

  function agregar(m: NuevaMarca) {
    setAgregando(false);
    const clave = claveMarca(m.nombre);
    if (clave === claveCliente) return setAviso('Esa es la marca que estás dando de alta.');
    const existente = ofrecidas.find((x) => claveMarca(x.nombre) === clave);
    if (existente) {
      if (!elegida(existente.id) && lleno) return setAviso(avisoLimite);
      if (!elegida(existente.id)) despachar({ tipo: 'alternarCompetidor', id: existente.id });
      return setAviso(`«${m.nombre}» ya está en el catálogo: la marcamos.`);
    }
    if (borrador.competidores.some((c) => 'nombre' in c && claveMarca(c.nombre) === clave)) return setAviso('Ya la agregaste.');
    if (lleno) return setAviso(avisoLimite);
    setAviso(null);
    despachar({ tipo: 'agregarCompetidor', marca: m });
  }

  const nuevos = borrador.competidores.flatMap((c, i) => ('nombre' in c ? [{ c, i }] : []));

  return (
    <div className="flex max-w-[34rem] flex-col gap-e4">
      <ul className="flex flex-col gap-e2">
        {ofrecidas.map((m) => (
          <li key={m.id}>
            <label className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
              <input type="checkbox" checked={elegida(m.id)} onChange={() => alternar(m.id)} />
              {m.nombre}
            </label>
          </li>
        ))}
        {nuevos.map(({ c, i }) => (
          <li key={`n${i}`}>
            <label className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
              <input type="checkbox" checked onChange={() => despachar({ tipo: 'quitarCompetidor', indice: i })} />
              {nombreDelCompetidor(c, catalogo)}
            </label>
          </li>
        ))}
      </ul>
      {aviso && (
        <p role="status" className={estiloAviso}>
          {aviso}
        </p>
      )}
      {agregando ? (
        <FormularioCompetidor onAgregar={agregar} onCancelar={() => setAgregando(false)} />
      ) : (
        <button type="button" onClick={() => setAgregando(true)} className={`${estiloBotonLinea} self-start`}>
          Agregar competidor
        </button>
      )}
      {borrador.competidores.length > 0 && (
        <label className="flex max-w-[26rem] flex-col gap-e2 text-(length:--t-14) font-semibold">
          Competidor principal (para P2)
          <select value={borrador.competidorPrincipal} onChange={(e) => despachar({ tipo: 'competidorPrincipal', indice: Number(e.target.value) })} className={estiloCampo}>
            {borrador.competidores.map((c, i) => (
              <option key={i} value={i}>
                {nombreDelCompetidor(c, catalogo)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
