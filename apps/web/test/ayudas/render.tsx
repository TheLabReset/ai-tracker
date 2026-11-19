import type { Datos } from '@lab/datos';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { Proveedores } from '../../src/app/proveedores';
import { crearDatosEnMemoria } from './datos-en-memoria';

export function renderConDatos(ui: ReactElement, opciones: { datos?: Datos; ruta?: string } = {}) {
  const datos = opciones.datos ?? crearDatosEnMemoria();
  return {
    datos,
    ...render(
      <MemoryRouter initialEntries={[opciones.ruta ?? '/']}>
        <Proveedores datos={datos}>{ui}</Proveedores>
      </MemoryRouter>,
    ),
  };
}
