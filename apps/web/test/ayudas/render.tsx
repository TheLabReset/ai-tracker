import type { Datos } from '@lab/datos';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Proveedores } from '../../src/app/proveedores';
import { crearDatosEnMemoria } from './datos-en-memoria';

export function renderConDatos(ui: ReactElement, opciones: { datos?: Datos; ruta?: string; patron?: string } = {}) {
  const datos = opciones.datos ?? crearDatosEnMemoria();
  return {
    datos,
    ...render(
      <MemoryRouter initialEntries={[opciones.ruta ?? '/']}>
        <Proveedores datos={datos}>{opciones.patron ? <Routes><Route path={opciones.patron} element={ui} /></Routes> : ui}</Proveedores>
      </MemoryRouter>,
    ),
  };
}
