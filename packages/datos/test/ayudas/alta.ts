import { armarSetCompat } from '@lab/nucleo';
import type { Datos, DatosAlta } from '../../src/tipos';

const id = () => crypto.randomUUID().slice(0, 8);

export async function alta(datos: Datos, o: Partial<DatosAlta> = {}): Promise<DatosAlta> {
  const motores = await datos.listarMotores();
  const marca = `Marca ${id()}`;
  return {
    marca: { nombre: marca, ambiguo: false, alias: [], dominios: ['marca.pe'], empresaId: 'reset' },
    sector: { nombre: `Sector ${id()}`, categoria: 'calzado' }, categoriasExtra: [],
    competidores: [{ nombre: `Rival ${id()}`, ambiguo: false, alias: [], dominios: [] }], competidorPrincipal: 0,
    preguntas: armarSetCompat({ categoria: 'calzado', marca, competidor: 'Rival' }).map((p) => ({ ...p, set: 'compat' as const, categoria: null })),
    motorIds: motores.map((m) => m.id), cadencia: 'semanal', diaSemana: 3, hora: '07:00', muestras: 3, topeGastoMensual: null, ...o,
  };
}
