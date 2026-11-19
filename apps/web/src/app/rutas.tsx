import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Link, Route, Routes } from 'react-router';
import { Motores } from '../admin/Motores';
import { CrearClave } from '../sesion/CrearClave';
import { useSesion } from '../sesion/useSesion';
import { puedeCrearMarcas, SoloAdmin } from './guardas';
import { useDatos } from './proveedores';

function Pantalla({ titulo }: { titulo: string }) {
  return <h1 className="font-display text-(length:--t-40) uppercase">{titulo}</h1>;
}

function Consolidado() {
  const datos = useDatos();
  const { perfil } = useSesion();
  const proyectos = useQuery({ queryKey: ['proyectos'], queryFn: () => datos.listarProyectos() });
  if (proyectos.isPending) return <p role="status">Cargando…</p>;
  if (proyectos.isError)
    return (
      <div role="alert" className="flex flex-col items-start gap-e4 py-e8">
        <p className="text-error">No pudimos cargar tus marcas.</p>
        <button type="button" onClick={() => proyectos.refetch()} className="rounded-pildora bg-mod px-e6 py-e2 font-bold text-mod-tinta">
          Reintentar
        </button>
      </div>
    );
  if (proyectos.data && proyectos.data.length > 0) return <Pantalla titulo="Consolidado" />;
  return (
    <div className="flex flex-col items-start gap-e4 py-e8">
      <p className="text-(length:--t-16)">Todavía no tienes marcas asignadas. Pídele acceso a The Lab.</p>
      {perfil && puedeCrearMarcas(perfil) && (
        <Link to="/marcas/nueva" className="rounded-pildora bg-mod px-e6 py-e2 font-bold text-mod-tinta">
          Nueva marca
        </Link>
      )}
    </div>
  );
}

function NoEncontrada() {
  return (
    <div className="flex flex-col items-start gap-e4 py-e8">
      <p>No encontramos esta página.</p>
      <Link to="/" className="underline">
        Consolidado
      </Link>
    </div>
  );
}

export function RutasInternas() {
  return (
    <Routes>
      <Route path="/" element={<Consolidado />} />
      <Route path="/sectores" element={<Pantalla titulo="Sectores" />} />
      <Route path="/sectores/:sectorId" element={<Pantalla titulo="Sector" />} />
      <Route path="/marcas/nueva" element={<Pantalla titulo="Nueva marca" />} />
      <Route path="/marcas/:proyectoId/configuracion" element={<Pantalla titulo="Configuración de la marca" />} />
      <Route path="/admin/motores" element={<SoloAdmin><Motores /></SoloAdmin>} />
      <Route path="/admin/usuarios" element={<SoloAdmin><Pantalla titulo="Usuarios" /></SoloAdmin>} />
      <Route path="/admin/bitacora" element={<SoloAdmin><Pantalla titulo="Bitácora" /></SoloAdmin>} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}

export function Rutas({ conSesion }: { conSesion: ReactElement }) {
  return (
    <Routes>
      <Route path="/crear-password" element={<CrearClave />} />
      <Route path="*" element={conSesion} />
    </Routes>
  );
}
