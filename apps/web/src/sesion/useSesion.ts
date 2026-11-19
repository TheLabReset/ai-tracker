import type { Perfil } from '@lab/datos';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDatos } from '../app/proveedores';

export const CLAVE_SESION = ['sesion'] as const;

export function useSesion() {
  const datos = useDatos();
  const cliente = useQueryClient();
  const consulta = useQuery({ queryKey: CLAVE_SESION, queryFn: () => datos.sesionActual() });

  const olvidarDatos = () => cliente.removeQueries({ predicate: (q) => q.queryKey[0] !== CLAVE_SESION[0] });

  return {
    perfil: (consulta.data ?? null) as Perfil | null,
    cargando: consulta.isPending,
    async entrar(correo: string, clave: string) {
      const perfil = await datos.entrar(correo, clave);
      olvidarDatos();
      cliente.setQueryData(CLAVE_SESION, perfil);
    },
    async salir() {
      await datos.salir();
      olvidarDatos();
      cliente.setQueryData(CLAVE_SESION, null);
    },
  };
}
