import { ErrorDatos } from '@lab/datos';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useDatos } from '../app/proveedores';
import { EncabezadoFormulario, estiloBoton, estiloCampo, MarcoAcceso } from './MarcoAcceso';
import { CLAVE_SESION, useSesion } from './useSesion';

export function CrearClave() {
  const datos = useDatos();
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const { perfil, cargando } = useSesion();
  const [clave, setClave] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    if (!clave) return setError('Escribe tu contraseña.');
    if (clave !== repetida) return setError('Las contraseñas no coinciden.');
    setError(null);
    setOcupado(true);
    try {
      await datos.crearClave(clave);
      await cliente.invalidateQueries({ queryKey: CLAVE_SESION });
      navegar('/');
    } catch (falla) {
      setError(falla instanceof ErrorDatos ? falla.message : 'No pudimos guardar tu contraseña. Inténtalo de nuevo.');
      setOcupado(false);
    }
  }

  if (cargando) return <p role="status" className="p-e6">Cargando…</p>;
  if (!perfil)
    return (
      <MarcoAcceso>
        <EncabezadoFormulario etiqueta="CREAR CONTRASEÑA" titulo="Elige tu contraseña" />
        <p className="text-(length:--t-16) text-tinta-2">Abre el enlace que te llegó por correo para crear tu contraseña.</p>
      </MarcoAcceso>
    );

  return (
    <MarcoAcceso>
      <EncabezadoFormulario etiqueta="CREAR CONTRASEÑA" titulo="Elige tu contraseña" />
      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-e4">
        <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
          Contraseña nueva
          <input type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} className={estiloCampo} />
        </label>
        <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
          Repítela
          <input type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} className={estiloCampo} />
        </label>
        <p role="alert" className="min-h-0 text-(length:--t-14) text-error">
          {error}
        </p>
        <button type="submit" disabled={ocupado} aria-busy={ocupado} className={estiloBoton}>
          Guardar y entrar
        </button>
      </form>
    </MarcoAcceso>
  );
}
