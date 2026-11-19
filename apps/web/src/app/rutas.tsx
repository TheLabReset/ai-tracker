import type { ReactElement } from 'react';
import { Link, Route, Routes } from 'react-router';
import { Consolidado } from '../consolidado/Consolidado';
import { Bitacora } from '../admin/Bitacora';
import { Motores } from '../admin/Motores';
import { NavAdmin } from '../admin/NavAdmin';
import { Usuarios } from '../admin/Usuarios';
import { Configuracion } from '../marcas/Configuracion';
import { Asistente } from '../marcas/alta/Asistente';
import { Catalogo } from '../sectores/Catalogo';
import { Sectores } from '../sectores/Sectores';
import { CrearClave } from '../sesion/CrearClave';
import { AvisoDeNavegacion } from './AvisoDeNavegacion';
import { SoloAdmin } from './guardas';

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
      <Route path="/sectores" element={<Sectores />} />
      <Route path="/sectores/:sectorId" element={<Catalogo />} />
      <Route path="/marcas/nueva" element={<Asistente />} />
      <Route path="/marcas/:proyectoId/configuracion" element={<><AvisoDeNavegacion /><Configuracion /></>} />
      <Route path="/admin/motores" element={<SoloAdmin><NavAdmin /><Motores /></SoloAdmin>} />
      <Route path="/admin/usuarios" element={<SoloAdmin><NavAdmin /><Usuarios /></SoloAdmin>} />
      <Route path="/admin/bitacora" element={<SoloAdmin><NavAdmin /><Bitacora /></SoloAdmin>} />
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
