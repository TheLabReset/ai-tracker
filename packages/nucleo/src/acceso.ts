const DOMINIO_PERMITIDO = /@reset\.com\.pe$|@wanted\.pe$/i;

/** Solo correos de Reset y Wanted, como en SiReset. */
export function esCorreoPermitido(correo: string): boolean {
  return DOMINIO_PERMITIDO.test(correo.trim());
}

export function empresaDeCorreo(correo: string): 'reset' | 'wanted' | null {
  const c = correo.trim();
  if (/@reset\.com\.pe$/i.test(c)) return 'reset';
  if (/@wanted\.pe$/i.test(c)) return 'wanted';
  return null;
}
