import { entorno } from './entorno';

export default async function setup(): Promise<void> {
  try {
    const { url, claveAnonima } = entorno();
    const r = await fetch(`${url}/rest/v1/`, { headers: { apikey: claveAnonima } });
    if (!r.ok) throw new Error(String(r.status));
  } catch {
    throw new Error('Levanta la base con "pnpm db:iniciar"');
  }
}
