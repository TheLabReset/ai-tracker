import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ClienteTracker = SupabaseClient<any, 'tracker'>;

export function crearClienteTracker(url: string, clave: string): ClienteTracker {
  return createClient<any, 'tracker'>(url, clave, {
    db: { schema: 'tracker' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
