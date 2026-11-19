import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Usuarios } from '../src/admin/Usuarios';
import { crearDatosEnMemoria, idDeUsuario, sectorConMarcas } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

function datosBase() {
  const d = crearDatosEnMemoria({
    usuarios: [
      { correo: 'admin@reset.com.pe', clave: 'x', admin: true },
      { correo: 'luis@wanted.pe', clave: 'x' },
    ],
    ...sectorConMarcas('Calzado', ['Bata', 'Footloose']),
  });
  d.estado.marcas.find((m) => m.nombre === 'Bata')!.esCliente = true;
  d.estado.sesion = 'admin@reset.com.pe';
  return d;
}

describe('admin · usuarios', () => {
  it('da acceso a una marca con un rol y lo muestra', async () => {
    renderConDatos(<Usuarios />, { datos: datosBase() });
    const fila = (await screen.findByRole('cell', { name: 'luis@wanted.pe' })).closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Dar acceso' }));
    expect(screen.getByLabelText('Marca')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Sector'), 'Calzado');
    await userEvent.selectOptions(screen.getByLabelText('Marca'), 'Bata');
    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'Responsable');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await within(fila).findByText('Bata · Responsable')).toBeInTheDocument();
    expect(within(fila).getByText('Wanted')).toBeInTheDocument();
  });

  it('solo ofrece marcas cliente, no competidores', async () => {
    renderConDatos(<Usuarios />, { datos: datosBase() });
    const fila = (await screen.findByRole('cell', { name: 'luis@wanted.pe' })).closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Dar acceso' }));
    await userEvent.selectOptions(screen.getByLabelText('Sector'), 'Calzado');
    await screen.findByRole('option', { name: 'Bata' });
    expect(within(screen.getByLabelText('Marca')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Elige una marca', 'Bata']);
  });

  it('quita una marca con su botón', async () => {
    const d = datosBase();
    await d.asignarMembresia(idDeUsuario(d, 'luis@wanted.pe'), d.estado.marcas[0]!.id, 'lector');
    renderConDatos(<Usuarios />, { datos: d });
    const fila = (await screen.findByRole('cell', { name: 'luis@wanted.pe' })).closest('tr')!;
    expect(within(fila).getByText('Bata · Lector')).toBeInTheDocument();
    await userEvent.click(within(fila).getByRole('button', { name: 'Quitar Bata' }));
    await within(fila).findByText('Sin marcas');
    expect(within(fila).queryByText('Bata · Lector')).toBeNull();
  });

  it('el interruptor de admin cambia a otra persona y el propio está deshabilitado', async () => {
    const d = datosBase();
    renderConDatos(<Usuarios />, { datos: d });
    const propio = await screen.findByRole('checkbox', { name: 'Admin de admin@reset.com.pe' });
    expect(propio).toBeDisabled();
    expect(screen.getByText('No puedes quitarte el rol de admin.')).toBeInTheDocument();
    const otro = screen.getByRole('checkbox', { name: 'Admin de luis@wanted.pe' });
    expect(otro).not.toBeChecked();
    await userEvent.click(otro);
    await screen.findByRole('checkbox', { name: 'Admin de luis@wanted.pe', checked: true });
    const perfiles = await d.listarUsuarios();
    expect(perfiles.find((u) => u.correo === 'luis@wanted.pe')?.esAdmin).toBe(true);
  });
});
