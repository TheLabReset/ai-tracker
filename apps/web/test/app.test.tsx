import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';
import { crearDatosEnMemoria } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

describe('App', () => {
  it('sin sesión, muestra la pantalla de acceso', async () => {
    renderConDatos(<App />, { datos: crearDatosEnMemoria() });
    expect(await screen.findByRole('heading', { name: /con tu correo de reset o wanted/i })).toBeInTheDocument();
  });
});
