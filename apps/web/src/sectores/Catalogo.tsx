import { ErrorDatos, type Marca } from '@lab/datos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { estiloBotonLinea, estiloBotonMod } from '../app/estilos';
import { puedeCrearMarcas } from '../app/guardas';
import { useDatos } from '../app/proveedores';
import { estiloCampo } from '../sesion/MarcoAcceso';
import { useSesion } from '../sesion/useSesion';
import { CampoAlias, CampoTermino, type TerminoEditable } from './CampoAlias';

const VACIO: TerminoEditable = { texto: '', ambiguo: false };

export function normalizarDominios(texto: string): string[] {
  const limpios = texto
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, ''))
    .filter((d) => d !== '');
  return [...new Set(limpios)];
}

const mensajeDe = (falla: unknown, generico: string) => (falla instanceof ErrorDatos ? falla.message : generico);

function MensajeError({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-(length:--t-14) text-error">
      {texto}
    </p>
  );
}

function FormularioMarca({ sectorId, alCerrar }: { sectorId: string; alCerrar: () => void }) {
  const datos = useDatos();
  const cliente = useQueryClient();
  const [nombre, setNombre] = useState<TerminoEditable>(VACIO);
  const [alias, setAlias] = useState<TerminoEditable[]>([]);
  const [dominios, setDominios] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () =>
      datos.crearMarca(sectorId, {
        nombre: nombre.texto.trim(),
        ambiguo: nombre.ambiguo,
        alias: alias.filter((a) => a.texto.trim() !== '').map((a) => ({ texto: a.texto.trim(), ambiguo: a.ambiguo })),
        dominios: normalizarDominios(dominios),
      }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['sectores', sectorId, 'marcas'] });
      alCerrar();
    },
    onError: (falla) => setError(mensajeDe(falla, 'No pudimos guardar la marca. Inténtalo de nuevo.')),
  });

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    crear.mutate();
  }

  const errorEnNombre = error !== null && error.startsWith(`«${nombre.texto.trim()}»`);

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-[26rem] flex-col gap-e4 rounded-card bg-capsula p-e6">
      <h2 className="font-display text-(length:--t-26) uppercase">Agregar marca</h2>
      <CampoTermino etiquetaTexto="Nombre" etiquetaAmbiguo="Ambiguo" valor={nombre} onCambio={setNombre} />
      <MensajeError texto={errorEnNombre ? error : null} />
      <CampoAlias valor={alias} onCambio={setAlias} />
      <MensajeError texto={error !== null && !errorEnNombre ? error : null} />
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Dominios
        <input type="text" value={dominios} onChange={(e) => setDominios(e.target.value)} placeholder="marca.pe, marca.com" className={estiloCampo} />
      </label>
      <div className="flex gap-e4">
        <button type="submit" disabled={nombre.texto.trim() === '' || crear.isPending} aria-busy={crear.isPending} className={estiloBotonMod}>
          Guardar
        </button>
        <button type="button" onClick={alCerrar} className={estiloBotonLinea}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FormularioAlias({ marca, alCerrar }: { marca: Marca; alCerrar: () => void }) {
  const datos = useDatos();
  const cliente = useQueryClient();
  const [alias, setAlias] = useState<TerminoEditable>(VACIO);
  const [error, setError] = useState<string | null>(null);

  const agregar = useMutation({
    mutationFn: () => datos.agregarAlias(marca.id, { texto: alias.texto.trim(), ambiguo: alias.ambiguo }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['sectores', marca.sectorId, 'marcas'] });
      alCerrar();
    },
    onError: (falla) => setError(mensajeDe(falla, 'No pudimos guardar el alias. Inténtalo de nuevo.')),
  });

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    agregar.mutate();
  }

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-[26rem] flex-col gap-e4 rounded-card bg-capsula p-e4">
      <CampoTermino etiquetaTexto="Alias" etiquetaAmbiguo="Ambiguo" valor={alias} onCambio={setAlias} />
      <MensajeError texto={error} />
      <div className="flex gap-e4">
        <button type="submit" disabled={alias.texto.trim() === '' || agregar.isPending} aria-busy={agregar.isPending} className={estiloBotonMod}>
          Guardar
        </button>
        <button type="button" onClick={alCerrar} className={estiloBotonLinea}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function TarjetaMarca({ marca, puedeAgregar, esAdmin }: { marca: Marca; puedeAgregar: boolean; esAdmin: boolean }) {
  const datos = useDatos();
  const cliente = useQueryClient();
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quitar = useMutation({
    mutationFn: (aliasId: string) => datos.quitarAlias(aliasId),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['sectores', marca.sectorId, 'marcas'] }),
    onError: (falla) => setError(mensajeDe(falla, 'No pudimos quitar el alias. Inténtalo de nuevo.')),
  });

  return (
    <li className="flex flex-col gap-e2 rounded-card bg-capsula p-e4">
      <p className="font-semibold">{marca.nombre}</p>
      {marca.alias.length > 0 && (
        <ul className="flex flex-wrap gap-e2">
          {marca.alias.map((a) => (
            <li key={a.id} className="flex items-center gap-e1 rounded-pildora border border-linea px-e4 py-e1 text-(length:--t-14)">
              <span>{a.texto}</span>
              {esAdmin && (
                <button type="button" aria-label={`Quitar alias ${a.texto}`} disabled={quitar.isPending} onClick={() => quitar.mutate(a.id)}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <MensajeError texto={error} />
      {puedeAgregar && !agregando && (
        <button type="button" onClick={() => setAgregando(true)} className={`${estiloBotonLinea} self-start`}>
          Agregar alias a {marca.nombre}
        </button>
      )}
      {puedeAgregar && agregando && <FormularioAlias marca={marca} alCerrar={() => setAgregando(false)} />}
    </li>
  );
}

function PanelMarcas({ sectorId }: { sectorId: string }) {
  const datos = useDatos();
  const { perfil, cargando } = useSesion();
  const marcas = useQuery({ queryKey: ['sectores', sectorId, 'marcas'], queryFn: () => datos.listarMarcas(sectorId) });
  const [agregando, setAgregando] = useState(false);

  if (marcas.isPending || cargando) return <p role="status">Cargando…</p>;
  if (marcas.isError && !marcas.data)
    return (
      <div role="alert" className="flex flex-col items-start gap-e4 py-e4">
        <p className="text-error">No pudimos cargar las marcas.</p>
        <button type="button" onClick={() => marcas.refetch()} className={estiloBotonMod}>
          Reintentar
        </button>
      </div>
    );

  const lista = marcas.data ?? [];
  const puedeAgregar = perfil !== null && puedeCrearMarcas(perfil);

  return (
    <div className="flex flex-col gap-e4">
      {lista.length === 0 && <p>Este sector todavía no tiene marcas.</p>}
      {lista.length > 0 && (
        <ul className="flex flex-col gap-e2">
          {lista.map((m) => (
            <TarjetaMarca key={m.id} marca={m} puedeAgregar={puedeAgregar} esAdmin={perfil?.esAdmin === true} />
          ))}
        </ul>
      )}
      {puedeAgregar && !agregando && (
        <button type="button" onClick={() => setAgregando(true)} className={`${estiloBotonMod} self-start`}>
          Agregar marca
        </button>
      )}
      {puedeAgregar && agregando && <FormularioMarca sectorId={sectorId} alCerrar={() => setAgregando(false)} />}
    </div>
  );
}

type Pestana = 'marcas' | 'plantillas';

export function Catalogo() {
  const { sectorId = '' } = useParams();
  const datos = useDatos();
  const sectores = useQuery({ queryKey: ['sectores'], queryFn: () => datos.listarSectores() });
  const [pestana, setPestana] = useState<Pestana>('marcas');

  if (sectores.isPending) return <p role="status">Cargando…</p>;
  if (sectores.isError && !sectores.data)
    return (
      <div role="alert" className="flex flex-col items-start gap-e4 py-e8">
        <p className="text-error">No pudimos cargar el sector.</p>
        <button type="button" onClick={() => sectores.refetch()} className={estiloBotonMod}>
          Reintentar
        </button>
      </div>
    );
  const sector = sectores.data?.find((s) => s.id === sectorId);
  if (!sector)
    return (
      <div className="flex flex-col items-start gap-e4 py-e8">
        <p>No encontramos este sector.</p>
        <Link to="/sectores" className="underline">
          Sectores
        </Link>
      </div>
    );

  const pestanas: Array<{ id: Pestana; titulo: string }> = [
    { id: 'marcas', titulo: 'Marcas' },
    { id: 'plantillas', titulo: 'Plantillas' },
  ];

  return (
    <div className="flex flex-col gap-e6">
      <div className="flex flex-col gap-e1">
        <h1 className="font-display text-(length:--t-40) uppercase">{sector.nombre}</h1>
        <p className="text-(length:--t-14) text-tinta-2">{sector.categoria}</p>
      </div>
      <div role="tablist" className="flex gap-e2">
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`pestana-${p.id}`}
            aria-selected={pestana === p.id}
            aria-controls={`panel-${p.id}`}
            onClick={() => setPestana(p.id)}
            className={pestana === p.id ? estiloBotonMod : estiloBotonLinea}
          >
            {p.titulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`}>
        {pestana === 'marcas' ? <PanelMarcas sectorId={sector.id} /> : <p className="text-tinta-2">Las plantillas de este sector llegan pronto.</p>}
      </div>
    </div>
  );
}
