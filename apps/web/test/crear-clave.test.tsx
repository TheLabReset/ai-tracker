import { ErrorDatos } from '@lab/datos';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CrearClave } from '../src/sesion/CrearClave';
import { crearDatosEnMemoria } from './ayudas/datos-en-memoria';
import { renderConDatos } from './ayudas/render';

function Sitio() {
  return <p>ruta: {useLocation().pathname}</p>;
}
const pantalla = () => (
  <Routes>
    <Route path="/crear-password" element={<CrearClave />} />
    <Route path="*" element={<Sitio />} />
  </Routes>
);

function conEnlace() {
  const d = crearDatosEnMemoria({ usuarios: [{ correo: 'ana@reset.com.pe', clave: 'x' }] });
  d.estado.sesion = 'ana@reset.com.pe';
  return d;
}

async function llenar(clave: string, repetida: string) {
  const u = userEvent.setup();
  const boton = await screen.findByRole('button', { name: 'Guardar y entrar' });
  if (clave) await u.type(screen.getByLabelText('Contraseña nueva'), clave);
  if (repetida) await u.type(screen.getByLabelText('Repítela'), repetida);
  await u.click(boton);
}

describe('crear contraseña', () => {
  it('sin la sesión del enlace pide abrir el correo en vez del formulario', async () => {
    const datos = crearDatosEnMemoria();
    renderConDatos(pantalla(), { datos, ruta: '/crear-password' });
    expect(await screen.findByText('Abre el enlace que te llegó por correo para crear tu contraseña.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña nueva')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar y entrar' })).toBeNull();
  });
  it('avisa si faltan datos o si no coinciden, sin guardar nada', async () => {
    const datos = conEnlace();
    renderConDatos(pantalla(), { datos, ruta: '/crear-password' });
    await llenar('', '');
    expect(await screen.findByText('Escribe tu contraseña.')).toBeInTheDocument();
    await llenar('secreta123', 'otra123');
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(datos.estado.clavesNuevas).toEqual([]);
  });
  it('guarda la contraseña y lleva a la raíz', async () => {
    const datos = conEnlace();
    renderConDatos(pantalla(), { datos, ruta: '/crear-password' });
    await llenar('secreta123', 'secreta123');
    expect(await screen.findByText('ruta: /')).toBeInTheDocument();
    expect(datos.estado.clavesNuevas).toEqual(['secreta123']);
  });
  it('muestra el mensaje de datos si falla', async () => {
    const datos = conEnlace();
    datos.crearClave = async () => {
      throw new ErrorDatos('datos_invalidos', 'La contraseña debe tener al menos 6 caracteres.');
    };
    renderConDatos(pantalla(), { datos, ruta: '/crear-password' });
    await llenar('abc', 'abc');
    expect(await screen.findByText('La contraseña debe tener al menos 6 caracteres.')).toBeInTheDocument();
  });
});
