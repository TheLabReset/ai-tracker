import type { TipoPregunta } from '@lab/nucleo';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { estiloBotonLinea, estiloBotonMod } from '../../app/estilos';
import { ETIQUETA_TIPO } from '../../app/etiquetas';
import { useDatos } from '../../app/proveedores';
import { estiloCampo } from '../../sesion/MarcoAcceso';
import { nombreDelCompetidor, preguntasDelBorrador } from './borrador';
import type { PropsPaso } from './tipos';

const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoPregunta[];
const estiloEtiqueta = 'flex flex-col gap-e2 text-(length:--t-14) font-semibold';

function FormularioPropia({ onAgregar, onCancelar }: { onAgregar: (p: { tipo: TipoPregunta; texto: string }) => void; onCancelar: () => void }) {
  const [tipo, setTipo] = useState<TipoPregunta>('descubrimiento');
  const [texto, setTexto] = useState('');
  return (
    <div className="flex max-w-[26rem] flex-col gap-e4 rounded-card bg-capsula p-e4">
      <label className={estiloEtiqueta}>
        Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPregunta)} className={estiloCampo}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO[t]}
            </option>
          ))}
        </select>
      </label>
      <label className={estiloEtiqueta}>
        Texto
        <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} className={estiloCampo} />
      </label>
      <div className="flex gap-e4">
        <button type="button" disabled={texto.trim() === ''} onClick={() => onAgregar({ tipo, texto: texto.trim() })} className={estiloBotonMod}>
          Agregar
        </button>
        <button type="button" onClick={onCancelar} className={estiloBotonLinea}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function PasoPreguntas({ borrador, despachar }: PropsPaso) {
  const datos = useDatos();
  const sector = borrador.sector;
  const sectorId = sector && 'id' in sector ? sector.id : null;
  const sectores = useQuery({ queryKey: ['sectores'], queryFn: () => datos.listarSectores() });
  const marcas = useQuery({ queryKey: ['sectores', sectorId, 'marcas'], queryFn: () => datos.listarMarcas(sectorId!), enabled: sectorId !== null });
  const [agregando, setAgregando] = useState(false);
  const categoria = sector && 'nombre' in sector ? sector.categoria : sectores.data?.find((s) => s.id === sectorId)?.categoria;
  const principal = borrador.competidores[borrador.competidorPrincipal];
  const competidor = principal ? nombreDelCompetidor(principal, marcas.data ?? []) : '';
  if (!categoria || competidor === '') return <p role="status">Cargando…</p>;

  const preguntas = preguntasDelBorrador(borrador, { marca: borrador.marca.nombre.trim(), competidor, categoria });
  return (
    <div className="flex max-w-[40rem] flex-col gap-e4">
      <ul className="flex flex-col gap-e2">
        {preguntas.map((p, n) => (
          <li key={p.codigo} className="flex flex-col gap-e1 rounded-card bg-capsula p-e4">
            <div className="flex items-center justify-between gap-e4 text-(length:--t-14) text-tinta-2">
              <span>
                <span className="font-semibold">{p.codigo}</span> · <span>{p.set === 'compat' ? 'Ficha' : p.set === 'propia' ? 'Propia' : p.categoria}</span>
              </span>
              {p.set === 'propia' && (
                <button type="button" onClick={() => despachar({ tipo: 'quitarPreguntaPropia', indice: n - (preguntas.length - borrador.preguntasPropias.length) })} className={estiloBotonLinea}>
                  Quitar pregunta {p.codigo}
                </button>
              )}
            </div>
            <p>{p.texto}</p>
          </li>
        ))}
      </ul>
      {agregando ? (
        <FormularioPropia
          onAgregar={(pregunta) => {
            despachar({ tipo: 'preguntaPropia', pregunta });
            setAgregando(false);
          }}
          onCancelar={() => setAgregando(false)}
        />
      ) : (
        <button type="button" onClick={() => setAgregando(true)} className={`${estiloBotonLinea} self-start`}>
          Agregar pregunta propia
        </button>
      )}
    </div>
  );
}
