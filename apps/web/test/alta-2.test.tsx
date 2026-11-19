import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Asistente } from '../src/marcas/alta/Asistente';
import { renderConDatos } from './ayudas/render';
import { datosDeAlta } from './ayudas/alta';

async function hastaCompetidores(marca = 'Bata') {
  await userEvent.type(await screen.findByLabelText('Nombre de la marca'), marca);
  await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
  await userEvent.selectOptions(screen.getByLabelText('Sector'), 'Calzado');
  await userEvent.type(screen.getByLabelText('Categorías más específicas'), 'zapatillas');
  await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
  expect(screen.getByText('La vuelta de exploración llega con el motor de ejecución. Por ahora, elige los competidores a mano.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
}

async function agregar(nombre: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Agregar competidor' }));
  await userEvent.type(screen.getByLabelText('Nombre del competidor'), nombre);
  await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
}

describe('alta de marca · pasos 3 a 5', () => {
  it('limita a 5 competidores y pide el principal', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await hastaCompetidores();
    await userEvent.click(screen.getByLabelText('Footloose'));
    for (const n of ['A1', 'A2', 'A3', 'A4', 'A5']) {
      await userEvent.click(screen.getByRole('button', { name: 'Agregar competidor' }));
      await userEvent.type(screen.getByLabelText('Nombre del competidor'), n);
      await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    }
    expect(screen.getByText('Hasta 5 competidores.')).toBeInTheDocument();
    expect(screen.getByLabelText('Competidor principal (para P2)')).toHaveDisplayValue('Footloose');
  });
  it('arma las 5 preguntas de la ficha más las de cada categoría', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await hastaCompetidores();
    await userEvent.click(screen.getByLabelText('Footloose'));
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(screen.getByText('¿Bata o Footloose? ¿Cuál me conviene?')).toBeInTheDocument();
    expect(screen.getByText('¿Qué marca de zapatillas me recomiendas en Perú?')).toBeInTheDocument();
    expect(screen.getAllByText('Ficha')).toHaveLength(5);
    expect(screen.getAllByText('zapatillas')).toHaveLength(3);
  });
  it('no ofrece la marca cliente y no deja seguir sin competidores', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await hastaCompetidores('foot loose');
    expect(screen.queryByLabelText('Footloose')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Skechers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeDisabled();
  });
  it('un competidor nuevo repetido marca el del catálogo, o se ignora', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await hastaCompetidores();
    await agregar('skechers');
    expect(screen.getByText('«skechers» ya está en el catálogo: la marcamos.')).toBeInTheDocument();
    expect(screen.getByLabelText('Skechers')).toBeChecked();
    await agregar('Bata');
    expect(screen.getByText('Esa es la marca que estás dando de alta.')).toBeInTheDocument();
    await agregar('Nueva');
    await agregar('nueva');
    expect(screen.getByText('Ya la agregaste.')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Nueva')).toHaveLength(1);
  });
  it('el principal sigue al competidor desmarcado', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await hastaCompetidores();
    await userEvent.click(screen.getByLabelText('Footloose'));
    await userEvent.click(screen.getByLabelText('Skechers'));
    await userEvent.selectOptions(screen.getByLabelText('Competidor principal (para P2)'), 'Skechers');
    await userEvent.click(screen.getByLabelText('Skechers'));
    expect(screen.getByLabelText('Competidor principal (para P2)')).toHaveDisplayValue('Footloose');
  });
  it('agrega y quita preguntas propias', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await hastaCompetidores();
    await userEvent.click(screen.getByLabelText('Footloose'));
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar pregunta propia' }));
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Comparativa');
    await userEvent.type(screen.getByLabelText('Texto'), '¿Dónde compro zapatos?');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByText('¿Dónde compro zapatos?')).toBeInTheDocument();
    expect(screen.getByText('Propia')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar pregunta X1' }));
    expect(screen.queryByText('¿Dónde compro zapatos?')).not.toBeInTheDocument();
  });
  it('si la marca cliente pasa a llamarse como un competidor marcado, lo quita', async () => {
    renderConDatos(<Asistente />, { datos: datosDeAlta() });
    await hastaCompetidores();
    await userEvent.click(screen.getByLabelText('Footloose'));
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await userEvent.clear(screen.getByLabelText('Nombre de la marca'));
    await userEvent.type(screen.getByLabelText('Nombre de la marca'), 'Footloose');
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(await screen.findByText('Quitamos «Footloose» de los competidores: es la marca que estás dando de alta.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Competidor principal (para P2)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Skechers'));
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(screen.getByText('¿Footloose o Skechers? ¿Cuál me conviene?')).toBeInTheDocument();
  });
});
