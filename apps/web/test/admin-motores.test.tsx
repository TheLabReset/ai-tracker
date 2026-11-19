import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Motores } from '../src/admin/Motores';
import { crearDatosEnMemoria, motoresIniciales } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

function datosAdmin() {
  const d = crearDatosEnMemoria({
    motores: motoresIniciales(),
    usuarios: [{ correo: 'admin@reset.com.pe', clave: 'x', admin: true }],
  });
  d.estado.sesion = 'admin@reset.com.pe';
  return d;
}

describe('admin · motores', () => {
  it('muestra los 4 motores y "Por definir" donde falta el modelo', async () => {
    renderConDatos(<Motores />, { datos: datosAdmin() });
    const fila = (await screen.findByRole('cell', { name: 'ChatGPT' })).closest('tr')!;
    expect(within(fila).getAllByText('Por definir')).toHaveLength(2);
    expect(screen.getAllByRole('row')).toHaveLength(5);
  });
  it('cambiar el modelo lo guarda y deja historial', async () => {
    renderConDatos(<Motores />, { datos: datosAdmin() });
    const fila = (await screen.findByRole('cell', { name: 'ChatGPT' })).closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    await userEvent.type(screen.getByLabelText('Modelo'), 'modelo-1');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await within(fila).findByText('modelo-1')).toBeInTheDocument();
    await userEvent.click(within(fila).getByRole('button', { name: 'Historial' }));
    expect(await screen.findByText(/Hasta .*: Por definir/)).toBeInTheDocument();
  });
});
