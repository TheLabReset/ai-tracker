import { estimarCostoVuelta, unirLista, type Cadencia } from '@lab/nucleo';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useDatos } from '../../app/proveedores';
import { estiloCampo } from '../../sesion/MarcoAcceso';
import { erroresDelPaso } from './borrador';
import type { PropsPaso } from './tipos';
import { usarDatosDelBorrador } from './usarDatosDelBorrador';

const estiloEtiqueta = 'flex flex-col gap-e2 text-(length:--t-14) font-semibold';
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const CADENCIAS: Array<{ valor: Cadencia; etiqueta: string }> = [
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'quincenal', etiqueta: 'Quincenal' },
  { valor: 'manual', etiqueta: 'Manual' },
];

export function PasoMotores({ borrador, despachar }: PropsPaso) {
  const datos = useDatos();
  const motores = useQuery({ queryKey: ['motores'], queryFn: () => datos.listarMotores() });
  const { preguntas } = usarDatosDelBorrador(borrador);
  const [muestras, setMuestras] = useState(String(borrador.muestras));
  const [tope, setTope] = useState(borrador.topeGastoMensual === null ? '' : String(borrador.topeGastoMensual));
  const llenado = useRef(false);
  const activos = (motores.data ?? []).filter((m) => m.activo);

  useEffect(() => {
    if (llenado.current || !motores.data) return;
    llenado.current = true;
    if (borrador.motorIds.length === 0) despachar({ tipo: 'motores', ids: activos.map((m) => m.id) });
  });

  if (motores.isPending) return <p role="status">Cargando…</p>;

  const errores = erroresDelPaso(borrador, 6, { sectores: [] });
  const elegidos = activos.filter((m) => borrador.motorIds.includes(m.id));
  const costo = errores.length === 0 && preguntas ? estimarCostoVuelta({ preguntas: preguntas.length, muestras: borrador.muestras, cadencia: borrador.cadencia, motores: elegidos.map((m) => ({ nombre: m.nombre, costoEstimado: m.costoEstimado })) }) : null;

  function alternar(id: string) {
    despachar({ tipo: 'motores', ids: borrador.motorIds.includes(id) ? borrador.motorIds.filter((x) => x !== id) : [...borrador.motorIds, id] });
  }

  let linea: string | null = null;
  if (costo) {
    if (costo.porVuelta === null) linea = `Costo por definir: faltan los precios de ${unirLista(costo.sinPrecio)}.`;
    else if (costo.porMes === null) linea = `Por vuelta: US$ ${costo.porVuelta.toFixed(2)} · Por mes: depende de cuántas vueltas lances.`;
    else linea = `Por vuelta: US$ ${costo.porVuelta.toFixed(2)} · Por mes: US$ ${costo.porMes.toFixed(2)}`;
  }

  return (
    <div className="flex max-w-[26rem] flex-col gap-e4">
      <fieldset className="flex flex-col gap-e2">
        <legend className="text-(length:--t-14) font-semibold">Motores</legend>
        {activos.map((m) => (
          <label key={m.id} className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
            <input type="checkbox" checked={borrador.motorIds.includes(m.id)} onChange={() => alternar(m.id)} />
            {m.nombre}
          </label>
        ))}
      </fieldset>
      <label className={estiloEtiqueta}>
        Cadencia
        <select value={borrador.cadencia} onChange={(e) => despachar({ tipo: 'programa', cambios: { cadencia: e.target.value as Cadencia } })} className={estiloCampo}>
          {CADENCIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </label>
      {borrador.cadencia !== 'manual' && (
        <>
          <label className={estiloEtiqueta}>
            Día
            <select value={borrador.diaSemana} onChange={(e) => despachar({ tipo: 'programa', cambios: { diaSemana: Number(e.target.value) } })} className={estiloCampo}>
              {DIAS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className={estiloEtiqueta}>
            Hora
            <input type="time" value={borrador.hora} onChange={(e) => despachar({ tipo: 'programa', cambios: { hora: e.target.value } })} className={estiloCampo} />
          </label>
        </>
      )}
      <label className={estiloEtiqueta}>
        Muestras
        <input
          type="number"
          min={1}
          max={10}
          value={muestras}
          onChange={(e) => {
            setMuestras(e.target.value);
            despachar({ tipo: 'programa', cambios: { muestras: e.target.value.trim() === '' ? NaN : Number(e.target.value) } });
          }}
          className={estiloCampo}
        />
      </label>
      <label className={estiloEtiqueta}>
        Tope de gasto mensual (US$)
        <input
          type="number"
          min={0}
          step="any"
          value={tope}
          onChange={(e) => {
            setTope(e.target.value);
            despachar({ tipo: 'programa', cambios: { topeGastoMensual: e.target.value.trim() === '' ? null : Number(e.target.value) } });
          }}
          className={estiloCampo}
        />
      </label>
      {errores.map((e) => (
        <p key={e} className="text-(length:--t-14) text-error">
          {e}
        </p>
      ))}
      {linea && <p className="text-(length:--t-14) text-tinta-2">{linea}</p>}
    </div>
  );
}
