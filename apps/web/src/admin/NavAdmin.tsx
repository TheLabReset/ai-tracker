import { Link, useLocation } from 'react-router';

const SECCIONES = [
  { ruta: '/admin/motores', nombre: 'Motores' },
  { ruta: '/admin/usuarios', nombre: 'Usuarios' },
  { ruta: '/admin/bitacora', nombre: 'Bitácora' },
];

export function NavAdmin() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Admin" className="mb-e6 flex flex-wrap gap-e2 border-b border-linea pb-e3">
      {SECCIONES.map(({ ruta, nombre }) => {
        const activa = pathname === ruta;
        return (
          <Link
            key={ruta}
            to={ruta}
            aria-current={activa ? 'page' : undefined}
            className={`rounded-pildora px-e4 py-e1 text-(length:--t-14) font-semibold ${activa ? 'bg-control text-tinta' : 'text-tinta-2 hover:bg-realce'}`}
          >
            {nombre}
          </Link>
        );
      })}
    </nav>
  );
}
