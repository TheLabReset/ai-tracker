import { ErrorDatos } from '@lab/datos';
import { esCorreoPermitido } from '@lab/nucleo';
import { useState, type FormEvent } from 'react';
import { useDatos } from '../app/proveedores';
import { EncabezadoFormulario, estiloBoton, estiloCampo, MarcoAcceso } from './MarcoAcceso';
import { useSesion } from './useSesion';

const TEXTO_CONEXION =
  'No pudimos entrar, y no es tu contraseña: falló la conexión con el servidor. Vuelve a intentar en un momento.';

const TEXTO_CONEXION_RECUPERACION =
  'No pudimos pedir el enlace: falló la conexión con el servidor. Vuelve a intentar en un momento.';

function textoDeError(error: unknown, conexion = TEXTO_CONEXION): string {
  if (error instanceof ErrorDatos) {
    if (error.codigo === 'correo_no_permitido') return 'Usa tu correo de Reset o Wanted.';
    if (error.codigo === 'credenciales') return 'El correo o la contraseña no coinciden.';
    if (error.codigo === 'conexion') return conexion;
    return error.message;
  }
  return conexion;
}

export function PantallaAcceso() {
  const datos = useDatos();
  const { entrar } = useSesion();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);

  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (!correo.trim()) return setError('Escribe tu correo de la agencia.');
    if (!clave) return setError('Escribe tu contraseña.');
    if (!esCorreoPermitido(correo)) return setError('Usa tu correo de Reset o Wanted.');
    setError(null);
    setOcupado(true);
    try {
      await entrar(correo, clave);
    } catch (falla) {
      setError(textoDeError(falla));
      setOcupado(false);
    }
  }

  async function alOlvidar() {
    setAviso(null);
    if (!correo.trim()) return setError('Escribe tu correo arriba y vuelve a tocar «¿La olvidaste?».');
    if (!esCorreoPermitido(correo)) return setError('Usa tu correo de Reset o Wanted.');
    setError(null);
    setPidiendo(true);
    try {
      await datos.pedirRecuperacion(correo);
      setAviso(`Si ${correo.trim()} tiene cuenta, le llega un enlace para volver a entrar.`);
    } catch (falla) {
      setError(textoDeError(falla, TEXTO_CONEXION_RECUPERACION));
    } finally {
      setPidiendo(false);
    }
  }

  return (
    <MarcoAcceso>
      <EncabezadoFormulario etiqueta="ENTRAR" titulo="Con tu correo de Reset o Wanted" />
      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-e4">
        <label className="flex flex-col gap-e2 text-(length:--t-14) font-semibold">
          Correo
          <input
            type="email"
            autoComplete="username"
            placeholder="nombre@reset.com.pe"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className={estiloCampo}
          />
        </label>
        <div className="flex flex-col gap-e2">
          <div className="flex items-center justify-between">
            <label htmlFor="clave" className="text-(length:--t-14) font-semibold">
              Contraseña
            </label>
            <button type="button" onClick={alOlvidar} disabled={pidiendo} className="text-(length:--t-14) text-tinta-2 underline disabled:opacity-60">
              ¿La olvidaste?
            </button>
          </div>
          <input
            id="clave"
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className={estiloCampo}
          />
        </div>
        <p role="alert" className="min-h-0 text-(length:--t-14) text-error">
          {error}
        </p>
        <p role="status" className="min-h-0 text-(length:--t-14) text-ok">
          {aviso}
        </p>
        <button type="submit" disabled={ocupado} aria-busy={ocupado} className={estiloBoton}>
          Entrar
        </button>
      </form>
      <p className="text-(length:--t-12) text-tinta-3">
        Si te invitaron y es tu primera vez, entra con el enlace del correo: te pide crear la contraseña antes de llegar al tracker.
      </p>
    </MarcoAcceso>
  );
}
