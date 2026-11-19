import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Bitacora } from '../src/admin/Bitacora';
import { crearDatosEnMemoria, idDeUsuario } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

describe('admin · bitácora', () => {
  it('lista fecha, correo, entidad y acción, y filtra por entidad', async () => {
    const d = crearDatosEnMemoria({
      usuarios: [
        { correo: 'admin@reset.com.pe', clave: 'x', admin: true },
        { correo: 'luis@wanted.pe', clave: 'x' },
      ],
    });
    d.estado.sesion = 'admin@reset.com.pe';
    await d.cambiarAdmin(idDeUsuario(d, 'luis@wanted.pe'), true);
    await d.actualizarMotor(d.estado.motores[0]!.id, { modelo: 'm-1' });
    renderConDatos(<Bitacora />, { datos: d });
    const filas = await screen.findAllByRole('row');
    expect(filas).toHaveLength(3);
    const primera = filas[1]!;
    expect(within(primera).getByText('motores')).toBeInTheDocument();
    expect(within(primera).getByText('Cambió')).toBeInTheDocument();
    expect(within(primera).getByText('admin@reset.com.pe')).toBeInTheDocument();
    expect(within(primera).getByText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)).toBeInTheDocument();
    const filtro = screen.getByLabelText('Entidad');
    expect(within(filtro).getAllByRole('option')).toHaveLength(12);
    await userEvent.selectOptions(filtro, 'usuarios');
    await screen.findByRole('cell', { name: 'usuarios' });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.queryByRole('cell', { name: 'motores' })).toBeNull();
  });
});
