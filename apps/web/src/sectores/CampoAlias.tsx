import { claveMarca, sugerirAmbiguo } from '@lab/nucleo';
import { useRef } from 'react';
import { estiloBotonLinea } from '../app/estilos';
import { estiloCampo } from '../sesion/MarcoAcceso';

export interface TerminoEditable {
  texto: string;
  ambiguo: boolean;
}

export function AvisoAmbiguo({ termino }: { termino: string }) {
  return <p className="text-(length:--t-14) text-tinta-2">«{termino.trim()}» es una palabra común: la marcamos como ambigua.</p>;
}

export function avisaAmbiguo(t: TerminoEditable): boolean {
  return t.ambiguo && t.texto.trim() !== '' && sugerirAmbiguo(t.texto);
}

/** Marca ambiguo según sugerirAmbiguo, salvo que la persona ya lo haya cambiado para ese mismo término. */
export function useAmbiguoAutomatico(valor: TerminoEditable, onCambio: (nuevo: TerminoEditable) => void) {
  const tocado = useRef<string | null>(null);
  return {
    cambiarTexto(texto: string) {
      const clave = claveMarca(texto);
      const ambiguo = tocado.current === clave ? valor.ambiguo : texto.trim() !== '' && sugerirAmbiguo(texto);
      onCambio({ texto, ambiguo });
    },
    cambiarAmbiguo(ambiguo: boolean) {
      tocado.current = claveMarca(valor.texto);
      onCambio({ texto: valor.texto, ambiguo });
    },
  };
}

interface PropsTermino {
  etiquetaTexto: string;
  etiquetaAmbiguo: string;
  valor: TerminoEditable;
  onCambio: (nuevo: TerminoEditable) => void;
}

export function CampoTermino({ etiquetaTexto, etiquetaAmbiguo, valor, onCambio }: PropsTermino) {
  const { cambiarTexto, cambiarAmbiguo } = useAmbiguoAutomatico(valor, onCambio);
  return (
    <div className="flex flex-col gap-e2">
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        {etiquetaTexto}
        <input type="text" value={valor.texto} onChange={(e) => cambiarTexto(e.target.value)} className={estiloCampo} />
      </label>
      {avisaAmbiguo(valor) && <AvisoAmbiguo termino={valor.texto} />}
      <label className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
        <input type="checkbox" checked={valor.ambiguo} onChange={(e) => cambiarAmbiguo(e.target.checked)} />
        {etiquetaAmbiguo}
      </label>
    </div>
  );
}

function FilaAlias({ indice, valor, onCambio, onQuitar }: { indice: number; valor: TerminoEditable; onCambio: (n: TerminoEditable) => void; onQuitar: () => void }) {
  const { cambiarTexto, cambiarAmbiguo } = useAmbiguoAutomatico(valor, onCambio);
  return (
    <li className="flex flex-col gap-e2 rounded-card bg-capsula p-e4">
      <input type="text" aria-label={`Alias ${indice + 1}`} value={valor.texto} onChange={(e) => cambiarTexto(e.target.value)} className={estiloCampo} />
      {avisaAmbiguo(valor) && <AvisoAmbiguo termino={valor.texto} />}
      <div className="flex items-center justify-between gap-e4">
        <label className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
          <input type="checkbox" aria-label={`Ambiguo del alias ${indice + 1}`} checked={valor.ambiguo} onChange={(e) => cambiarAmbiguo(e.target.checked)} />
          Ambiguo
        </label>
        <button type="button" onClick={onQuitar} className={estiloBotonLinea}>
          Descartar alias {indice + 1}
        </button>
      </div>
    </li>
  );
}

export function CampoAlias({ valor, onCambio }: { valor: TerminoEditable[]; onCambio: (nuevo: TerminoEditable[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-e2">
      <legend className="text-(length:--t-14) font-semibold">Alias</legend>
      {valor.length > 0 && (
        <ul className="flex flex-col gap-e2">
          {valor.map((a, i) => (
            <FilaAlias
              key={i}
              indice={i}
              valor={a}
              onCambio={(n) => onCambio(valor.map((x, j) => (j === i ? n : x)))}
              onQuitar={() => onCambio(valor.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
      )}
      <button type="button" onClick={() => onCambio([...valor, { texto: '', ambiguo: false }])} className={`${estiloBotonLinea} self-start`}>
        Agregar un alias
      </button>
    </fieldset>
  );
}
