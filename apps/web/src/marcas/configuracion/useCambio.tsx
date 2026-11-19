import { ErrorDatos } from '@lab/datos';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function useCambio<V = void>(proyectoId: string, accion: (v: V) => Promise<unknown>, exito: string | null = null) {
  const cliente = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const mutacion = useMutation({
    mutationFn: accion,
    onMutate: () => {
      setError(null);
      setAviso(null);
    },
    onSuccess: async () => {
      await Promise.all([cliente.invalidateQueries({ queryKey: ['proyecto', proyectoId] }), cliente.invalidateQueries({ queryKey: ['proyectos'] })]);
      setAviso(exito);
    },
    onError: (falla) => setError(falla instanceof ErrorDatos ? falla.message : 'No pudimos guardar. Inténtalo de nuevo.'),
  });
  return { ejecutar: mutacion.mutate, pendiente: mutacion.isPending, error, aviso };
}

export function Mensajes({ error, aviso }: { error: string | null; aviso: string | null }) {
  return (
    <>
      {error && (
        <p role="alert" className="text-(length:--t-14) text-error">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-(length:--t-14) text-tinta-2">
          {aviso}
        </p>
      )}
    </>
  );
}
