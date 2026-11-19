import type { EstadoProyecto, RolMarca } from '@lab/datos';
import type { TipoPregunta } from '@lab/nucleo';

export const ETIQUETA_ROL: Record<RolMarca, string> = {
  lider: 'Líder',
  responsable: 'Responsable',
  planning: 'Planning (validación)',
  lector: 'Lector',
};

export const ETIQUETA_ROL_CORTA: Record<RolMarca, string> = { ...ETIQUETA_ROL, planning: 'Planning' };

export const ETIQUETA_ESTADO: Record<EstadoProyecto, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  archivado: 'Archivado',
};

export const ETIQUETA_TIPO: Record<TipoPregunta, string> = { descubrimiento: 'Descubrimiento', comparativa: 'Comparativa', marca: 'Marca' };

export const ETIQUETA_EMPRESA = { reset: 'Reset', wanted: 'Wanted' } as const;

const formatoFecha = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function fechaLima(iso: string) {
  const p = Object.fromEntries(formatoFecha.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
