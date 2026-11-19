import { ErrorDatos } from '@lab/datos';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Configuracion } from '../src/marcas/Configuracion';
import { proyectoDePrueba } from './ayudas/alta';
import { renderConDatos } from './ayudas/render';

const PATRON = '/marcas/:proyectoId/configuracion';
const P1 = '¿Qué marca de calzado me recomiendas en Perú?';

async function abrir(rol: Parameters<typeof proyectoDePrueba>[0]['rol']) {
  const { datos, proyectoId } = await proyectoDePrueba({ rol });
  renderConDatos(<Configuracion />, { datos, ruta: `/marcas/${proyectoId}/configuracion`, patron: PATRON });
  return { datos, proyectoId };
}

async function editarP1(texto: string) {
  const p1 = (await screen.findByText(P1)).closest('li')!;
  await userEvent.click(within(p1).getByRole('button', { name: 'Editar' }));
  await userEvent.clear(within(p1).getByRole('textbox'));
  await userEvent.type(within(p1).getByRole('textbox'), texto);
  await userEvent.click(within(p1).getByRole('button', { name: 'Guardar' }));
}

describe('configuración de la marca', () => {
  it('muestra la cabecera y las preguntas con versión, código y etiqueta', async () => {
    await abrir('admin');
    expect(await screen.findByRole('heading', { name: 'Bata' })).toBeInTheDocument();
    expect(screen.getByText('Calzado')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    const p1 = screen.getByText(P1).closest('li')!;
    expect(within(p1).getByText('v1')).toBeInTheDocument();
    expect(within(p1).getByText('P1')).toBeInTheDocument();
    expect(within(p1).getByText('Ficha')).toBeInTheDocument();
  });
  it('editar una pregunta crea la versión 2', async () => {
    await abrir('admin');
    await editarP1('¿Qué zapatillas me recomiendas en Perú?');
    expect(await screen.findByText('v2')).toBeInTheDocument();
  });
  it('guardar el mismo texto con espacios de más conserva la versión', async () => {
    const { datos, proyectoId } = await abrir('admin');
    await editarP1(`  ${P1}  `);
    expect(await screen.findByText(P1)).toBeInTheDocument();
    const p = await datos.obtenerProyecto(proyectoId);
    expect(p.preguntas.every((q) => q.version === 1)).toBe(true);
  });
  it('agrega una pregunta propia y quita una', async () => {
    await abrir('admin');
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar pregunta propia' }));
    await userEvent.type(screen.getByLabelText('Texto'), '¿Qué marca dura más?');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    const nueva = (await screen.findByText('¿Qué marca dura más?')).closest('li')!;
    expect(within(nueva).getByText('Propia')).toBeInTheDocument();
    expect(within(nueva).getByText('X1')).toBeInTheDocument();
    await userEvent.click(within(nueva).getByRole('button', { name: 'Quitar' }));
    expect(screen.queryByText('¿Qué marca dura más?')).toBeNull();
  });
  it('pausar muestra Pausado y ofrece Reactivar', async () => {
    await abrir('admin');
    await userEvent.click(await screen.findByRole('button', { name: 'Pausar' }));
    expect(await screen.findByText('Pausado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reactivar' }));
    expect(await screen.findByText('Activo')).toBeInTheDocument();
  });
  it('archivar muestra Archivado y ofrece Reactivar', async () => {
    await abrir('admin');
    await userEvent.click(await screen.findByRole('button', { name: 'Archivar' }));
    expect(await screen.findByText('Archivado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pausar' })).toBeNull();
  });
  it('un líder de la marca puede editar', async () => {
    await abrir('lider');
    expect(await screen.findAllByRole('button', { name: 'Editar' })).not.toHaveLength(0);
    expect(screen.queryByText(/Solo lectura/)).toBeNull();
  });
  it('un responsable ve la configuración en solo lectura', async () => {
    await abrir('responsable');
    expect(await screen.findByText('Solo lectura: pídele al líder de la marca que haga los cambios.')).toBeInTheDocument();
    expect(screen.getByText(P1)).toBeInTheDocument();
    expect(screen.getByText('Footloose')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pausar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar competidores' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar pesos' })).toBeNull();
  });
  it('cambia los competidores y el principal', async () => {
    const { datos, proyectoId } = await abrir('admin');
    await userEvent.click(await screen.findByLabelText('Skechers'));
    await userEvent.selectOptions(screen.getByLabelText('Competidor principal (para P2)'), 'Skechers');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar competidores' }));
    await screen.findByText('Competidores guardados.');
    const p = await datos.obtenerProyecto(proyectoId);
    expect(p.competidores.map((c) => c.nombre).sort()).toEqual(['Footloose', 'Skechers']);
    expect(p.competidorPrincipalId).toBe(p.competidores.find((c) => c.nombre === 'Skechers')!.id);
  });
  it('no deja pasar de 5 competidores', async () => {
    const { datos, proyectoId } = await proyectoDePrueba({ rol: 'admin' });
    const base = datos.estado.marcas.find((m) => m.nombre === 'Skechers')!;
    for (const n of ['A1', 'A2', 'A3', 'A4']) datos.estado.marcas.push({ ...structuredClone(base), id: crypto.randomUUID(), nombre: n });
    renderConDatos(<Configuracion />, { datos, ruta: `/marcas/${proyectoId}/configuracion`, patron: PATRON });
    for (const n of ['Skechers', 'A1', 'A2', 'A3', 'A4']) await userEvent.click(await screen.findByLabelText(n));
    expect(screen.getByText('Hasta 5 competidores.')).toBeInTheDocument();
    expect(screen.getByLabelText('A4')).not.toBeChecked();
  });
  it('si falla el principal, refresca los competidores guardados y lo dice', async () => {
    const { datos, proyectoId } = await proyectoDePrueba({ rol: 'admin' });
    const original = datos.obtenerProyecto.bind(datos);
    let lecturas = 0;
    datos.obtenerProyecto = async (id) => {
      lecturas++;
      return original(id);
    };
    datos.actualizarProyecto = async () => {
      throw new ErrorDatos('datos_invalidos', 'El principal no es válido.');
    };
    renderConDatos(<Configuracion />, { datos, ruta: `/marcas/${proyectoId}/configuracion`, patron: PATRON });
    await userEvent.click(await screen.findByLabelText('Skechers'));
    await userEvent.selectOptions(screen.getByLabelText('Competidor principal (para P2)'), 'Skechers');
    const antes = lecturas;
    await userEvent.click(screen.getByRole('button', { name: 'Guardar competidores' }));
    expect(await screen.findByText('Guardamos los competidores, pero no el principal: El principal no es válido.')).toBeInTheDocument();
    expect(lecturas).toBeGreaterThan(antes);
    expect((await original(proyectoId)).competidores).toHaveLength(2);
  });
  it('un competidor que no está en el catálogo del sector se ve marcado y cuenta para el tope', async () => {
    const { datos, proyectoId } = await proyectoDePrueba({ rol: 'admin' });
    const base = datos.estado.marcas.find((m) => m.nombre === 'Skechers')!;
    for (const n of ['A1', 'A2', 'A3', 'A4']) datos.estado.marcas.push({ ...structuredClone(base), id: crypto.randomUUID(), nombre: n });
    const listar = datos.listarMarcas.bind(datos);
    datos.listarMarcas = async (id) => (await listar(id)).filter((m) => m.nombre !== 'Footloose');
    renderConDatos(<Configuracion />, { datos, ruta: `/marcas/${proyectoId}/configuracion`, patron: PATRON });
    expect(await screen.findByLabelText('Footloose')).toBeChecked();
    for (const n of ['A1', 'A2', 'A3', 'A4']) await userEvent.click(screen.getByLabelText(n));
    expect(screen.getByLabelText('A4')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Skechers'));
    expect(screen.getByText('Hasta 5 competidores.')).toBeInTheDocument();
    expect(screen.getByLabelText('Skechers')).not.toBeChecked();
    await userEvent.click(screen.getByLabelText('Footloose'));
    expect(screen.getByLabelText('Footloose')).not.toBeChecked();
  });
  it('guarda motores y cadencia', async () => {
    const { datos, proyectoId } = await abrir('admin');
    await userEvent.selectOptions(await screen.findByLabelText('Cadencia'), 'Quincenal');
    await userEvent.selectOptions(screen.getByLabelText('Día'), 'Viernes');
    await userEvent.click(screen.getByLabelText('Perplexity'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText('Motores y cadencia guardados.');
    const p = await datos.obtenerProyecto(proyectoId);
    expect(p).toMatchObject({ cadencia: 'quincenal', diaSemana: 5 });
    expect(p.motores.map((m) => m.nombre)).not.toContain('Perplexity');
  });
  it('guarda los pesos y rechaza negativos', async () => {
    const { datos, proyectoId } = await abrir('admin');
    const primero = await screen.findByLabelText('1.º');
    await userEvent.clear(primero);
    await userEvent.type(primero, '5');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar pesos' }));
    await screen.findByText('Pesos guardados.');
    expect((await datos.obtenerProyecto(proyectoId)).pesos).toEqual({ 1: 5, 2: 2, 3: 1 });
    await userEvent.clear(primero);
    await userEvent.type(primero, '-1');
    expect(screen.getByRole('button', { name: 'Guardar pesos' })).toBeDisabled();
  });
  it('un error al guardar se muestra junto a la sección', async () => {
    const { datos } = await abrir('admin');
    datos.actualizarProyecto = async () => {
      throw new ErrorDatos('sin_permiso', 'No puedes cambiar esto.');
    };
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar pesos' }));
    expect(await screen.findByText('No puedes cambiar esto.')).toBeInTheDocument();
  });
  it('sin acceso a la marca lo dice', async () => {
    const { datos } = await proyectoDePrueba({ rol: 'admin' });
    datos.estado.usuarios.push({ id: crypto.randomUUID(), correo: 'otra@reset.com.pe', clave: 'x', admin: false });
    datos.estado.sesion = 'otra@reset.com.pe';
    renderConDatos(<Configuracion />, { datos, ruta: `/marcas/${datos.estado.proyectos[0]!.id}/configuracion`, patron: PATRON });
    expect(await screen.findByText('No tienes acceso a esta marca.')).toBeInTheDocument();
  });
});
