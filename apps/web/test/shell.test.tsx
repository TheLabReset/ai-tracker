import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { act, screen, within } from '@testing-library/react';
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

async function anaConProyecto() {
  const base = crearDatosEnMemoria({
    usuarios: [
      { correo: 'ana@reset.com.pe', clave: 'x', admin: true },
      { correo: 'beto@reset.com.pe', clave: 'y' },
    ],
  });
  base.estado.sesion = 'ana@reset.com.pe';
  const sector = await base.crearSector({ nombre: 'Seguros', categoria: 'seguros' });
  const rival = await base.crearMarca(sector.id, { nombre: 'Rimac', ambiguo: false, alias: [], dominios: [] });
  const motor = (await base.listarMotores())[0]!.id;
  await base.crearProyecto({
    marca: { nombre: 'Interseguro', ambiguo: false, alias: [], dominios: [], empresaId: 'reset' },
    sector: { id: sector.id },
    categoriasExtra: [],
    competidores: [{ id: rival.id }],
    competidorPrincipal: 0,
    preguntas: [{ codigo: 'P1', tipo: 'descubrimiento', set: 'compat', categoria: null, texto: '¿Qué seguro me recomiendas?' }],
    motorIds: [motor],
    cadencia: 'semanal',
    diaSemana: 3,
    hora: '07:00',
    muestras: 3,
    topeGastoMensual: null,
  });
  let soltar: () => void = () => {};
  let retenido = false;
  const datos = {
    ...base,
    listarProyectos: async () => {
      const visibles = await base.listarProyectos();
      if (retenido) await new Promise<void>((r) => (soltar = r));
      return visibles;
    },
  };
  return { base, datos, retener: () => (retenido = true), soltar: () => soltar() };
}

async function entrarComo(correo: string, clave: string) {
  await userEvent.type(await screen.findByLabelText('Correo'), correo);
  await userEvent.type(screen.getByLabelText('Contraseña'), clave);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

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

  it('desde Motores el admin llega a Usuarios y a Bitácora por la navegación de Admin', async () => {
    renderConDatos(<App />, { datos: conSesion(true), ruta: '/admin/motores' });
    expect(await screen.findByRole('heading', { name: 'Motores' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(nav).getByRole('link', { name: 'Motores' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(within(nav).getByRole('link', { name: 'Usuarios' }));
    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Admin' })).getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Admin' })).getByRole('link', { name: 'Bitácora' }));
    expect(await screen.findByRole('heading', { name: 'Bitácora' })).toBeInTheDocument();
    const final = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(final).getByRole('link', { name: 'Bitácora' })).toHaveAttribute('aria-current', 'page');
    expect(within(final).getByRole('link', { name: 'Motores' })).not.toHaveAttribute('aria-current');
  });

  it('fuera de Admin no se muestra la navegación de Admin', async () => {
    renderConDatos(<App />, { datos: conSesion(true), ruta: '/' });
    expect(await screen.findByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Admin' })).toBeNull();
  });

  it('si falla la carga de proyectos, avisa y permite reintentar en vez de mostrar el estado vacío', async () => {
    const base = conSesion(false);
    let falla = true;
    const datos = {
      ...base,
      listarProyectos: () => (falla ? Promise.reject(new Error('sin red')) : base.listarProyectos()),
    };
    renderConDatos(<App />, { datos });
    expect(await screen.findByText('No pudimos cargar tus marcas.')).toBeInTheDocument();
    expect(screen.queryByText(/todavía no tienes marcas/i)).toBeNull();
    falla = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/todavía no tienes marcas/i)).toBeInTheDocument();
  });

  it('al salir se borra la caché: el siguiente usuario no ve los proyectos del anterior', async () => {
    const { datos, retener, soltar } = await anaConProyecto();
    renderConDatos(<App />, { datos });
    expect(await screen.findByRole('heading', { name: 'Consolidado' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ana/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Salir' }));
    retener();
    await entrarComo('beto@reset.com.pe', 'y');
    expect(await screen.findByRole('button', { name: /beto/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Consolidado' })).toBeNull();
    soltar();
    expect(await screen.findByText(/todavía no tienes marcas/i)).toBeInTheDocument();
  });

  it('si la sesión termina sin Salir, quien entra después tampoco ve los proyectos del anterior', async () => {
    const { base, datos, retener, soltar } = await anaConProyecto();
    let cliente: QueryClient | undefined;
    function Sonda() {
      cliente = useQueryClient();
      return null;
    }
    renderConDatos(<><Sonda /><App /></>, { datos });
    expect(await screen.findByRole('link', { name: 'Interseguro' })).toBeInTheDocument();
    base.estado.sesion = null;
    await act(() => cliente!.invalidateQueries({ queryKey: ['sesion'] }));
    retener();
    await entrarComo('beto@reset.com.pe', 'y');
    expect(await screen.findByRole('button', { name: /beto/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Interseguro' })).toBeNull();
    soltar();
    expect(await screen.findByText(/todavía no tienes marcas/i)).toBeInTheDocument();
  });
});
