import type { Proyecto } from '@lab/datos';
import type { Cadencia } from '@lab/nucleo';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { estiloBotonMod } from '../../app/estilos';
import { useDatos } from '../../app/proveedores';
import { estiloCampo } from '../../sesion/MarcoAcceso';
import { Mensajes, useCambio } from './useCambio';

const estiloEtiqueta = 'flex flex-col gap-e2 text-(length:--t-14) font-semibold';
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const CADENCIAS: Array<{ valor: Cadencia; etiqueta: string }> = [
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'quincenal', etiqueta: 'Quincenal' },
  { valor: 'manual', etiqueta: 'Manual' },
];

export function MotoresYCadencia({ proyecto, puedeEditar }: { proyecto: Proyecto; puedeEditar: boolean }) {
  const datos = useDatos();
  const motores = useQuery({ queryKey: ['motores'], queryFn: () => datos.listarMotores(), enabled: puedeEditar });
  const [motorIds, setMotorIds] = useState(() => proyecto.motores.map((m) => m.id));
  const [cadencia, setCadencia] = useState<Cadencia>(proyecto.cadencia);
  const [dia, setDia] = useState(proyecto.diaSemana);
  const [hora, setHora] = useState(proyecto.hora);
  const [muestras, setMuestras] = useState(String(proyecto.muestras));
  const [tope, setTope] = useState(proyecto.topeGastoMensual === null ? '' : String(proyecto.topeGastoMensual));
  const guardar = useCambio(proyecto.id, (c: Parameters<typeof datos.actualizarProyecto>[1]) => datos.actualizarProyecto(proyecto.id, c), 'Motores y cadencia guardados.');

  const titulo = (
    <h2 id="sec-motores" className="font-display text-(length:--t-26) uppercase">
      Motores y cadencia
    </h2>
  );

  if (!puedeEditar) {
    const cadenciaTexto = CADENCIAS.find((c) => c.valor === proyecto.cadencia)!.etiqueta;
    return (
      <section aria-labelledby="sec-motores" className="flex flex-col gap-e2">
        {titulo}
        <p>{`Motores: ${proyecto.motores.map((m) => m.nombre).join(', ')}`}</p>
        <p>{proyecto.cadencia === 'manual' ? `Cadencia: ${cadenciaTexto}` : `Cadencia: ${cadenciaTexto}, ${DIAS[proyecto.diaSemana]} ${proyecto.hora}`}</p>
        <p>{`Muestras: ${proyecto.muestras}`}</p>
        <p>{proyecto.topeGastoMensual === null ? 'Tope de gasto mensual: sin tope' : `Tope de gasto mensual: US$ ${proyecto.topeGastoMensual}`}</p>
      </section>
    );
  }

  if (motores.isPending) return <p role="status">Cargando…</p>;

  const ofrecidos = (motores.data ?? []).filter((m) => m.activo || motorIds.includes(m.id));
  const nMuestras = muestras.trim() === '' ? NaN : Number(muestras);
  const nTope = tope.trim() === '' ? null : Number(tope);
  const errores = [
    ...(motorIds.length === 0 ? ['Elige al menos un motor.'] : []),
    ...(!Number.isInteger(nMuestras) || nMuestras < 1 || nMuestras > 10 ? ['Las muestras van de 1 a 10.'] : []),
    ...(nTope !== null && !(Number.isFinite(nTope) && nTope >= 0) ? ['El tope debe ser un número mayor o igual a 0.'] : []),
    ...(hora === '' ? ['Elige la hora.'] : []),
  ];

  return (
    <section aria-labelledby="sec-motores" className="flex max-w-[26rem] flex-col gap-e4">
      {titulo}
      <fieldset className="flex flex-col gap-e2">
        <legend className="text-(length:--t-14) font-semibold">Motores</legend>
        {ofrecidos.map((m) => (
          <label key={m.id} className="flex items-center gap-e2 text-(length:--t-14) font-semibold">
            <input type="checkbox" checked={motorIds.includes(m.id)} onChange={() => setMotorIds(motorIds.includes(m.id) ? motorIds.filter((x) => x !== m.id) : [...motorIds, m.id])} />
            {m.nombre}
          </label>
        ))}
      </fieldset>
      <label className={estiloEtiqueta}>
        Cadencia
        <select value={cadencia} onChange={(e) => setCadencia(e.target.value as Cadencia)} className={estiloCampo}>
          {CADENCIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </label>
      {cadencia !== 'manual' && (
        <>
          <label className={estiloEtiqueta}>
            Día
            <select value={dia} onChange={(e) => setDia(Number(e.target.value))} className={estiloCampo}>
              {DIAS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className={estiloEtiqueta}>
            Hora
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={estiloCampo} />
          </label>
        </>
      )}
      <label className={estiloEtiqueta}>
        Muestras
        <input type="number" min={1} max={10} value={muestras} onChange={(e) => setMuestras(e.target.value)} className={estiloCampo} />
      </label>
      <label className={estiloEtiqueta}>
        Tope de gasto mensual (US$)
        <input type="number" min={0} step="any" value={tope} onChange={(e) => setTope(e.target.value)} className={estiloCampo} />
      </label>
      {errores.map((e) => (
        <p key={e} className="text-(length:--t-14) text-error">
          {e}
        </p>
      ))}
      <Mensajes error={guardar.error} aviso={guardar.aviso} />
      <button
        type="button"
        disabled={errores.length > 0 || guardar.pendiente}
        onClick={() => guardar.ejecutar({ motorIds, cadencia, diaSemana: dia, hora, muestras: nMuestras, topeGastoMensual: nTope })}
        className={`${estiloBotonMod} self-start`}
      >
        Guardar
      </button>
    </section>
  );
}
