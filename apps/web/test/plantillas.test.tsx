import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Plantillas } from '../src/sectores/Plantillas';
import { crearDatosEnMemoria, sectorConMarcas } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

const conSesion = (correo: string, admin: boolean) => {
  const d = crearDatosEnMemoria({ usuarios: [{ correo, clave: 'x', admin }], ...sectorConMarcas('Alimentos', [], 'pollo') });
  d.estado.sesion = correo;
  return d;
};

describe('plantillas', () => {
  it('muestra las 5 de la ficha y una vista previa con la categoría del sector', async () => {
    const d = conSesion('admin@reset.com.pe', true);
    renderConDatos(<Plantillas sectorId={d.estado.sectores[0]!.id} />, { datos: d });
    expect(await screen.findAllByText('Ficha')).toHaveLength(5);
    await userEvent.click(screen.getByRole('button', { name: 'Nueva plantilla' }));
    await userEvent.type(screen.getByLabelText('Texto'), '¿Qué {{categoria} me recomiendas para {{necesidad}?');
    expect(screen.getByText('¿Qué pollo me recomiendas para tu necesidad?')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Texto'), ' ¿{{precio}?');
    expect(screen.getByText('La variable {precio} no existe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('guarda una plantilla válida y la agrega después de las 5 globales', async () => {
    const d = conSesion('admin@reset.com.pe', true);
    renderConDatos(<Plantillas sectorId={d.estado.sectores[0]!.id} />, { datos: d });
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva plantilla' }));
    expect(screen.getByLabelText('Código')).toHaveValue('N1');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Comparativa');
    await userEvent.type(screen.getByLabelText('Texto'), '¿{{marca} o {{competidor}?');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(within(items[5]!).getByText('N1')).toBeInTheDocument();
    expect(within(items[5]!).getByText('Comparativa')).toBeInTheDocument();
    expect(within(items[5]!).getByText('¿{marca} o {competidor}?')).toBeInTheDocument();
    expect(within(items[5]!).queryByText('Ficha')).toBeNull();
    expect(screen.queryByLabelText('Texto')).toBeNull();
  });

  it('muestra el error de código repetido junto al formulario', async () => {
    const d = conSesion('admin@reset.com.pe', true);
    renderConDatos(<Plantillas sectorId={d.estado.sectores[0]!.id} />, { datos: d });
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva plantilla' }));
    await userEvent.clear(screen.getByLabelText('Código'));
    await userEvent.type(screen.getByLabelText('Código'), 'n1');
    await userEvent.type(screen.getByLabelText('Texto'), 'Hola {{marca}');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findAllByRole('listitem');
    await userEvent.click(screen.getByRole('button', { name: 'Nueva plantilla' }));
    await userEvent.clear(screen.getByLabelText('Código'));
    await userEvent.type(screen.getByLabelText('Código'), 'N1');
    await userEvent.type(screen.getByLabelText('Texto'), 'Otra {{marca}');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ya hay una plantilla con ese código.')).toBeInTheDocument();
  });

  it('rechaza llaves mal formadas y no muestra vista previa', async () => {
    const d = conSesion('admin@reset.com.pe', true);
    renderConDatos(<Plantillas sectorId={d.estado.sectores[0]!.id} />, { datos: d });
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva plantilla' }));
    await userEvent.type(screen.getByLabelText('Texto'), '¿Qué {{}?');
    expect(screen.getByText('Revisa las llaves: «{}» no es una variable.')).toBeInTheDocument();
    expect(screen.queryByText('Vista previa')).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('quien no es líder ve la lista pero no el botón', async () => {
    const d = conSesion('ana@reset.com.pe', false);
    renderConDatos(<Plantillas sectorId={d.estado.sectores[0]!.id} />, { datos: d });
    expect(await screen.findAllByText('Ficha')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'Nueva plantilla' })).toBeNull();
  });
});
