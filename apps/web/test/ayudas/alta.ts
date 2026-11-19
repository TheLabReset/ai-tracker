import type { RolMarca } from '@lab/datos';
import { armarSetCompat } from '@lab/nucleo';
import { crearDatosEnMemoria, idDeUsuario, sectorConMarcas } from './datos-en-memoria';

export function datosDeAlta() {
  const d = crearDatosEnMemoria({ usuarios: [{ correo: 'admin@reset.com.pe', clave: 'x', admin: true }], ...sectorConMarcas('Calzado', ['Footloose', 'Skechers'], 'calzado') });
  d.estado.sesion = 'admin@reset.com.pe';
  return d;
}

export async function proyectoDePrueba({ rol }: { rol: 'admin' | RolMarca }) {
  const datos = crearDatosEnMemoria({
    usuarios: [
      { correo: 'admin@reset.com.pe', clave: 'x', admin: true },
      { correo: 'persona@reset.com.pe', clave: 'x' },
    ],
    ...sectorConMarcas('Calzado', ['Footloose', 'Skechers'], 'calzado'),
  });
  datos.estado.sesion = 'admin@reset.com.pe';
  const sector = datos.estado.sectores[0]!;
  const footloose = datos.estado.marcas.find((m) => m.nombre === 'Footloose')!;
  const preguntas = armarSetCompat({ marca: 'Bata', competidor: 'Footloose', categoria: 'calzado' }).map((p) => ({ ...p, set: 'compat' as const, categoria: null }));
  const proyectoId = await datos.crearProyecto({
    marca: { nombre: 'Bata', ambiguo: false, alias: [], dominios: [], empresaId: 'reset' },
    sector: { id: sector.id },
    categoriasExtra: [],
    competidores: [{ id: footloose.id }],
    competidorPrincipal: 0,
    preguntas,
    motorIds: datos.estado.motores.map((m) => m.id),
    cadencia: 'semanal',
    diaSemana: 3,
    hora: '07:00',
    muestras: 3,
    topeGastoMensual: null,
  });
  if (rol !== 'admin') {
    const { marca } = await datos.obtenerProyecto(proyectoId);
    await datos.asignarMembresia(idDeUsuario(datos, 'persona@reset.com.pe'), marca.id, rol);
    datos.estado.sesion = 'persona@reset.com.pe';
  }
  return { datos, proyectoId };
}
