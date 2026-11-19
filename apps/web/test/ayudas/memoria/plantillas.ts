import { ErrorDatos, type Datos, type Plantilla } from '@lab/datos';
import { PLANTILLAS_COMPAT, variablesDesconocidas } from '@lab/nucleo';
import { generico, invalido, porTexto, sinPermisoCatalogo, type Contexto } from './contexto';

type Plantillas = Pick<Datos, 'listarPlantillas' | 'crearPlantilla'>;

export function plantillasGlobales(): Plantilla[] {
  return PLANTILLAS_COMPAT.map((p) => ({ id: crypto.randomUUID(), sectorId: null, ...p }));
}

export function crearPlantillas(ctx: Contexto): Plantillas {
  const { estado } = ctx;
  return {
    listarPlantillas: (sectorId) =>
      ctx.leer(() =>
        estado.plantillas
          .filter((p) => p.sectorId === null || (sectorId !== undefined && p.sectorId === sectorId))
          .sort((a, b) => {
            if ((a.sectorId === null) !== (b.sectorId === null)) return a.sectorId === null ? -1 : 1;
            return porTexto(a.codigo, b.codigo);
          }),
      ),

    crearPlantilla: (p) =>
      ctx.escribir((yo) => {
        const [desconocida] = variablesDesconocidas(p.texto);
        if (desconocida) throw new ErrorDatos('datos_invalidos', `La variable {${desconocida}} no existe`);
        const global = !p.sectorId;
        if (global ? !yo.admin : !ctx.puedeAmpliar(yo)) throw sinPermisoCatalogo();
        if (p.codigo.trim() === '' || p.texto.trim() === '') throw generico();
        if (p.sectorId && !estado.sectores.some((s) => s.id === p.sectorId)) throw generico();
        if (estado.plantillas.some((x) => x.sectorId === (p.sectorId || null) && x.codigo === p.codigo)) {
          throw invalido('Ya hay una plantilla con ese código.');
        }
        const plantilla: Plantilla = { id: ctx.nuevoId(), codigo: p.codigo, sectorId: p.sectorId || null, tipo: p.tipo, texto: p.texto };
        estado.plantillas.push(plantilla);
        ctx.registrar('plantillas', plantilla.id, 'insertar', null, plantilla);
        return plantilla;
      }),
  };
}
