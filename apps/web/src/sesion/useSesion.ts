import type { Perfil } from '@lab/datos';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDatos } from '../app/proveedores';

export const CLAVE_SESION = ['sesion'] as const;

export function useSesion() {
  const datos = useDatos();
  const cliente = useQueryClient();
  const consulta = useQuery({ queryKey: CLAVE_SESION, queryFn: () => datos.sesionActual() });

  return {
    perfil: (consulta.data ?? null) as Perfil | null,
    cargando: consulta.isPending,
    async entrar(correo: string, clave: string) {
      cliente.setQueryData(CLAVE_SESION, await datos.entrar(correo, clave));
    },
    async salir() {
      await datos.salir();
      cliente.removeQueries({ predicate: (q) => q.queryKey[0] !== CLAVE_SESION[0] });
      cliente.setQueryData(CLAVE_SESION, null);
    },
  };
}
