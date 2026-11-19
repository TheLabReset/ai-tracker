import { useEffect, useRef, useState } from 'react';
import { useSesion } from '../sesion/useSesion';

export function MenuUsuario({ nombre }: { nombre: string }) {
  const { salir } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    const alPulsar = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('keydown', alTeclear);
    document.addEventListener('mousedown', alPulsar);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.removeEventListener('mousedown', alPulsar);
    };
  }, [abierto]);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className="h-(--alto-accion) rounded-pildora border border-linea bg-control px-e6 text-(length:--t-14) font-semibold"
      >
        {nombre}
      </button>
      {abierto && (
        <div role="menu" className="absolute right-0 z-(--z-flotante) mt-e2 min-w-40 rounded-flotante border border-linea bg-capsula p-e2">
          <button type="button" role="menuitem" onClick={salir} className="w-full rounded-formulario px-e4 py-e2 text-left text-(length:--t-14) hover:bg-realce">
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
