import { ErrorDatos, type Plantilla } from '@lab/datos';
import { ErrorVariableFaltante, renderizarPlantilla, variablesDesconocidas, type TipoPregunta } from '@lab/nucleo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { estiloBotonLinea, estiloBotonMod } from '../app/estilos';
import { puedeCrearMarcas } from '../app/guardas';
import { useDatos } from '../app/proveedores';
import { estiloCampo } from '../sesion/MarcoAcceso';
import { useSesion } from '../sesion/useSesion';

const ETIQUETA_TIPO: Record<TipoPregunta, string> = { descubrimiento: 'Descubrimiento', comparativa: 'Comparativa', marca: 'Marca' };
const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoPregunta[];
const CODIGO_VALIDO = /^[A-Z0-9]+$/;

function siguienteCodigo(plantillas: Plantilla[]): string {
  const usados = new Set(plantillas.map((p) => p.codigo));
  let n = 1;
  while (usados.has(`N${n}`)) n++;
  return `N${n}`;
}

function vistaPrevia(texto: string, categoria: string): string | null {
  if (variablesDesconocidas(texto).length > 0 || /\{\s*\}/.test(texto)) return null;
  try {
    return renderizarPlantilla(texto, { categoria, marca: 'Tu marca', competidor: 'Tu competidor', ciudad: 'Lima', pais: 'Perú', necesidad: 'tu necesidad' });
  } catch (falla) {
    if (falla instanceof ErrorVariableFaltante) return null;
    throw falla;
  }
}

function FormularioPlantilla({ sectorId, categoria, plantillas, alCerrar }: { sectorId: string; categoria: string; plantillas: Plantilla[]; alCerrar: () => void }) {
  const datos = useDatos();
  const cliente = useQueryClient();
  const [codigo, setCodigo] = useState(() => siguienteCodigo(plantillas));
  const [tipo, setTipo] = useState<TipoPregunta>('descubrimiento');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () => datos.crearPlantilla({ codigo, sectorId, tipo, texto: texto.trim() }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['sectores', sectorId, 'plantillas'] });
      alCerrar();
    },
    onError: (falla) => setError(falla instanceof ErrorDatos ? falla.message : 'No pudimos guardar la plantilla. Inténtalo de nuevo.'),
  });

  const [desconocida] = variablesDesconocidas(texto);
  const previa = texto.trim() === '' ? null : vistaPrevia(texto, categoria);
  const invalido = !CODIGO_VALIDO.test(codigo) || texto.trim() === '' || desconocida !== undefined;

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    crear.mutate();
  }

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-[26rem] flex-col gap-e4 rounded-card bg-capsula p-e6">
      <h2 className="font-display text-(length:--t-26) uppercase">Nueva plantilla</h2>
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Código
        <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} className={estiloCampo} />
      </label>
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPregunta)} className={estiloCampo}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Texto
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} className={estiloCampo} />
      </label>
      {desconocida !== undefined && (
        <p role="alert" className="text-(length:--t-14) text-error">
          La variable {`{${desconocida}}`} no existe
        </p>
      )}
      {previa !== null && (
        <div className="flex flex-col gap-e1">
          <p className="text-(length:--t-14) font-semibold">Vista previa</p>
          <p>{previa}</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-(length:--t-14) text-error">
          {error}
        </p>
      )}
      <div className="flex gap-e4">
        <button type="submit" disabled={invalido || crear.isPending} aria-busy={crear.isPending} className={estiloBotonMod}>
          Guardar
        </button>
        <button type="button" onClick={alCerrar} className={estiloBotonLinea}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function Plantillas({ sectorId }: { sectorId: string }) {
  const datos = useDatos();
  const { perfil, cargando } = useSesion();
  const plantillas = useQuery({ queryKey: ['sectores', sectorId, 'plantillas'], queryFn: () => datos.listarPlantillas(sectorId) });
  const sectores = useQuery({ queryKey: ['sectores'], queryFn: () => datos.listarSectores() });
  const [creando, setCreando] = useState(false);

  if (plantillas.isPending || sectores.isPending || cargando) return <p role="status">Cargando…</p>;
  if ((plantillas.isError && !plantillas.data) || (sectores.isError && !sectores.data))
    return (
      <div role="alert" className="flex flex-col items-start gap-e4 py-e4">
        <p className="text-error">No pudimos cargar las plantillas.</p>
        <button type="button" onClick={() => { void plantillas.refetch(); void sectores.refetch(); }} className={estiloBotonMod}>
          Reintentar
        </button>
      </div>
    );

  const lista = plantillas.data ?? [];
  const categoria = sectores.data?.find((s) => s.id === sectorId)?.categoria ?? '';
  const puedeCrear = perfil !== null && puedeCrearMarcas(perfil);

  return (
    <div className="flex flex-col gap-e4">
      <ul className="flex flex-col gap-e2">
        {lista.map((p) => (
          <li key={p.id} className="flex flex-col gap-e1 rounded-card bg-capsula p-e4">
            <div className="flex items-center gap-e2 text-(length:--t-14)">
              <span className="font-semibold">{p.codigo}</span>
              <span className="text-tinta-2">{ETIQUETA_TIPO[p.tipo]}</span>
              {p.sectorId === null && <span className="rounded-pildora border border-linea px-e4 py-e1 font-semibold">Ficha</span>}
            </div>
            <p>{p.texto}</p>
          </li>
        ))}
      </ul>
      {puedeCrear && !creando && (
        <button type="button" onClick={() => setCreando(true)} className={`${estiloBotonMod} self-start`}>
          Nueva plantilla
        </button>
      )}
      {puedeCrear && creando && <FormularioPlantilla sectorId={sectorId} categoria={categoria} plantillas={lista} alCerrar={() => setCreando(false)} />}
    </div>
  );
}
