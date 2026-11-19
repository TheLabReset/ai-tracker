import { armarSetCompat } from '@lab/nucleo';
import { describe, expect, it } from 'vitest';
import type { Datos, NuevaMarca } from '../src/tipos';
import { alta } from './ayudas/alta';

const unico = (base: string) => `${base} ${crypto.randomUUID().slice(0, 8)}`;
const marcaNueva = (nombre: string, alias: string[] = []): NuevaMarca => ({
  nombre,
  ambiguo: false,
  alias: alias.map((texto) => ({ texto, ambiguo: false })),
  dominios: [],
});

export function probarContrato(
  nombre: string,
  preparar: () => Promise<{ admin: Datos; otro: Datos; otroId: string }>,
): void {
  describe(nombre, () => {
    it('rechaza en entrar un correo fuera de los dominios', async () => {
      const { otro } = await preparar();
      await expect(otro.entrar('ana@gmail.com', 'clave-cualquiera')).rejects.toMatchObject({
        codigo: 'correo_no_permitido',
        message: 'Usa tu correo de Reset o Wanted.',
      });
    });

    it('rechaza un alias que choca y dice de qué marca es', async () => {
      const { admin } = await preparar();
      const sector = await admin.crearSector({ nombre: unico('Educación'), categoria: 'educación' });
      const primera = unico('Pacífico Business School');
      await admin.crearMarca(sector.id, marcaNueva(primera, ['UP']));
      await expect(admin.crearMarca(sector.id, marcaNueva(unico('ESAN'), ['U.P.']))).rejects.toMatchObject({
        codigo: 'colision_alias',
        message: `«U.P.» ya es de ${primera}`,
      });
    });

    it('rechaza más de cinco competidores en el alta', async () => {
      const { admin } = await preparar();
      const seis = Array.from({ length: 6 }, () => marcaNueva(unico('Rival')));
      await expect(admin.crearProyecto(await alta(admin, { competidores: seis }))).rejects.toMatchObject({
        codigo: 'limite_competidores',
        message: 'Elige de 1 a 5 competidores.',
      });
    });

    it('editar crea una versión nueva y guardar el mismo texto no', async () => {
      const { admin } = await preparar();
      const pid = await admin.crearProyecto(await alta(admin));
      const p1 = (await admin.obtenerProyecto(pid)).preguntas[0]!;
      for (const texto of [p1.texto, `  ${p1.texto}  `]) {
        expect(await admin.editarPregunta(p1.id, texto)).toMatchObject({ id: p1.id, version: 1 });
      }
      const v2 = await admin.editarPregunta(p1.id, '¿Qué marca de zapatillas me recomiendas en Perú?');
      expect(v2).toMatchObject({ codigo: p1.codigo, version: 2 });
      expect((await admin.obtenerProyecto(pid)).preguntas.filter((q) => q.codigo === p1.codigo)).toEqual([v2]);
    });

    it('P2 sigue al competidor principal y versiona solo si cambia', async () => {
      const { admin } = await preparar();
      const marca = unico('Bata');
      const [a, b] = [unico('Footloose'), unico('Skechers')];
      const preguntas = armarSetCompat({ categoria: 'calzado', marca, competidor: a }).map((p) => ({ ...p, set: 'compat' as const, categoria: null }));
      const base = await alta(admin, { competidores: [marcaNueva(a), marcaNueva(b)], competidorPrincipal: 0, preguntas });
      const pid = await admin.crearProyecto({ ...base, marca: { ...base.marca, nombre: marca } });
      const p2 = async () => (await admin.obtenerProyecto(pid)).preguntas.filter((q) => q.codigo === 'P2');
      const { competidores } = await admin.obtenerProyecto(pid);
      const idDe = (n: string) => competidores.find((c) => c.nombre === n)!.id;
      expect(await p2()).toMatchObject([{ version: 1, texto: `¿${marca} o ${a}? ¿Cuál me conviene?` }]);

      await admin.actualizarProyecto(pid, { competidorPrincipalId: idDe(b) });
      expect(await p2()).toMatchObject([{ version: 2, set: 'compat', tipo: 'comparativa', texto: `¿${marca} o ${b}? ¿Cuál me conviene?` }]);
      await admin.actualizarProyecto(pid, { competidorPrincipalId: idDe(b), muestras: 4 });
      expect(await p2()).toMatchObject([{ version: 2 }]);

      await admin.cambiarCompetidores(pid, [idDe(a)]);
      expect(await p2()).toMatchObject([{ version: 3, texto: `¿${marca} o ${a}? ¿Cuál me conviene?` }]);
      expect((await admin.obtenerProyecto(pid)).preguntas).toHaveLength(5);
    });

    it('quien no es líder ni admin no da de alta', async () => {
      const { otro } = await preparar();
      await expect(otro.crearProyecto(await alta(otro))).rejects.toMatchObject({ codigo: 'sin_permiso' });
    });

    it('listarProyectos no incluye proyectos ajenos', async () => {
      const { admin, otro } = await preparar();
      const pid = await admin.crearProyecto(await alta(admin));
      expect((await admin.listarProyectos()).some((r) => r.id === pid)).toBe(true);
      expect((await otro.listarProyectos()).some((r) => r.id === pid)).toBe(false);
    });
  });
}
