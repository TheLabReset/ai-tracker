import type { CategoriaDominio, CitaClasificada, Fuente, MarcaCatalogo, Respuesta } from './dominio';

export interface EntradaDominio {
  dominio: string;
  categoria: Exclude<CategoriaDominio, 'Web de marca'>;
}

export const REDES_SOCIALES: readonly string[] = [
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'linkedin.com',
  'reddit.com',
];

/** Host de la URL sin "www.", "m." ni "amp."; null si no es una URL http(s). */
export function dominioDe(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  return u.hostname.toLowerCase().replace(/^(www\d*|m|amp)\./, '');
}

function coincide(host: string, dominio: string): boolean {
  const d = dominio.toLowerCase();
  return host === d || host.endsWith(`.${d}`);
}

/** Clasifica una URL citada: web de una marca, catálogo del sector, red social u "Otra". */
export function clasificarCita(url: string, dominios: EntradaDominio[], marcas: MarcaCatalogo[]): CitaClasificada {
  const dominio = dominioDe(url);
  if (dominio === null) return { url, dominio: '', categoria: 'Otra', marcaId: null, conocido: false };
  const marca = marcas.find((m) => m.dominios.some((d) => coincide(dominio, d)));
  if (marca) return { url, dominio, categoria: 'Web de marca', marcaId: marca.id, conocido: true };
  const entrada = dominios.find((e) => coincide(dominio, e.dominio));
  if (entrada) return { url, dominio, categoria: entrada.categoria, marcaId: null, conocido: true };
  if (REDES_SOCIALES.some((d) => coincide(dominio, d))) return { url, dominio, categoria: 'Red social', marcaId: null, conocido: true };
  return { url, dominio, categoria: 'Otra', marcaId: null, conocido: false };
}

/** La fuente de la fila en el formato de la ficha: la categoría de la primera cita (§5.4, paso 5). */
export function fuenteDeFila(citas: CitaClasificada[], marcaId: string): Fuente {
  const primera = citas[0];
  if (!primera) return 'No cita fuentes';
  if (primera.categoria === 'Web de marca') return primera.marcaId === marcaId ? 'Nuestra web' : 'Otra';
  return primera.categoria;
}

/** "Dominios más citados" (§5.5): cada dominio cuenta una vez por respuesta. */
export function dominiosMasCitados(
  respuestas: Respuesta[],
  limite = 10,
): Array<{ dominio: string; categoria: CategoriaDominio; respuestas: number }> {
  const conteo = new Map<string, { dominio: string; categoria: CategoriaDominio; respuestas: number }>();
  for (const r of respuestas) {
    const vistos = new Set<string>();
    for (const cita of r.citas) {
      if (cita.dominio === '' || vistos.has(cita.dominio)) continue;
      vistos.add(cita.dominio);
      const actual = conteo.get(cita.dominio) ?? { dominio: cita.dominio, categoria: cita.categoria, respuestas: 0 };
      actual.respuestas += 1;
      conteo.set(cita.dominio, actual);
    }
  }
  return [...conteo.values()]
    .sort((a, b) => b.respuestas - a.respuestas || a.dominio.localeCompare(b.dominio))
    .slice(0, limite);
}
