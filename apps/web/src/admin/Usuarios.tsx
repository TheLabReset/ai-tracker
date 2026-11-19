import { ErrorDatos, type RolMarca, type UsuarioListado } from '@lab/datos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ETIQUETA_EMPRESA, ETIQUETA_ROL, ETIQUETA_ROL_CORTA } from '../app/etiquetas';
import { useDatos } from '../app/proveedores';
import { estiloCampo } from '../sesion/MarcoAcceso';
import { useSesion } from '../sesion/useSesion';
import { estiloBotonLinea, estiloBotonMod } from '../app/estilos';

const ROLES = Object.keys(ETIQUETA_ROL) as RolMarca[];

const mensaje = (falla: unknown, defecto: string) => (falla instanceof ErrorDatos ? falla.message : defecto);

function FormularioAcceso({ usuario, alCerrar }: { usuario: UsuarioListado; alCerrar: () => void }) {
  const datos = useDatos();
  const cliente = useQueryClient();
  const [sectorId, setSectorId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [rol, setRol] = useState<RolMarca | ''>('');
  const [error, setError] = useState<string | null>(null);

  const sectores = useQuery({ queryKey: ['sectores'], queryFn: () => datos.listarSectores() });
  const marcas = useQuery({
    queryKey: ['marcas', sectorId],
    queryFn: () => datos.listarMarcas(sectorId),
    enabled: sectorId !== '',
  });

  const guardar = useMutation({
    mutationFn: (r: RolMarca) => datos.asignarMembresia(usuario.id, marcaId, r),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['usuarios'] });
      alCerrar();
    },
    onError: (falla) => setError(mensaje(falla, 'No pudimos dar el acceso. Inténtalo de nuevo.')),
  });

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    if (!marcaId || !rol) return;
    setError(null);
    guardar.mutate(rol);
  }

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-[26rem] flex-col gap-e4 rounded-card bg-capsula p-e6">
      <h2 className="font-display text-(length:--t-26) uppercase">Dar acceso a {usuario.correo}</h2>
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Sector
        <select
          value={sectorId}
          onChange={(e) => {
            setSectorId(e.target.value);
            setMarcaId('');
          }}
          className={estiloCampo}
        >
          <option value="">Elige un sector</option>
          {(sectores.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Marca
        <select value={marcaId} onChange={(e) => setMarcaId(e.target.value)} disabled={sectorId === ''} className={estiloCampo}>
          <option value="">Elige una marca</option>
          {(marcas.data ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
        Rol
        <select value={rol} onChange={(e) => setRol(e.target.value as RolMarca | '')} className={estiloCampo}>
          <option value="">Elige un rol</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-(length:--t-14) text-error">
          {error}
        </p>
      )}
      <div className="flex gap-e4">
        <button type="submit" disabled={!marcaId || !rol || guardar.isPending} aria-busy={guardar.isPending} className={estiloBotonMod}>
          Guardar
        </button>
        <button type="button" onClick={alCerrar} className={estiloBotonLinea}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function Usuarios() {
  const datos = useDatos();
  const cliente = useQueryClient();
  const { perfil } = useSesion();
  const usuarios = useQuery({ queryKey: ['usuarios'], queryFn: () => datos.listarUsuarios() });
  const [dandoAcceso, setDandoAcceso] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const marcarError = (id: string, texto: string | null) =>
    setErrores((previos) => {
      const { [id]: _, ...resto } = previos;
      return texto ? { ...resto, [id]: texto } : resto;
    });

  const cambiarAdmin = useMutation({
    mutationFn: (v: { id: string; esAdmin: boolean }) => datos.cambiarAdmin(v.id, v.esAdmin),
    onMutate: (v) => marcarError(v.id, null),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['usuarios'] }),
    onError: (falla, v) => marcarError(v.id, mensaje(falla, 'No pudimos cambiar el rol. Inténtalo de nuevo.')),
  });

  const quitar = useMutation({
    mutationFn: (v: { id: string; marcaId: string }) => datos.quitarMembresia(v.id, v.marcaId),
    onMutate: (v) => marcarError(v.id, null),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['usuarios'] }),
    onError: (falla, v) => marcarError(v.id, mensaje(falla, 'No pudimos quitar el acceso. Inténtalo de nuevo.')),
  });

  if (usuarios.isPending) return <p role="status">Cargando…</p>;
  if (usuarios.isError && !usuarios.data)
    return (
      <div role="alert" className="flex flex-col items-start gap-e4 py-e8">
        <p className="text-error">No pudimos cargar los usuarios.</p>
        <button type="button" onClick={() => usuarios.refetch()} className={estiloBotonMod}>
          Reintentar
        </button>
      </div>
    );

  const lista = usuarios.data ?? [];
  const elegido = lista.find((u) => u.id === dandoAcceso);

  return (
    <div className="flex flex-col gap-e6">
      <h1 className="font-display text-(length:--t-40) uppercase">Usuarios</h1>
      <table className="w-full text-left text-(length:--t-14)">
        <thead>
          <tr>
            <th className="py-e2">Correo</th>
            <th>Empresa</th>
            <th>Admin</th>
            <th>Marcas</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lista.map((u) => {
            const propio = u.id === perfil?.id;
            return (
              <tr key={u.id} className="border-t border-linea align-top">
                <td className="py-e2 font-semibold">{u.correo}</td>
                <td>{ETIQUETA_EMPRESA[u.empresaId]}</td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Admin de ${u.correo}`}
                    checked={u.esAdmin}
                    disabled={propio}
                    onChange={(e) => cambiarAdmin.mutate({ id: u.id, esAdmin: e.target.checked })}
                  />
                  {propio && <p className="text-(length:--t-14)">No puedes quitarte el rol de admin.</p>}
                </td>
                <td>
                  {u.membresias.length === 0 && <span>Sin marcas</span>}
                  <ul className="flex flex-wrap gap-e2">
                    {u.membresias.map((m) => (
                      <li key={m.marcaId} className="flex items-center gap-e1 rounded-pildora bg-capsula px-e4 py-e1">
                        <span>
                          {m.marcaNombre} · {ETIQUETA_ROL_CORTA[m.rol]}
                        </span>
                        <button
                          type="button"
                          aria-label={`Quitar ${m.marcaNombre}`}
                          onClick={() => quitar.mutate({ id: u.id, marcaId: m.marcaId })}
                          className="font-bold"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  {errores[u.id] && (
                    <p role="alert" className="text-(length:--t-14) text-error">
                      {errores[u.id]}
                    </p>
                  )}
                </td>
                <td className="py-e2">
                  <button type="button" onClick={() => setDandoAcceso(u.id)} className={estiloBotonLinea}>
                    Dar acceso
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {elegido && <FormularioAcceso key={elegido.id} usuario={elegido} alCerrar={() => setDandoAcceso(null)} />}
    </div>
  );
}
