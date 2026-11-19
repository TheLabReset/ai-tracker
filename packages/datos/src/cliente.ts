import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ClienteTracker = SupabaseClient<any, 'tracker'>;

export interface OpcionesCliente {
  persistirSesion?: boolean;
}

export function crearClienteTracker(url: string, clave: string, opciones: OpcionesCliente = {}): ClienteTracker {
  const persistir = opciones.persistirSesion ?? false;
  return createClient<any, 'tracker'>(url, clave, {
    db: { schema: 'tracker' },
    auth: persistir
      ? { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      : { persistSession: false, autoRefreshToken: false },
  });
}
