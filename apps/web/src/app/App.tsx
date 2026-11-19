import { useQuery } from '@tanstack/react-query';
import { useDatos } from './proveedores';

export function App() {
  const datos = useDatos();
  const sesion = useQuery({ queryKey: ['sesion'], queryFn: () => datos.sesionActual() });

  if (sesion.isPending) return <p>Cargando…</p>;
  if (!sesion.data) return <h1>Entra con tu correo de Reset o Wanted</h1>;
  return <h1>The Lab AI Tracker</h1>;
}
