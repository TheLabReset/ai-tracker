import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { normalizarDominios } from '../../app/dominios';
import { ETIQUETA_EMPRESA } from '../../app/etiquetas';
import { useDatos } from '../../app/proveedores';
import { AvisoAmbiguo, avisaAmbiguo, CampoAlias, useAmbiguoAutomatico } from '../../sectores/CampoAlias';
import { estiloCampo } from '../../sesion/MarcoAcceso';
import { useSesion } from '../../sesion/useSesion';
import type { PropsPaso } from './tipos';

const estiloEtiqueta = 'flex flex-col gap-e2 text-(length:--t-14) font-semibold';

export function PasoMarca({ borrador, despachar }: PropsPaso) {
  const datos = useDatos();
  const { perfil } = useSesion();
  const directorio = useQuery({ queryKey: ['directorio'], queryFn: () => datos.listarDirectorio() });
  const [dominios, setDominios] = useState(borrador.marca.dominios.join(', '));
  const nombre = { texto: borrador.marca.nombre, ambiguo: borrador.marca.ambiguo };
  const { cambiarTexto, cambiarAmbiguo } = useAmbiguoAutomatico(nombre, (valor) => despachar({ tipo: 'nombre', valor }));
  const personas = directorio.data ?? [];

  return (
    <div className="flex max-w-[26rem] flex-col gap-e4">
      <div className="flex flex-col gap-e2">
        <label className={estiloEtiqueta}>
          Nombre de la marca
          <input type="text" value={nombre.texto} onChange={(e) => cambiarTexto(e.target.value)} className={estiloCampo} />
        </label>
        <p className="text-(length:--t-14) text-tinta-2">Tal como se preguntará.</p>
        {avisaAmbiguo(nombre) && <AvisoAmbiguo termino={nombre.texto} />}
        <label className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
          <input type="checkbox" checked={nombre.ambiguo} onChange={(e) => cambiarAmbiguo(e.target.checked)} />
          Ambiguo
        </label>
      </div>
      <CampoAlias valor={borrador.marca.alias} onCambio={(valor) => despachar({ tipo: 'alias', valor })} />
      <label className={estiloEtiqueta}>
        Dominios
        <input
          type="text"
          value={dominios}
          onChange={(e) => {
            setDominios(e.target.value);
            despachar({ tipo: 'dominios', valor: normalizarDominios(e.target.value) });
          }}
          className={estiloCampo}
        />
      </label>
      <label className={estiloEtiqueta}>
        Empresa
        <select value={borrador.marca.empresaId} onChange={(e) => despachar({ tipo: 'empresa', valor: e.target.value as 'reset' | 'wanted' })} className={estiloCampo}>
          {Object.entries(ETIQUETA_EMPRESA).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </label>
      {perfil?.esAdmin ? (
        <label className={estiloEtiqueta}>
          Líder
          <select value={borrador.liderId ?? ''} onChange={(e) => despachar({ tipo: 'lider', id: e.target.value || undefined })} className={estiloCampo}>
            <option value="">Sin líder</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre || p.correo}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-(length:--t-14) font-semibold">Líder: tú</p>
      )}
      <label className={estiloEtiqueta}>
        Responsable
        <select value={borrador.responsableId ?? ''} onChange={(e) => despachar({ tipo: 'responsable', id: e.target.value || undefined })} className={estiloCampo}>
          <option value="">Sin responsable</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre || p.correo}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
