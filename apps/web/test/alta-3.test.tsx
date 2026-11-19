import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorDatos } from '@lab/datos';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';
import { renderConDatos } from './ayudas/render';
import { datosDeAlta } from './ayudas/alta';

async function hastaMotores() {
  await userEvent.type(await screen.findByLabelText('Nombre de la marca'), 'Bata');
  await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
  await userEvent.selectOptions(screen.getByLabelText('Sector'), 'Calzado');
  for (let i = 0; i < 2; i++) await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
  await userEvent.click(screen.getByLabelText('Footloose'));
  for (let i = 0; i < 2; i++) await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
}

function conPrecios() {
  const d = datosDeAlta();
  for (const m of d.estado.motores) m.costoEstimado = 0.01;
  return d;
}

describe('alta de marca · pasos 6 y 7', () => {
  it('sin precios no inventa el costo', async () => {
    renderConDatos(<App />, { datos: datosDeAlta(), ruta: '/marcas/nueva' });
    await hastaMotores();
    expect(screen.getByText('Costo por definir: faltan los precios de ChatGPT, Gemini, Claude y Perplexity.')).toBeInTheDocument();
  });
  it('con precios muestra el costo y crea el proyecto', async () => {
    const d = conPrecios();
    renderConDatos(<App />, { datos: d, ruta: '/marcas/nueva' });
    await hastaMotores();
    expect(screen.getByText('Por vuelta: US$ 0.60 · Por mes: US$ 2.60')).toBeInTheDocument(); // 5 preguntas × 3 muestras × 4 motores × 0,01
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear y dejar listo para medir' }));
    expect(await screen.findByText('Listo. La primera vuelta corre cuando esté el motor de ejecución.')).toBeInTheDocument();
    expect(d.estado.proyectos).toHaveLength(1);
    expect(d.estado.proyectos[0]).toMatchObject({ muestras: 3, cadencia: 'semanal', diaSemana: 3, hora: '07:00' });
  });
  it('un alias en blanco se descarta y el alta se crea igual', async () => {
    const d = conPrecios();
    renderConDatos(<App />, { datos: d, ruta: '/marcas/nueva' });
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar un alias' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar un alias' }));
    await userEvent.type(screen.getByLabelText('Alias 2'), '  Bata Perú  ');
    await hastaMotores();
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(screen.getByText('Alias: Bata Perú')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear y dejar listo para medir' }));
    expect(await screen.findByText('Listo. La primera vuelta corre cuando esté el motor de ejecución.')).toBeInTheDocument();
    expect(d.estado.proyectos).toHaveLength(1);
    const marca = d.estado.marcas.find((m) => m.id === d.estado.proyectos[0]!.marcaId)!;
    expect(marca.alias.map((a) => a.texto)).toEqual(['Bata Perú']);
  });
  it('en manual el costo por mes depende de las vueltas y se oculta el día', async () => {
    renderConDatos(<App />, { datos: conPrecios(), ruta: '/marcas/nueva' });
    await hastaMotores();
    await userEvent.selectOptions(screen.getByLabelText('Cadencia'), 'Manual');
    expect(screen.getByText('Por vuelta: US$ 0.60 · Por mes: depende de cuántas vueltas lances.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Día')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hora')).not.toBeInTheDocument();
  });
  it('sin motores marcados no deja seguir ni muestra costo', async () => {
    renderConDatos(<App />, { datos: conPrecios(), ruta: '/marcas/nueva' });
    await hastaMotores();
    for (const n of ['ChatGPT', 'Gemini', 'Claude', 'Perplexity']) await userEvent.click(screen.getByLabelText(n));
    expect(screen.getByText('Elige al menos un motor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeDisabled();
    expect(screen.queryByText(/Por vuelta/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Costo por definir/)).not.toBeInTheDocument();
  });
  it('un error al crear se muestra y conserva el borrador', async () => {
    const d = conPrecios();
    d.crearProyecto = async () => {
      throw new ErrorDatos('colision_alias', 'El alias «UP» ya es de otra marca.');
    };
    renderConDatos(<App />, { datos: d, ruta: '/marcas/nueva' });
    await hastaMotores();
    await userEvent.selectOptions(screen.getByLabelText('Cadencia'), 'Quincenal');
    await userEvent.selectOptions(screen.getByLabelText('Día'), 'Viernes');
    await userEvent.type(screen.getByLabelText('Tope de gasto mensual (US$)'), '50');
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear y dejar listo para medir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El alias «UP» ya es de otra marca.');
    expect(screen.getByRole('button', { name: 'Crear y dejar listo para medir' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByLabelText('Cadencia')).toHaveDisplayValue('Quincenal');
    expect(screen.getByLabelText('Día')).toHaveDisplayValue('Viernes');
    expect(screen.getByLabelText('Tope de gasto mensual (US$)')).toHaveValue(50);
    expect(screen.getByLabelText('ChatGPT')).toBeChecked();
  });
});
