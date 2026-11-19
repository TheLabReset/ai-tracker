import { execFileSync } from 'node:child_process';
import { crearClienteTracker, type ClienteTracker } from '../../src/cliente';

export interface EntornoDb {
  url: string;
  claveAnonima: string;
  claveServicio: string;
}

let cache: EntornoDb | undefined;

export function entorno(): EntornoDb {
  if (cache) return cache;
  const salida = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const estado = JSON.parse(salida.slice(salida.indexOf('{'))) as Record<string, string>;
  const url = estado.API_URL;
  const claveAnonima = estado.ANON_KEY ?? estado.PUBLISHABLE_KEY;
  const claveServicio = estado.SERVICE_ROLE_KEY ?? estado.SECRET_KEY;
  if (!url || !claveAnonima || !claveServicio) throw new Error('Levanta la base con "pnpm db:iniciar"');
  cache = { url, claveAnonima, claveServicio };
  return cache;
}

export function clienteServicio(): ClienteTracker {
  const { url, claveServicio } = entorno();
  return crearClienteTracker(url, claveServicio);
}
