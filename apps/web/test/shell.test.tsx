import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';
import { crearDatosEnMemoria } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

const conSesion = (admin: boolean) => {
  const d = crearDatosEnMemoria({ usuarios: [{ correo: 'ana@reset.com.pe', clave: 'x', admin }] });
  d.estado.sesion = 'ana@reset.com.pe';
  return d;
};

describe('shell', () => {
  it('el admin ve Admin en el menú; los demás no', async () => {
    renderConDatos(<App />, { datos: conSesion(true) });
    expect(await screen.findByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Nueva marca' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consolidado' })).toHaveAttribute('aria-current', 'page');
  });
  it('un usuario sin marcas ve un estado vacío y no entra a Admin', async () => {
    renderConDatos(<App />, { datos: conSesion(false), ruta: '/' });
    expect(await screen.findByText('Todavía no tienes marcas asignadas. Pídele acceso a The Lab.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Nueva marca' })).toBeNull();
  });
  it('Admin por URL directa muestra el aviso, y Salir vuelve al acceso', async () => {
    renderConDatos(<App />, { datos: conSesion(false), ruta: '/admin/motores' });
    expect(await screen.findByText('Esta sección es de The Lab.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ana/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Salir' }));
    expect(await screen.findByRole('heading', { name: /con tu correo de reset o wanted/i })).toBeInTheDocument();
  });
  it('el menú del usuario se cierra con Escape y con clic fuera', async () => {
    renderConDatos(<App />, { datos: conSesion(false) });
    const boton = await screen.findByRole('button', { name: /ana/i });
    await userEvent.click(boton);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(boton);
    await userEvent.click(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
  it('una ruta desconocida ofrece volver al Consolidado', async () => {
    renderConDatos(<App />, { datos: conSesion(false), ruta: '/nada' });
    expect(await screen.findByText('No encontramos esta página.')).toBeInTheDocument();
  });
  it('el admin entra a Admin y el pie se muestra', async () => {
    renderConDatos(<App />, { datos: conSesion(true), ruta: '/admin/usuarios' });
    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByText('Powered by The Lab')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page');
  });
});
