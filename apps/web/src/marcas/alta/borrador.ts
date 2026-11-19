import type { DatosAlta, Perfil, Sector } from '@lab/datos';
import { claveMarca, empresaDeCorreo, type TipoPregunta } from '@lab/nucleo';

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
  | { tipo: 'sectorExistente'; id: string }
  | { tipo: 'sectorNuevo'; nombre: string; categoria: string }
  | { tipo: 'sinSector' }
  | { tipo: 'categoriasExtra'; texto: string; principal: string | null };

export interface ContextoPaso {
  sectores: Sector[];
}

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
    case 'sectorExistente':
      return { ...b, sector: { id: accion.id } };
    case 'sectorNuevo':
      return {
        ...b,
        sector: { nombre: accion.nombre, categoria: accion.categoria },
        categoriasExtra: listaDeCategorias(b.categoriasExtra.join(','), accion.categoria),
      };
    case 'sinSector':
      return { ...b, sector: null };
    case 'categoriasExtra':
      return { ...b, categoriasExtra: listaDeCategorias(accion.texto, accion.principal) };
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
  return [];
}
