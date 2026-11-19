import { Shell } from '../shell/Shell';
import { PantallaAcceso } from '../sesion/PantallaAcceso';
import { useSesion } from '../sesion/useSesion';
import { Rutas, RutasInternas } from './rutas';

function ConSesion() {
  const { perfil, cargando } = useSesion();
  if (cargando) return <p role="status" className="p-e6">Cargando…</p>;
  if (!perfil) return <PantallaAcceso />;
  return (
    <Shell perfil={perfil}>
      <RutasInternas />
    </Shell>
  );
}

export function App() {
  return <Rutas conSesion={<ConSesion />} />;
}
