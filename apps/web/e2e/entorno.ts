import { execFileSync } from 'node:child_process';

export interface EntornoE2E {
  url: string;
  claveAnonima: string;
  claveServicio: string;
}

export function leerEntorno(): EntornoE2E {
  try {
    const salida = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const estado = JSON.parse(salida.slice(salida.indexOf('{'))) as Record<string, string>;
    const url = estado.API_URL;
    const claveAnonima = estado.ANON_KEY ?? estado.PUBLISHABLE_KEY;
    const claveServicio = estado.SERVICE_ROLE_KEY ?? estado.SECRET_KEY;
    if (!url || !claveAnonima || !claveServicio) throw new Error('incompleto');
    return { url, claveAnonima, claveServicio };
  } catch {
    throw new Error('Levanta la base con "pnpm db:iniciar"');
  }
}
