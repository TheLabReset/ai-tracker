import type { Perfil } from '@lab/datos';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { MenuUsuario } from './MenuUsuario';

function Enlace({ to, prefijo, children }: { to: string; prefijo?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  const activo = prefijo ? pathname.startsWith(prefijo) : pathname === to;
  return (
    <Link
      to={to}
      aria-current={activo ? 'page' : undefined}
      className={`rounded-pildora px-e4 py-e2 text-(length:--t-14) font-semibold ${activo ? 'bg-mod text-mod-tinta' : 'text-tinta-2 hover:bg-realce'}`}
    >
      {children}
    </Link>
  );
}

export function Shell({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-fondo">
      <header className="sticky top-0 z-(--z-header) border-b border-linea bg-capsula">
        <div className="mx-auto flex max-w-(--ancho-contenido) flex-wrap items-center gap-x-e6 gap-y-e2 px-(--margen-lateral) py-e3">
          <span className="font-display text-(length:--t-26) text-mod-tinta">
            <span className="rounded-pildora bg-mod px-e3">AI TRACKER</span>
          </span>
          <span className="rounded-pildora bg-realce px-e3 py-e1 text-(length:--t-12) font-bold tracking-(--espaciado-etiqueta)">
            THE LAB · RESET
          </span>
          <nav aria-label="Principal" className="order-last flex w-full flex-wrap gap-e2 md:order-none md:w-auto md:flex-1">
            <Enlace to="/">Consolidado</Enlace>
            <Enlace to="/sectores" prefijo="/sectores">Sectores</Enlace>
            {perfil.esAdmin && <Enlace to="/admin/motores" prefijo="/admin">Admin</Enlace>}
          </nav>
          <div className="ml-auto">
            <MenuUsuario nombre={perfil.nombre} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-(--ancho-contenido) flex-1 px-(--margen-lateral) py-e6">{children}</main>
      <footer className="border-t border-linea py-e4 text-center text-(length:--t-12) text-tinta-3">Powered by The Lab</footer>
    </div>
  );
}
