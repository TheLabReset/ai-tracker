import type { ClienteTracker } from './cliente';
import { aMarca, aSector } from './catalogo';
import { comprobar, comprobarLista, conTraduccion, sinPermiso } from './errores';
import { aMotor } from './motores';
import type { Datos, PreguntaProyecto, Proyecto, ResumenProyecto } from './tipos';

type Proyectos = Pick<
  Datos,
  | 'crearProyecto'
  | 'listarProyectos'
  | 'obtenerProyecto'
  | 'actualizarProyecto'
  | 'cambiarCompetidores'
  | 'editarPregunta'
  | 'agregarPregunta'
  | 'desactivarPregunta'
  | 'cambiarEstado'
>;

const aPregunta = (f: any): PreguntaProyecto => ({
  id: f.id,
  codigo: f.codigo,
  tipo: f.tipo,
  set: f.set,
  categoria: f.categoria,
  texto: f.texto,
  version: f.version,
});

export function crearProyectos(cliente: ClienteTracker, sesionActual: Datos['sesionActual']): Proyectos {
  const marcasPorId = async (ids: string[]) => {
    const filas = comprobarLista(await cliente.from('marcas').select('*, alias(*)').in('id', ids));
    return new Map(filas.map((f: any) => [f.id as string, aMarca(f)]));
  };

  return {
    crearProyecto: (d) => conTraduccion(async () => comprobar(await cliente.rpc('crear_proyecto', { d }))),

    listarProyectos: () =>
      conTraduccion(async () => {
        const perfil = await sesionActual();
        const proyectos = comprobarLista(await cliente.from('proyectos').select('id, marca_id, sector_id, estado'));
        if (proyectos.length === 0) return [];
        const marcas = comprobarLista(
          await cliente.from('marcas').select('id, nombre').in('id', proyectos.map((p: any) => p.marca_id)),
        );
        const sectores = comprobarLista(await cliente.from('sectores').select('id, nombre'));
        const nombreMarca = new Map(marcas.map((m: any) => [m.id, m.nombre as string]));
        const nombreSector = new Map(sectores.map((s: any) => [s.id, s.nombre as string]));
        const rolDe = new Map((perfil?.membresias ?? []).map((m) => [m.marcaId, m.rol]));
        return proyectos
          .flatMap((p: any): ResumenProyecto[] => {
            const miRol = rolDe.get(p.marca_id) ?? (perfil?.esAdmin ? 'admin' : undefined);
            if (!miRol) return [];
            return [
              {
                id: p.id,
                marcaNombre: nombreMarca.get(p.marca_id) ?? '',
                sectorNombre: nombreSector.get(p.sector_id) ?? '',
                estado: p.estado,
                miRol,
              },
            ];
          })
          .sort((a, b) => a.marcaNombre.localeCompare(b.marcaNombre, 'es'));
      }),

    obtenerProyecto: (id) =>
      conTraduccion(async () => {
        const fila: any = comprobar(await cliente.from('proyectos').select('*').eq('id', id).maybeSingle());
        if (!fila) throw sinPermiso();
        const [competidores, enMotores, preguntas, sector] = await Promise.all([
          cliente.from('proyecto_competidores').select('marca_id').eq('proyecto_id', id).order('orden'),
          cliente.from('proyecto_motores').select('motor_id').eq('proyecto_id', id),
          cliente.from('preguntas').select('*').eq('proyecto_id', id).eq('activa', true).order('codigo'),
          cliente.from('sectores').select('*').eq('id', fila.sector_id).single(),
        ]);
        const idsCompetidores = comprobarLista(competidores).map((c: any) => c.marca_id as string);
        const idsMotores = comprobarLista(enMotores).map((m: any) => m.motor_id as string);
        const [marcas, motores] = await Promise.all([
          marcasPorId([fila.marca_id, ...idsCompetidores]),
          cliente.from('motores').select('*').in('id', idsMotores).order('orden'),
        ]);
        const proyecto: Proyecto = {
          id: fila.id,
          marca: marcas.get(fila.marca_id)!,
          sector: aSector(comprobar(sector)),
          categoriasExtra: fila.categorias_extra,
          competidores: idsCompetidores.map((c) => marcas.get(c)!),
          competidorPrincipalId: fila.competidor_principal_id,
          motores: comprobarLista(motores).map(aMotor),
          preguntas: comprobarLista(preguntas).map(aPregunta),
          cadencia: fila.cadencia,
          diaSemana: fila.dia_semana,
          hora: String(fila.hora).slice(0, 5),
          muestras: fila.muestras,
          pesos: { 1: Number(fila.pesos['1']), 2: Number(fila.pesos['2']), 3: Number(fila.pesos['3']) },
          topeGastoMensual: fila.tope_gasto_mensual === null ? null : Number(fila.tope_gasto_mensual),
          estado: fila.estado,
        };
        return proyecto;
      }),

    actualizarProyecto: (id, c) =>
      conTraduccion(async () => {
        comprobar(await cliente.rpc('actualizar_proyecto', { p: id, c }));
      }),

    cambiarCompetidores: (id, marcaIds) =>
      conTraduccion(async () => {
        comprobar(await cliente.rpc('cambiar_competidores', { p: id, marcas: marcaIds }));
      }),

    editarPregunta: (preguntaId, texto) =>
      conTraduccion(async () => aPregunta(comprobar(await cliente.rpc('editar_pregunta', { pregunta: preguntaId, texto })))),

    agregarPregunta: (proyectoId, p) =>
      conTraduccion(async () =>
        aPregunta(
          comprobar(await cliente.rpc('agregar_pregunta', { proyecto: proyectoId, tipo: p.tipo, texto: p.texto, categoria: p.categoria })),
        ),
      ),

    desactivarPregunta: (preguntaId) =>
      conTraduccion(async () => {
        comprobar(await cliente.rpc('desactivar_pregunta', { pregunta: preguntaId }));
      }),

    cambiarEstado: (id, estado) =>
      conTraduccion(async () => {
        comprobar(await cliente.rpc('cambiar_estado', { p: id, estado }));
      }),
  };
}
