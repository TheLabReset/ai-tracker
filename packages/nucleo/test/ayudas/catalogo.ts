import type { MarcaCatalogo } from '../../src/dominio';

export const catalogo: MarcaCatalogo[] = [
  {
    id: 'pbs',
    nombre: 'Pacífico Business School',
    ambiguo: false,
    alias: [
      { texto: 'UP', ambiguo: false },
      { texto: 'Universidad del Pacífico', ambiguo: false },
    ],
    dominios: ['up.edu.pe'],
  },
  { id: 'esan', nombre: 'ESAN', ambiguo: false, alias: [], dominios: ['esan.edu.pe'] },
  { id: 'win', nombre: 'Win', ambiguo: true, alias: [{ texto: 'Win Internet', ambiguo: false }], dominios: ['win.pe'] },
  { id: 'claro', nombre: 'Claro', ambiguo: true, alias: [], dominios: ['claro.com.pe'] },
];
