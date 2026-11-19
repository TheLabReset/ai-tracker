import type { PreguntaProyecto, Proyecto } from '@lab/datos';
import type { TipoPregunta } from '@lab/nucleo';
import { useState } from 'react';
import { estiloBotonLinea, estiloBotonMod } from '../../app/estilos';
import { ETIQUETA_TIPO } from '../../app/etiquetas';
import { useDatos } from '../../app/proveedores';
import { estiloCampo } from '../../sesion/MarcoAcceso';
import { Mensajes, useCambio } from './useCambio';

const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoPregunta[];
const estiloEtiqueta = 'flex flex-col gap-e2 text-(length:--t-14) font-semibold';

function etiquetaDe(p: PreguntaProyecto) {
  if (p.set === 'compat') return 'Ficha';
  if (p.set === 'propia') return 'Propia';
  return p.categoria ?? 'Extendida';
}

function Fila({ pregunta, proyectoId, puedeEditar, ultima }: { pregunta: PreguntaProyecto; proyectoId: string; puedeEditar: boolean; ultima: boolean }) {
  const datos = useDatos();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(pregunta.texto);
  const editar = useCambio(proyectoId, (t: string) => datos.editarPregunta(pregunta.id, t));
  const quitar = useCambio(proyectoId, () => datos.desactivarPregunta(pregunta.id));

  return (
    <li className="flex flex-col gap-e2 rounded-card bg-capsula p-e4">
      <div className="flex flex-wrap items-center gap-e2 text-(length:--t-14) text-tinta-2">
        <span className="font-bold">{pregunta.codigo}</span>
        <span>{etiquetaDe(pregunta)}</span>
        <span>{ETIQUETA_TIPO[pregunta.tipo]}</span>
        <span>{`v${pregunta.version}`}</span>
      </div>
      {editando ? (
        <div className="flex flex-col gap-e2">
          <input type="text" aria-label="Texto de la pregunta" value={texto} onChange={(e) => setTexto(e.target.value)} className={estiloCampo} />
          <div className="flex gap-e4">
            <button type="button" disabled={texto.trim() === '' || editar.pendiente} onClick={() => editar.ejecutar(texto, { onSuccess: () => setEditando(false) })} className={estiloBotonMod}>
              Guardar
            </button>
            <button type="button" onClick={() => { setEditando(false); setTexto(pregunta.texto); }} className={estiloBotonLinea}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <p>{pregunta.texto}</p>
          {puedeEditar && (
            <div className="flex gap-e4">
              <button type="button" onClick={() => { setTexto(pregunta.texto); setEditando(true); }} className={estiloBotonLinea}>
                Editar
              </button>
              <button type="button" disabled={ultima || quitar.pendiente} onClick={() => quitar.ejecutar()} className={estiloBotonLinea}>
                Quitar
              </button>
            </div>
          )}
        </>
      )}
      <Mensajes error={editar.error ?? quitar.error} aviso={null} />
    </li>
  );
}

function FormularioPropia({ proyectoId, alCerrar }: { proyectoId: string; alCerrar: () => void }) {
  const datos = useDatos();
  const [tipo, setTipo] = useState<TipoPregunta>('descubrimiento');
  const [texto, setTexto] = useState('');
  const agregar = useCambio(proyectoId, () => datos.agregarPregunta(proyectoId, { tipo, texto: texto.trim(), categoria: null }));
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
      <Mensajes error={agregar.error} aviso={null} />
      <div className="flex gap-e4">
        <button type="button" disabled={texto.trim() === '' || agregar.pendiente} onClick={() => agregar.ejecutar(undefined, { onSuccess: alCerrar })} className={estiloBotonMod}>
          Agregar
        </button>
        <button type="button" onClick={alCerrar} className={estiloBotonLinea}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function Preguntas({ proyecto, puedeEditar }: { proyecto: Proyecto; puedeEditar: boolean }) {
  const [agregando, setAgregando] = useState(false);
  return (
    <section aria-labelledby="sec-preguntas" className="flex flex-col gap-e4">
      <h2 id="sec-preguntas" className="font-display text-(length:--t-26) uppercase">
        Preguntas
      </h2>
      <ul className="flex flex-col gap-e2">
        {proyecto.preguntas.map((p) => (
          <Fila key={p.id} pregunta={p} proyectoId={proyecto.id} puedeEditar={puedeEditar} ultima={proyecto.preguntas.length === 1} />
        ))}
      </ul>
      {puedeEditar &&
        (agregando ? (
          <FormularioPropia proyectoId={proyecto.id} alCerrar={() => setAgregando(false)} />
        ) : (
          <button type="button" onClick={() => setAgregando(true)} className={`${estiloBotonLinea} self-start`}>
            Agregar pregunta propia
          </button>
        ))}
    </section>
  );
}
