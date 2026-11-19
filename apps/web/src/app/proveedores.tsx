import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Datos } from '@lab/datos';
import { createContext, useContext, useState, type ReactNode } from 'react';

const DatosContext = createContext<Datos | null>(null);

export function useDatos(): Datos {
  const datos = useContext(DatosContext);
  if (!datos) throw new Error('useDatos debe usarse dentro de <Proveedores>');
  return datos;
}

export function Proveedores({ datos, children }: { datos: Datos; children: ReactNode }) {
  const [cliente] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={cliente}>
      <DatosContext.Provider value={datos}>{children}</DatosContext.Provider>
    </QueryClientProvider>
  );
}
