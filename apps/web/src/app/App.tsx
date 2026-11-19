import { Route, Routes } from 'react-router';
import { CrearClave } from '../sesion/CrearClave';
import { PantallaAcceso } from '../sesion/PantallaAcceso';
import { useSesion } from '../sesion/useSesion';

function Inicio() {
  const { perfil, salir } = useSesion();
  if (!perfil) return <PantallaAcceso />;
  return (
    <nav aria-label="Principal">
      <h1>The Lab AI Tracker</h1>
      <button type="button" onClick={salir}>
        Salir
      </button>
    </nav>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/crear-password" element={<CrearClave />} />
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}
