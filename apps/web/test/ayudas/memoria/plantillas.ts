import { ErrorDatos, type Datos, type Plantilla } from '@lab/datos';
import { PLANTILLAS_COMPAT, llavesMalformadas, variablesDesconocidas } from '@lab/nucleo';
import { esUuid, generico, invalido, porTexto, sinPermisoCatalogo, type Contexto } from './contexto';
import { TIPOS_PREGUNTA } from './validar';

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
        const [malformada] = llavesMalformadas(p.texto);
        if (malformada) throw new ErrorDatos('datos_invalidos', `Revisa las llaves: «${malformada}» no es una variable.`);
        const [desconocida] = variablesDesconocidas(p.texto);
        if (desconocida) throw new ErrorDatos('datos_invalidos', `La variable {${desconocida}} no existe`);
        const global = p.sectorId == null;
        if (!global && !esUuid(p.sectorId)) throw generico();
        if (global ? !yo.admin : !ctx.puedeAmpliar(yo)) throw sinPermisoCatalogo();
        if (p.codigo.trim() === '' || p.texto.trim() === '' || !TIPOS_PREGUNTA.includes(p.tipo)) throw generico();
        if (!global && !estado.sectores.some((s) => s.id === p.sectorId)) throw generico();
        if (estado.plantillas.some((x) => x.sectorId === (p.sectorId ?? null) && x.codigo === p.codigo)) {
          throw invalido('Ya hay una plantilla con ese código.');
        }
        const plantilla: Plantilla = { id: ctx.nuevoId(), codigo: p.codigo, sectorId: p.sectorId ?? null, tipo: p.tipo, texto: p.texto };
        estado.plantillas.push(plantilla);
        ctx.registrar('plantillas', plantilla.id, 'insertar', null, plantilla);
        return plantilla;
      }),
  };
}
