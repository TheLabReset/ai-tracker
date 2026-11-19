import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Asistente } from '../src/marcas/alta/Asistente';
import { datosDeAlta } from './ayudas/alta';
import { crearDatosEnMemoria, idDeUsuario, sectorConMarcas } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

describe('alta de marca · pasos 1 y 2', () => {
  it('no deja seguir sin nombre y avisa si es una palabra común', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    expect(await screen.findByRole('button', { name: 'Seguir' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Nombre de la marca'), 'Bata');
    expect(screen.getByText('«Bata» es una palabra común: la marcamos como ambigua.')).toBeInTheDocument();
    expect(screen.getByLabelText('Empresa')).toHaveValue('reset');
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(screen.getByRole('heading', { name: '2. Sector' })).toBeInTheDocument();
  });
  it('al elegir un sector existente avisa qué hereda', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await userEvent.type(await screen.findByLabelText('Nombre de la marca'), 'Bata');
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await userEvent.selectOptions(screen.getByLabelText('Sector'), 'Calzado');
    expect(screen.getByText('Hereda el catálogo de 2 marcas.')).toBeInTheDocument();
    expect(screen.queryByText(/plantillas/)).toBeNull();
  });
  it('con una sola marca en el sector lo dice en singular', async () => {
    const d = crearDatosEnMemoria({ usuarios: [{ correo: 'admin@reset.com.pe', clave: 'x', admin: true }], ...sectorConMarcas('Calzado', ['Footloose']) });
    d.estado.sesion = 'admin@reset.com.pe';
    renderConDatos(<Asistente />, { datos: d });
    await userEvent.type(await screen.findByLabelText('Nombre de la marca'), 'Bata');
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await userEvent.selectOptions(screen.getByLabelText('Sector'), 'Calzado');
    expect(screen.getByText('Hereda el catálogo de 1 marca.')).toBeInTheDocument();
  });
  it('avisa si la marca ya está en el catálogo del sector', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await userEvent.type(await screen.findByLabelText('Nombre de la marca'), 'foot loose');
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await userEvent.selectOptions(screen.getByLabelText('Sector'), 'Calzado');
    expect(screen.getByText('«foot loose» ya está en el catálogo de Calzado: la tomamos como marca cliente.')).toBeInTheDocument();
  });
  it('un sector nuevo con nombre repetido bloquea el paso', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await userEvent.type(await screen.findByLabelText('Nombre de la marca'), 'Bata');
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear sector' }));
    await userEvent.type(screen.getByLabelText('Nombre del sector'), 'calzado');
    await userEvent.type(screen.getByLabelText('Categoría'), 'zapatos');
    expect(screen.getByText('Ya existe un sector con ese nombre.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Nombre del sector'));
    await userEvent.type(screen.getByLabelText('Nombre del sector'), 'Moda');
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeEnabled();
  });
  it('volver conserva lo escrito', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await userEvent.type(await screen.findByLabelText('Nombre de la marca'), 'Bata');
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByLabelText('Nombre de la marca')).toHaveValue('Bata');
  });
  it('un admin elige líder; un líder ve «Líder: tú»', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    expect(await screen.findByLabelText('Líder')).toBeInTheDocument();
    expect(screen.getByLabelText('Responsable')).toBeInTheDocument();
  });
  it('un líder que no es admin no elige líder', async () => {
    const d = crearDatosEnMemoria({ usuarios: [{ correo: 'lia@reset.com.pe', clave: 'x' }], ...sectorConMarcas('Calzado', ['Footloose']) });
    d.estado.sesion = 'lia@reset.com.pe';
    d.estado.membresias.push({ usuarioId: idDeUsuario(d, 'lia@reset.com.pe'), marcaId: d.estado.marcas[0]!.id, rol: 'lider' });
    renderConDatos(<Asistente />, { datos: d });
    expect(await screen.findByText('Líder: tú')).toBeInTheDocument();
    expect(screen.queryByLabelText('Líder')).not.toBeInTheDocument();
  });
  it('quien no puede crear marcas ve un aviso', async () => {
    const d = crearDatosEnMemoria({ usuarios: [{ correo: 'ana@reset.com.pe', clave: 'x' }] });
    d.estado.sesion = 'ana@reset.com.pe';
    renderConDatos(<Asistente />, { datos: d });
    expect(await screen.findByText('Solo un admin o un líder puede dar de alta una marca.')).toBeInTheDocument();
  });
});
