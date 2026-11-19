import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Catalogo } from '../src/sectores/Catalogo';
import { Sectores } from '../src/sectores/Sectores';
import { crearDatosEnMemoria, sectorConMarcas } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

const admin = (semilla: Parameters<typeof crearDatosEnMemoria>[0] = {}) => {
  const d = crearDatosEnMemoria({ usuarios: [{ correo: 'admin@reset.com.pe', clave: 'x', admin: true }], ...semilla });
  d.estado.sesion = 'admin@reset.com.pe';
  return d;
};
const PATRON = '/sectores/:sectorId';

describe('catálogo de marcas', () => {
  it('avisa cuando un alias es una palabra común y lo marca ambiguo', async () => {
    const d = admin(sectorConMarcas('Internet hogar', []));
    renderConDatos(<Catalogo />, { datos: d, ruta: `/sectores/${d.estado.sectores[0]!.id}`, patron: PATRON });
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar marca' }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Win');
    expect(await screen.findByText('«Win» es una palabra común: la marcamos como ambigua.')).toBeInTheDocument();
    expect(screen.getByLabelText('Ambiguo')).toBeChecked();
  });
  it('muestra de qué marca es un alias repetido', async () => {
    const d = admin(sectorConMarcas('Educación', [{ nombre: 'Pacífico Business School', alias: ['UP'] }, 'ESAN']));
    renderConDatos(<Catalogo />, { datos: d, ruta: `/sectores/${d.estado.sectores[0]!.id}`, patron: PATRON });
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar alias a ESAN' }));
    await userEvent.type(screen.getByLabelText('Alias'), 'U.P.');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('«U.P.» ya es de Pacífico Business School')).toBeInTheDocument();
  });
  it('si desmarcas ambiguo, seguir escribiendo no lo vuelve a marcar', async () => {
    const d = admin(sectorConMarcas('Internet hogar', []));
    renderConDatos(<Catalogo />, { datos: d, ruta: `/sectores/${d.estado.sectores[0]!.id}`, patron: PATRON });
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar marca' }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Win');
    await userEvent.click(screen.getByLabelText('Ambiguo'));
    expect(screen.getByLabelText('Ambiguo')).not.toBeChecked();
    await userEvent.type(screen.getByLabelText('Nombre'), '.');
    expect(screen.getByLabelText('Ambiguo')).not.toBeChecked();
  });
  it('crea una marca con alias y dominios limpios', async () => {
    const d = admin(sectorConMarcas('Educación', []));
    renderConDatos(<Catalogo />, { datos: d, ruta: `/sectores/${d.estado.sectores[0]!.id}`, patron: PATRON });
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar marca' }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Universidad del Pacífico');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar un alias' }));
    await userEvent.type(screen.getByLabelText('Alias 1'), 'UP');
    await userEvent.type(screen.getByLabelText('Dominios'), 'https://www.UP.edu.pe/, up.edu.pe, www.pacifico.edu.pe');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Universidad del Pacífico')).toBeInTheDocument();
    expect(screen.getByText('UP')).toBeInTheDocument();
    expect(d.estado.marcas[0]!.dominios).toEqual(['up.edu.pe', 'pacifico.edu.pe']);
  });
  it('el admin quita un alias', async () => {
    const d = admin(sectorConMarcas('Educación', [{ nombre: 'ESAN', alias: ['Esan Perú'] }]));
    renderConDatos(<Catalogo />, { datos: d, ruta: `/sectores/${d.estado.sectores[0]!.id}`, patron: PATRON });
    await userEvent.click(await screen.findByRole('button', { name: 'Quitar alias Esan Perú' }));
    await waitFor(() => expect(screen.queryByText('Esan Perú')).not.toBeInTheDocument());
  });
  it('quien no es admin ni líder ve el catálogo pero no los botones de agregar', async () => {
    const d = crearDatosEnMemoria({ usuarios: [{ correo: 'ana@reset.com.pe', clave: 'x' }], ...sectorConMarcas('Educación', [{ nombre: 'ESAN', alias: ['Esan Perú'] }]) });
    d.estado.sesion = 'ana@reset.com.pe';
    renderConDatos(<Catalogo />, { datos: d, ruta: `/sectores/${d.estado.sectores[0]!.id}`, patron: PATRON });
    expect(await screen.findByText('ESAN')).toBeInTheDocument();
    expect(screen.getByText('Esan Perú')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agregar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quitar alias/ })).not.toBeInTheDocument();
  });
  it('tiene pestañas Marcas y Plantillas', async () => {
    const d = admin(sectorConMarcas('Educación', ['ESAN']));
    renderConDatos(<Catalogo />, { datos: d, ruta: `/sectores/${d.estado.sectores[0]!.id}`, patron: PATRON });
    expect(await screen.findByRole('tab', { name: 'Marcas', selected: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Plantillas' }));
    expect(within(screen.getByRole('tabpanel')).queryByText('ESAN')).not.toBeInTheDocument();
  });
});

describe('sectores', () => {
  it('lista los sectores con su categoría y enlaza a cada uno', async () => {
    const d = admin(sectorConMarcas('Educación', [], 'universidades'));
    renderConDatos(<Sectores />, { datos: d });
    const enlace = await screen.findByRole('link', { name: /Educación/ });
    expect(enlace).toHaveAttribute('href', `/sectores/${d.estado.sectores[0]!.id}`);
    expect(screen.getByText('universidades')).toBeInTheDocument();
  });
  it('crea un sector y avisa si el nombre ya existe', async () => {
    const d = admin(sectorConMarcas('Educación', []));
    renderConDatos(<Sectores />, { datos: d });
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo sector' }));
    await userEvent.type(screen.getByLabelText('Nombre del sector'), 'Educación');
    await userEvent.type(screen.getByLabelText('Categoría'), 'universidades');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ya existe un sector con ese nombre.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Nombre del sector'));
    await userEvent.type(screen.getByLabelText('Nombre del sector'), 'Banca');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('link', { name: /Banca/ })).toBeInTheDocument();
  });
  it('sin permisos no hay botón de nuevo sector', async () => {
    const d = crearDatosEnMemoria({ usuarios: [{ correo: 'ana@reset.com.pe', clave: 'x' }], ...sectorConMarcas('Educación', []) });
    d.estado.sesion = 'ana@reset.com.pe';
    renderConDatos(<Sectores />, { datos: d });
    expect(await screen.findByRole('link', { name: /Educación/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo sector' })).not.toBeInTheDocument();
  });
});
