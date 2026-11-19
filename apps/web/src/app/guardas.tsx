import type { Perfil } from '@lab/datos';
import type { ReactNode } from 'react';
import { useSesion } from '../sesion/useSesion';

export function puedeCrearMarcas(perfil: Perfil): boolean {
  return perfil.esAdmin || perfil.membresias.some((m) => m.rol === 'lider');
}

export function SoloAdmin({ children }: { children: ReactNode }) {
  const { perfil } = useSesion();
  if (!perfil?.esAdmin) return <p className="p-e6 text-tinta-2">Esta sección es de The Lab.</p>;
  return <>{children}</>;
}
