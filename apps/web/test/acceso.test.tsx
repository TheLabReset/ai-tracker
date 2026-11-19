import { ErrorDatos } from '@lab/datos';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';
import { crearDatosEnMemoria } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

const datos = () => crearDatosEnMemoria({ usuarios: [{ correo: 'ana@reset.com.pe', clave: 'secreta123' }] });
async function intentar(correo: string, clave: string) {
  const u = userEvent.setup();
  if (correo) await u.type(screen.getByLabelText('Correo'), correo);
  if (clave) await u.type(screen.getByLabelText('Contraseña'), clave);
  await u.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('pantalla de acceso', () => {
  it('pide el correo de la agencia y no llama a la base con un dominio ajeno', async () => {
    const d = datos();
    renderConDatos(<App />, { datos: d });
    await intentar('', 'x');
    expect(await screen.findByText('Escribe tu correo de la agencia.')).toBeInTheDocument();
    await intentar('ana@gmail.com', 'x');
    expect(await screen.findByText('Usa tu correo de Reset o Wanted.')).toBeInTheDocument();
    expect(d.estado.intentosDeEntrada).toBe(0);
  });
  it('con credenciales malas avisa, y con las buenas entra', async () => {
    renderConDatos(<App />, { datos: datos() });
    await intentar('ana@reset.com.pe', 'mala');
    expect(await screen.findByText('El correo o la contraseña no coinciden.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Contraseña'));
    await intentar('', 'secreta123');
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
  });
  it('¿La olvidaste? pide el correo primero', async () => {
    renderConDatos(<App />, { datos: datos() });
    await userEvent.click(screen.getByRole('button', { name: '¿La olvidaste?' }));
    expect(await screen.findByText('Escribe tu correo arriba y vuelve a tocar «¿La olvidaste?».')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@reset.com.pe');
    await userEvent.click(screen.getByRole('button', { name: '¿La olvidaste?' }));
    expect(await screen.findByText('Si ana@reset.com.pe tiene cuenta, le llega un enlace para volver a entrar.')).toBeInTheDocument();
  });
  it('sin contraseña avisa antes de llamar a la base', async () => {
    const d = datos();
    renderConDatos(<App />, { datos: d });
    await intentar('ana@reset.com.pe', '');
    expect(await screen.findByText('Escribe tu contraseña.')).toBeInTheDocument();
    expect(d.estado.intentosDeEntrada).toBe(0);
  });
  it('si falla la conexión lo dice sin culpar a la contraseña', async () => {
    const d = datos();
    d.entrar = async () => {
      throw new ErrorDatos('conexion', 'x');
    };
    renderConDatos(<App />, { datos: d });
    await intentar('ana@reset.com.pe', 'secreta123');
    expect(
      await screen.findByText('No pudimos entrar, y no es tu contraseña: falló la conexión con el servidor. Vuelve a intentar en un momento.'),
    ).toBeInTheDocument();
  });
});
