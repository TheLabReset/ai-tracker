import { ErrorDatos } from '@lab/datos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { estiloBotonLinea, estiloBotonMod } from '../app/estilos';
import { puedeCrearMarcas } from '../app/guardas';
import { useDatos } from '../app/proveedores';
import { estiloCampo } from '../sesion/MarcoAcceso';
import { useSesion } from '../sesion/useSesion';

function FormularioSector({ alCerrar }: { alCerrar: () => void }) {
  const datos = useDatos();
  const cliente = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () => datos.crearSector({ nombre: nombre.trim(), categoria: categoria.trim() }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['sectores'] });
      alCerrar();
    },
    onError: (falla) => setError(falla instanceof ErrorDatos ? falla.message : 'No pudimos crear el sector. Inténtalo de nuevo.'),
  });

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    crear.mutate();
  }

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-[26rem] flex-col gap-e4 rounded-card bg-capsula p-e6">
      <h2 className="font-display text-(length:--t-26) uppercase">Nuevo sector</h2>
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Nombre del sector
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={estiloCampo} />
      </label>
      {error && (
        <p role="alert" className="text-(length:--t-14) text-error">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Categoría
        <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={estiloCampo} />
      </label>
      <div className="flex gap-e4">
        <button type="submit" disabled={nombre.trim() === '' || categoria.trim() === '' || crear.isPending} aria-busy={crear.isPending} className={estiloBotonMod}>
          Guardar
        </button>
        <button type="button" onClick={alCerrar} className={estiloBotonLinea}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function Sectores() {
  const datos = useDatos();
  const { perfil, cargando } = useSesion();
  const sectores = useQuery({ queryKey: ['sectores'], queryFn: () => datos.listarSectores() });
  const [creando, setCreando] = useState(false);

  if (sectores.isPending || cargando) return <p role="status">Cargando…</p>;
  if (sectores.isError && !sectores.data)
    return (
      <div role="alert" className="flex flex-col items-start gap-e4 py-e8">
        <p className="text-error">No pudimos cargar los sectores.</p>
        <button type="button" onClick={() => sectores.refetch()} className={estiloBotonMod}>
          Reintentar
        </button>
      </div>
    );

  const lista = sectores.data ?? [];
  const puedeCrear = perfil !== null && puedeCrearMarcas(perfil);

  return (
    <div className="flex flex-col gap-e6">
      <h1 className="font-display text-(length:--t-40) uppercase">Sectores</h1>
      {lista.length === 0 && <p>Todavía no hay sectores.</p>}
      {lista.length > 0 && (
        <ul className="flex flex-col gap-e2">
          {lista.map((s) => (
            <li key={s.id}>
              <Link to={`/sectores/${s.id}`} className="flex items-baseline justify-between gap-e4 rounded-card bg-capsula px-e6 py-e4">
                <span className="font-semibold">{s.nombre}</span>
                <span className="text-(length:--t-14) text-tinta-2">{s.categoria}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {puedeCrear && !creando && (
        <button type="button" onClick={() => setCreando(true)} className={`${estiloBotonMod} self-start`}>
          Nuevo sector
        </button>
      )}
      {puedeCrear && creando && <FormularioSector alCerrar={() => setCreando(false)} />}
    </div>
  );
}
