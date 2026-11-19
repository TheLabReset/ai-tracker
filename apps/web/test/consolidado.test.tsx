import { armarSetCompat } from '@lab/nucleo';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Consolidado } from '../src/consolidado/Consolidado';
import { proyectoDePrueba } from './ayudas/alta';
import { renderConDatos } from './ayudas/render';

describe('consolidado', () => {
  it('lista las marcas visibles con su estado y tu rol', async () => {
    const { datos } = await proyectoDePrueba({ rol: 'lider' });
    renderConDatos(<Consolidado />, { datos });
    expect(await screen.findByText('1 marca')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Consolidado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bata' })).toHaveAttribute('href', expect.stringMatching(/\/marcas\/.+\/configuracion$/));
    expect(screen.getByText('Calzado')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Sin vueltas todavía')).toBeInTheDocument();
    expect(screen.getByText('Líder')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nueva marca' })).toBeInTheDocument();
  });

  it('usa el plural con varias marcas', async () => {
    const { datos } = await proyectoDePrueba({ rol: 'admin' });
    const [primero] = await datos.listarProyectos();
    const { marca } = await datos.obtenerProyecto(primero!.id);
    const competidor = datos.estado.marcas.find((m) => m.nombre === 'Skechers')!;
    await datos.crearProyecto({
      marca: { nombre: 'Ripley', ambiguo: false, alias: [], dominios: [], empresaId: 'reset' },
      sector: { id: datos.estado.sectores[0]!.id },
      categoriasExtra: [],
      competidores: [{ id: competidor.id }],
      competidorPrincipal: 0,
      preguntas: armarSetCompat({ marca: 'Ripley', competidor: 'Skechers', categoria: 'calzado' }).map((p) => ({ ...p, set: 'compat' as const, categoria: null })),
      motorIds: datos.estado.motores.map((m) => m.id),
      cadencia: 'semanal',
      diaSemana: 3,
      hora: '07:00',
      muestras: 3,
      topeGastoMensual: null,
    });
    expect(marca.nombre).toBe('Bata');
    renderConDatos(<Consolidado />, { datos });
    expect(await screen.findByText('2 marcas')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
  });

  it('quien no puede crear marcas ve la tabla sin el botón Nueva marca', async () => {
    const { datos } = await proyectoDePrueba({ rol: 'lector' });
    renderConDatos(<Consolidado />, { datos });
    expect(await screen.findByRole('link', { name: 'Bata' })).toBeInTheDocument();
    expect(screen.getByText('Lector')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nueva marca' })).not.toBeInTheDocument();
  });

  it('el admin ve Admin como rol en una marca sin membresía', async () => {
    const { datos } = await proyectoDePrueba({ rol: 'admin' });
    renderConDatos(<Consolidado />, { datos });
    expect(await screen.findByRole('link', { name: 'Bata' })).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
