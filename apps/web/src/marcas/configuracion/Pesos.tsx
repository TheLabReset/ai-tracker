import type { Proyecto } from '@lab/datos';
import { useState } from 'react';
import { estiloBotonMod } from '../../app/estilos';
import { useDatos } from '../../app/proveedores';
import { estiloCampo } from '../../sesion/MarcoAcceso';
import { Mensajes, useCambio } from './useCambio';

const POSICIONES = [1, 2, 3] as const;
const valido = (t: string) => t.trim() !== '' && Number.isFinite(Number(t)) && Number(t) >= 0;

export function Pesos({ proyecto, puedeEditar }: { proyecto: Proyecto; puedeEditar: boolean }) {
  const datos = useDatos();
  const [valores, setValores] = useState(() => POSICIONES.map((n) => String(proyecto.pesos[n])));
  const guardar = useCambio(proyecto.id, (pesos: Proyecto['pesos']) => datos.actualizarProyecto(proyecto.id, { pesos }), 'Pesos guardados.');
  const todosValidos = valores.every(valido);

  const titulo = (
    <h2 id="sec-pesos" className="font-display text-(length:--t-26) uppercase">
      Pesos
    </h2>
  );

  if (!puedeEditar) {
    return (
      <section aria-labelledby="sec-pesos" className="flex flex-col gap-e2">
        {titulo}
        {POSICIONES.map((n) => (
          <p key={n}>{`${n}.º: ${proyecto.pesos[n]}`}</p>
        ))}
      </section>
    );
  }

  return (
    <section aria-labelledby="sec-pesos" className="flex max-w-[26rem] flex-col gap-e4">
      {titulo}
      {POSICIONES.map((n, i) => (
        <label key={n} className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
          {`${n}.º`}
          <input type="number" min={0} step="any" value={valores[i]} onChange={(e) => setValores(valores.map((v, j) => (j === i ? e.target.value : v)))} className={estiloCampo} />
        </label>
      ))}
      {!todosValidos && <p className="text-(length:--t-14) text-error">Escribe un número mayor o igual a 0 en cada peso.</p>}
      <Mensajes error={guardar.error} aviso={guardar.aviso} />
      <button
        type="button"
        disabled={!todosValidos || guardar.pendiente}
        onClick={() => guardar.ejecutar({ 1: Number(valores[0]), 2: Number(valores[1]), 3: Number(valores[2]) })}
        className={`${estiloBotonMod} self-start`}
      >
        Guardar pesos
      </button>
    </section>
  );
}
