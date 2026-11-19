import { claveMarca } from '@lab/nucleo';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { estiloBotonLinea } from '../../app/estilos';
import { useDatos } from '../../app/proveedores';
import { estiloCampo } from '../../sesion/MarcoAcceso';
import { erroresDelPaso } from './borrador';
import type { PropsPaso } from './tipos';

const estiloEtiqueta = 'flex flex-col gap-e2 text-(length:--t-14) font-semibold';
const estiloAviso = 'text-(length:--t-14) text-tinta-2';

function AvisosDelSector({ sectorId, nombreMarca }: { sectorId: string; nombreMarca: string }) {
  const datos = useDatos();
  const sectores = useQuery({ queryKey: ['sectores'], queryFn: () => datos.listarSectores() });
  const marcas = useQuery({ queryKey: ['sectores', sectorId, 'marcas'], queryFn: () => datos.listarMarcas(sectorId) });
  if (!marcas.data) return null;
  const n = marcas.data.length;
  const sector = sectores.data?.find((s) => s.id === sectorId);
  const yaEsta = nombreMarca.trim() !== '' && marcas.data.some((m) => claveMarca(m.nombre) === claveMarca(nombreMarca));
  return (
    <>
      <p className={estiloAviso}>Hereda el catálogo de {n === 1 ? '1 marca' : `${n} marcas`} y sus plantillas.</p>
      {yaEsta && sector && (
        <p className={estiloAviso}>
          «{nombreMarca.trim()}» ya está en el catálogo de {sector.nombre}: la tomamos como marca cliente.
        </p>
      )}
    </>
  );
}

export function PasoSector({ borrador, despachar }: PropsPaso) {
  const datos = useDatos();
  const sectores = useQuery({ queryKey: ['sectores'], queryFn: () => datos.listarSectores() });
  const sector = borrador.sector;
  const [creando, setCreando] = useState(sector !== null && 'nombre' in sector);
  const [extra, setExtra] = useState(borrador.categoriasExtra.join(', '));
  const nuevo = sector && 'nombre' in sector ? sector : null;
  const principal = nuevo ? nuevo.categoria : (sectores.data?.find((s) => sector && 'id' in sector && s.id === sector.id)?.categoria ?? null);
  const errores = erroresDelPaso(borrador, 2, { sectores: sectores.data ?? [] }).filter((e) => e.startsWith('Ya existe'));

  return (
    <div className="flex max-w-[26rem] flex-col gap-e4">
      {creando ? (
        <>
          <label className={estiloEtiqueta}>
            Nombre del sector
            <input type="text" value={nuevo?.nombre ?? ''} onChange={(e) => despachar({ tipo: 'sectorNuevo', nombre: e.target.value, categoria: nuevo?.categoria ?? '' })} className={estiloCampo} />
          </label>
          {errores.map((e) => (
            <p key={e} role="alert" className="text-(length:--t-14) text-error">
              {e}
            </p>
          ))}
          <label className={estiloEtiqueta}>
            Categoría
            <input type="text" value={nuevo?.categoria ?? ''} onChange={(e) => despachar({ tipo: 'sectorNuevo', nombre: nuevo?.nombre ?? '', categoria: e.target.value })} className={estiloCampo} />
          </label>
          <button
            type="button"
            onClick={() => {
              setCreando(false);
              despachar({ tipo: 'sinSector' });
            }}
            className={`${estiloBotonLinea} self-start`}
          >
            Elegir un sector existente
          </button>
        </>
      ) : (
        <>
          <label className={estiloEtiqueta}>
            Sector
            <select
              value={sector && 'id' in sector ? sector.id : ''}
              onChange={(e) => despachar(e.target.value === '' ? { tipo: 'sinSector' } : { tipo: 'sectorExistente', id: e.target.value })}
              className={estiloCampo}
            >
              <option value="">Elige un sector</option>
              {(sectores.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setCreando(true);
              despachar({ tipo: 'sectorNuevo', nombre: '', categoria: '' });
            }}
            className={`${estiloBotonLinea} self-start`}
          >
            Crear sector
          </button>
          {sector && 'id' in sector && <AvisosDelSector sectorId={sector.id} nombreMarca={borrador.marca.nombre} />}
        </>
      )}
      <label className={estiloEtiqueta}>
        Categorías más específicas
        <input
          type="text"
          value={extra}
          onChange={(e) => {
            setExtra(e.target.value);
            despachar({ tipo: 'categoriasExtra', texto: e.target.value, principal });
          }}
          className={estiloCampo}
        />
      </label>
      <p className={estiloAviso}>Opcional. Por ejemplo: pollo, embutidos.</p>
    </div>
  );
}
