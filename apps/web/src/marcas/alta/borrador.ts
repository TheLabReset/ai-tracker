import type { DatosAlta, Marca, NuevaMarca, Perfil, Sector } from '@lab/datos';
import { armarSetCompat, armarSetExtendido, claveMarca, empresaDeCorreo, type TipoPregunta } from '@lab/nucleo';

export type Borrador = Omit<DatosAlta, 'preguntas' | 'sector'> & {
  sector: DatosAlta['sector'] | null;
  preguntasPropias: Array<{ tipo: TipoPregunta; texto: string }>;
};

export type Accion =
  | { tipo: 'nombre'; valor: { texto: string; ambiguo: boolean } }
  | { tipo: 'alias'; valor: Array<{ texto: string; ambiguo: boolean }> }
  | { tipo: 'dominios'; valor: string[] }
  | { tipo: 'empresa'; valor: 'reset' | 'wanted' }
  | { tipo: 'lider'; id: string | undefined }
  | { tipo: 'responsable'; id: string | undefined }
  | { tipo: 'sectorExistente'; id: string; categoria?: string }
  | { tipo: 'sectorNuevo'; nombre: string; categoria: string }
  | { tipo: 'sinSector' }
  | { tipo: 'categoriasExtra'; texto: string; principal: string | null }
  | { tipo: 'alternarCompetidor'; id: string }
  | { tipo: 'agregarCompetidor'; marca: NuevaMarca }
  | { tipo: 'quitarCompetidor'; indice: number }
  | { tipo: 'competidorPrincipal'; indice: number }
  | { tipo: 'preguntaPropia'; pregunta: { tipo: TipoPregunta; texto: string } }
  | { tipo: 'quitarPreguntaPropia'; indice: number };

export interface ContextoPaso {
  sectores: Sector[];
}

export const MAX_COMPETIDORES = 5;

export const PASOS = ['Marca', 'Sector', 'Exploración', 'Competidores', 'Preguntas', 'Motores', 'Confirmar'] as const;

export function borradorInicial(perfil: Perfil): Borrador {
  return {
    marca: { nombre: '', ambiguo: false, alias: [], dominios: [], empresaId: empresaDeCorreo(perfil.correo) ?? perfil.empresaId },
    sector: null,
    categoriasExtra: [],
    competidores: [],
    competidorPrincipal: 0,
    preguntasPropias: [],
    motorIds: [],
    cadencia: 'semanal',
    diaSemana: 3,
    hora: '07:00',
    muestras: 3,
    topeGastoMensual: null,
  };
}

function listaDeCategorias(texto: string, principal: string | null): string[] {
  const vistas = new Set(principal ? [claveMarca(principal)] : []);
  const lista: string[] = [];
  for (const parte of texto.split(',')) {
    const t = parte.trim();
    const clave = claveMarca(t);
    if (clave === '' || vistas.has(clave)) continue;
    vistas.add(clave);
    lista.push(t);
  }
  return lista;
}

function idDelSector(b: Borrador): string | null {
  return b.sector && 'id' in b.sector ? b.sector.id : null;
}

function sinCompetidoresDeCatalogo(b: Borrador): Borrador {
  return { ...b, competidores: b.competidores.filter((c) => !('id' in c)), competidorPrincipal: 0 };
}

function quitarCompetidor(b: Borrador, indice: number): Borrador {
  const principal = indice === b.competidorPrincipal ? 0 : indice < b.competidorPrincipal ? b.competidorPrincipal - 1 : b.competidorPrincipal;
  return { ...b, competidores: b.competidores.filter((_, i) => i !== indice), competidorPrincipal: principal };
}

export function nombreDelCompetidor(c: Borrador['competidores'][number], marcas: Marca[]): string {
  return 'id' in c ? (marcas.find((m) => m.id === c.id)?.nombre ?? '') : c.nombre;
}

