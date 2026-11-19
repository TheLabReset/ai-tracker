export function rutaBase(base: string): string {
  return base === '/' ? '/' : base.replace(/\/+$/, '');
}

export function urlDeLaApp(origen: string, base: string): string {
  return `${origen}${rutaBase(base) === '/' ? '' : rutaBase(base)}`;
}
