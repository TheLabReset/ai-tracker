import { crearDatosEnMemoria, sectorConMarcas } from './datos-en-memoria';

export function datosDeAlta() {
  const d = crearDatosEnMemoria({ usuarios: [{ correo: 'admin@reset.com.pe', clave: 'x', admin: true }], ...sectorConMarcas('Calzado', ['Footloose', 'Skechers'], 'calzado') });
  d.estado.sesion = 'admin@reset.com.pe';
  return d;
}
