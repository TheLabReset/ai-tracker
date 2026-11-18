import type { DefinicionIndicador } from './definicion';

const comunes = {
  version: 1,
  alcance: { tipo: 'programa' },
  motores: 'todos',
  periodo: { tipo: 'vuelta' },
} as const;

const ABIERTAS = ['P1', 'P3', 'P4'];

/** Los 6 indicadores con los que arranca el MVP (§5.5.1). */
export const INDICADORES_INICIALES: readonly DefinicionIndicador[] = [
  {
    ...comunes,
    id: 'visibilidad-abierta',
    nombre: 'Visibilidad abierta',
    preguntas: { codigos: ABIERTAS },
    medidas: ['puntos', 'nombra', 'primero', 'habla_bien', 'cita_web'],
    desglosePorMotor: false,
  },
  {
    ...comunes,
    id: 'visibilidad-por-motor',
    nombre: 'Visibilidad por motor',
    preguntas: { codigos: ABIERTAS },
    medidas: ['puntos'],
    desglosePorMotor: true,
  },
  {
    ...comunes,
    id: 'como-en-el-excel',
    nombre: 'Como en el Excel',
    preguntas: { codigos: ['P1', 'P2', 'P3', 'P4', 'P5'] },
    medidas: ['puntos', 'nombra', 'primero', 'habla_bien', 'habla_mal', 'cita_web', 'cita_terceros'],
    desglosePorMotor: false,
  },
  {
    ...comunes,
    id: 'comparativa',
    nombre: 'Comparativa',
    preguntas: { codigos: ['P2'] },
    medidas: ['gana_comparacion'],
    desglosePorMotor: false,
  },
  {
    ...comunes,
    id: 'reputacion',
    nombre: 'Reputación',
    preguntas: { codigos: ['P5'] },
    medidas: ['habla_bien', 'habla_mal', 'cita_web'],
    desglosePorMotor: false,
  },
  {
    ...comunes,
    id: 'share-of-voice',
    nombre: 'Share of voice',
    preguntas: { codigos: ABIERTAS },
    medidas: ['sov'],
    desglosePorMotor: false,
  },
];

export function indicadorInicial(id: string): DefinicionIndicador {
  const def = INDICADORES_INICIALES.find((d) => d.id === id);
  if (!def) throw new Error(`No existe el indicador inicial "${id}"`);
  return def;
}
