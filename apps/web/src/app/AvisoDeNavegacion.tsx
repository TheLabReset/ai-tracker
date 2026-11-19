import { useLocation } from 'react-router';

export function AvisoDeNavegacion() {
  const estado = useLocation().state as { aviso?: string } | null;
  if (!estado?.aviso) return null;
  return (
    <p role="status" className="rounded-card bg-capsula p-e4 text-(length:--t-14)">
      {estado.aviso}
    </p>
  );
}
