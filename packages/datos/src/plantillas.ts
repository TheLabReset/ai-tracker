import { llavesMalformadas, variablesDesconocidas } from '@lab/nucleo';
import type { ClienteTracker } from './cliente';
import { comprobar, comprobarLista, conTraduccion } from './errores';
import { ErrorDatos, type Datos, type Plantilla } from './tipos';

type Plantillas = Pick<Datos, 'listarPlantillas' | 'crearPlantilla'>;

const aPlantilla = (f: any): Plantilla => ({
  id: f.id,
  codigo: f.codigo,
  sectorId: f.sector_id,
  tipo: f.tipo,
  texto: f.texto,
});

export function crearPlantillas(cliente: ClienteTracker): Plantillas {
  return {
    listarPlantillas: (sectorId) =>
      conTraduccion(async () => {
        const base = cliente.from('plantillas').select('*');
        const filtrada = sectorId ? base.or(`sector_id.is.null,sector_id.eq.${sectorId}`) : base.is('sector_id', null);
        return comprobarLista(await filtrada.order('sector_id', { ascending: true, nullsFirst: true }).order('codigo')).map(aPlantilla);
      }),

    crearPlantilla: (p) =>
      conTraduccion(async () => {
        const [malformada] = llavesMalformadas(p.texto);
        if (malformada) throw new ErrorDatos('datos_invalidos', `Revisa las llaves: «${malformada}» no es una variable.`);
        const [desconocida] = variablesDesconocidas(p.texto);
        if (desconocida) throw new ErrorDatos('datos_invalidos', `La variable {${desconocida}} no existe`);
        return aPlantilla(
          comprobar(
            await cliente
              .from('plantillas')
              .insert({ codigo: p.codigo, sector_id: p.sectorId, tipo: p.tipo, texto: p.texto })
              .select()
              .single(),
          ),
        );
      }),
  };
}