export function aplicar(b: Borrador, accion: Accion): Borrador {
  switch (accion.tipo) {
    case 'nombre':
      return { ...b, marca: { ...b.marca, nombre: accion.valor.texto, ambiguo: accion.valor.ambiguo } };
    case 'alias':
      return { ...b, marca: { ...b.marca, alias: accion.valor } };
    case 'dominios':
      return { ...b, marca: { ...b.marca, dominios: accion.valor } };
    case 'empresa':
      return { ...b, marca: { ...b.marca, empresaId: accion.valor } };
    case 'lider':
      return { ...b, liderId: accion.id };
    case 'responsable':
      return { ...b, responsableId: accion.id };
    case 'sectorExistente': {
      const cambia = idDelSector(b) !== accion.id;
      const n = cambia ? sinCompetidoresDeCatalogo(b) : b;
      const extra = accion.categoria === undefined ? n.categoriasExtra : listaDeCategorias(n.categoriasExtra.join(','), accion.categoria);
      return { ...n, sector: { id: accion.id }, categoriasExtra: extra };
    }
    case 'sectorNuevo':
      return {
        ...(idDelSector(b) === null ? b : sinCompetidoresDeCatalogo(b)),
        sector: { nombre: accion.nombre, categoria: accion.categoria },
        categoriasExtra: listaDeCategorias(b.categoriasExtra.join(','), accion.categoria),
      };
    case 'sinSector':
      return { ...(idDelSector(b) === null ? b : sinCompetidoresDeCatalogo(b)), sector: null };
    case 'categoriasExtra':
      return { ...b, categoriasExtra: listaDeCategorias(accion.texto, accion.principal) };
    case 'alternarCompetidor': {
      const i = b.competidores.findIndex((c) => 'id' in c && c.id === accion.id);
      if (i >= 0) return quitarCompetidor(b, i);
      if (b.competidores.length >= MAX_COMPETIDORES) return b;
      return { ...b, competidores: [...b.competidores, { id: accion.id }] };
    }
    case 'agregarCompetidor':
      if (b.competidores.length >= MAX_COMPETIDORES) return b;
      return { ...b, competidores: [...b.competidores, accion.marca] };
    case 'quitarCompetidor':
      return quitarCompetidor(b, accion.indice);
    case 'competidorPrincipal':
      return { ...b, competidorPrincipal: accion.indice };
    case 'preguntaPropia':
      return { ...b, preguntasPropias: [...b.preguntasPropias, accion.pregunta] };
    case 'quitarPreguntaPropia':
      return { ...b, preguntasPropias: b.preguntasPropias.filter((_, i) => i !== accion.indice) };
  }
}

function erroresSector(b: Borrador, { sectores }: ContextoPaso): string[] {
  const s = b.sector;
  if (!s) return ['Elige un sector.'];
  if ('id' in s) return [];
  const errores: string[] = [];
  if (s.nombre.trim() === '') errores.push('Escribe el nombre del sector.');
  else if (sectores.some((x) => claveMarca(x.nombre) === claveMarca(s.nombre))) errores.push('Ya existe un sector con ese nombre.');
  if (s.categoria.trim() === '') errores.push('Escribe la categoría.');
  return errores;
}

export function erroresDelPaso(b: Borrador, paso: number, contexto: ContextoPaso): string[] {
  if (paso === 1) return b.marca.nombre.trim() === '' ? ['Escribe el nombre de la marca.'] : [];
  if (paso === 2) return erroresSector(b, contexto);
  if (paso === 4) return b.competidores.length === 0 ? ['Elige al menos un competidor.'] : [];
  return [];
}

export function preguntasDelBorrador(b: Borrador, nombres: { marca: string; competidor: string; categoria: string }): DatosAlta['preguntas'] {
  const compat = armarSetCompat(nombres).map((p) => ({ ...p, set: 'compat' as const, categoria: null }));
  const extras = listaDeCategorias(b.categoriasExtra.join(','), nombres.categoria);
  const extendido = armarSetExtendido(extras).map((p) => ({ ...p, set: 'extendido' as const }));
  const propias = b.preguntasPropias.map((p, i) => ({ codigo: `X${i + 1}`, tipo: p.tipo, set: 'propia' as const, categoria: null, texto: p.texto }));
  return [...compat, ...extendido, ...propias];
}
