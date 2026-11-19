import { useQuery } from '@tanstack/react-query';
import { useDatos } from '../../app/proveedores';
import { nombreDelCompetidor, preguntasDelBorrador, type Borrador } from './borrador';

export function usarDatosDelBorrador(borrador: Borrador) {
  const datos = useDatos();
  const sector = borrador.sector;
  const sectorId = sector && 'id' in sector ? sector.id : null;
  const sectores = useQuery({ queryKey: ['sectores'], queryFn: () => datos.listarSectores() });
  const marcas = useQuery({ queryKey: ['sectores', sectorId, 'marcas'], queryFn: () => datos.listarMarcas(sectorId!), enabled: sectorId !== null });
  const datosSector = sector && 'nombre' in sector ? sector : sectores.data?.find((s) => s.id === sectorId);
  const principal = borrador.competidores[borrador.competidorPrincipal];
  const competidor = principal ? nombreDelCompetidor(principal, marcas.data ?? []) : '';
  const listo = !!datosSector && competidor !== '';
  const preguntas = listo ? preguntasDelBorrador(borrador, { marca: borrador.marca.nombre.trim(), competidor, categoria: datosSector.categoria }) : null;
  const nombresDeCompetidores = borrador.competidores.map((c) => nombreDelCompetidor(c, marcas.data ?? []));
  return { sector: datosSector ?? null, preguntas, nombresDeCompetidores };
}
