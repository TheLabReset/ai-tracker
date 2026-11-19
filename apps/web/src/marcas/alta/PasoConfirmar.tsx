import { ErrorDatos, type DatosAlta } from '@lab/datos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { estiloBotonMod } from '../../app/estilos';
import { useDatos } from '../../app/proveedores';
import { useSesion } from '../../sesion/useSesion';
import type { Borrador } from './borrador';
import type { PropsPaso } from './tipos';
import { usarDatosDelBorrador } from './usarDatosDelBorrador';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const AVISO = 'Listo. La primera vuelta corre cuando esté el motor de ejecución.';

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-e1">
      <dt className="text-(length:--t-12) font-semibold uppercase text-tinta-3">{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const aliasLimpios = (alias: DatosAlta['marca']['alias']) =>
  alias.map((a) => ({ texto: a.texto.trim(), ambiguo: a.ambiguo })).filter((a) => a.texto !== '');

function armarAlta(b: Borrador, preguntas: DatosAlta['preguntas']): DatosAlta | null {
  if (!b.sector) return null;
  const { preguntasPropias: _propias, ...resto } = b;
  return { ...resto, marca: { ...b.marca, alias: aliasLimpios(b.marca.alias) }, sector: b.sector, preguntas };
}

export function PasoConfirmar({ borrador }: PropsPaso) {
  const datos = useDatos();
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const { perfil } = useSesion();
  const { sector, preguntas, nombresDeCompetidores } = usarDatosDelBorrador(borrador);
  const directorio = useQuery({ queryKey: ['directorio'], queryFn: () => datos.listarDirectorio() });
  const motores = useQuery({ queryKey: ['motores'], queryFn: () => datos.listarMotores() });
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: (d: DatosAlta) => datos.crearProyecto(d),
    onSuccess: (id) => {
      void cliente.invalidateQueries({ queryKey: ['proyectos'] });
      navegar(`/marcas/${id}/configuracion`, { state: { aviso: AVISO } });
    },
    onError: (falla) => setError(falla instanceof ErrorDatos ? falla.message : 'No pudimos crear la marca. Inténtalo de nuevo.'),
  });

  if (!preguntas || !sector) return <p role="status">Cargando…</p>;

  const persona = (id: string | undefined, vacio: string) => {
    if (!id) return vacio;
    const p = directorio.data?.find((x) => x.id === id);
    return p ? p.nombre || p.correo : vacio;
  };
  const m = borrador.marca;
  const alias = aliasLimpios(m.alias);
  const conteo = (set: string) => preguntas.filter((p) => p.set === set).length;
  const nombresMotores = (motores.data ?? []).filter((x) => borrador.motorIds.includes(x.id)).map((x) => x.nombre);
  const alta = armarAlta(borrador, preguntas);

  function enviar() {
    if (!alta || crear.isPending) return;
    setError(null);
    crear.mutate(alta);
  }

  return (
    <div className="flex max-w-[40rem] flex-col gap-e4">
      <dl className="flex flex-col gap-e4 rounded-card bg-capsula p-e4">
        <Fila titulo="Marca">
          {m.nombre}
          {alias.length > 0 && <span className="block text-tinta-2">Alias: {alias.map((a) => a.texto).join(', ')}</span>}
          {m.dominios.length > 0 && <span className="block text-tinta-2">Dominios: {m.dominios.join(', ')}</span>}
        </Fila>
        <Fila titulo="Empresa">{m.empresaId === 'reset' ? 'Reset' : 'Wanted'}</Fila>
        <Fila titulo="Líder">{persona(borrador.liderId, perfil?.esAdmin ? 'Sin líder' : 'Tú')}</Fila>
        <Fila titulo="Responsable">{persona(borrador.responsableId, 'Sin responsable')}</Fila>
        <Fila titulo="Sector">
          {sector.nombre} · {sector.categoria}
          {borrador.categoriasExtra.length > 0 && <span className="block text-tinta-2">Más categorías: {borrador.categoriasExtra.join(', ')}</span>}
        </Fila>
        <Fila titulo="Competidores">
          <ul>
            {nombresDeCompetidores.map((n, i) => (
              <li key={i}>
                {n}
                {i === borrador.competidorPrincipal && ' (principal)'}
              </li>
            ))}
          </ul>
        </Fila>
        <Fila titulo="Preguntas">
          {preguntas.length} en total: {conteo('compat')} de la ficha, {conteo('extendido')} por categoría, {conteo('propia')} propias
        </Fila>
        <Fila titulo="Motores">{nombresMotores.join(', ')}</Fila>
        <Fila titulo="Programación">
          {borrador.cadencia === 'manual' ? 'Manual' : `${borrador.cadencia === 'semanal' ? 'Semanal' : 'Quincenal'}, ${DIAS[borrador.diaSemana]} a las ${borrador.hora}`} · {borrador.muestras} muestras
        </Fila>
        <Fila titulo="Tope de gasto mensual">{borrador.topeGastoMensual === null ? 'Sin tope' : `US$ ${borrador.topeGastoMensual.toFixed(2)}`}</Fila>
      </dl>
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      <button type="button" disabled={crear.isPending} onClick={enviar} className={`${estiloBotonMod} self-start`}>
        Crear y dejar listo para medir
      </button>
    </div>
  );
}
