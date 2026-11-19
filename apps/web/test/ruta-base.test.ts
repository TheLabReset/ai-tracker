import { describe, expect, it } from 'vitest';
import { rutaBase, urlDeLaApp } from '../src/app/rutaBase';

describe('ruta base de la app', () => {
  it('sirve en la raíz o en una subcarpeta', () => {
    expect(rutaBase('/')).toBe('/');
    expect(rutaBase('/the-lab-ai-tracker/')).toBe('/the-lab-ai-tracker');
  });
  it('arma la dirección a la que vuelven los enlaces de los correos', () => {
    expect(urlDeLaApp('http://127.0.0.1:5173', '/')).toBe('http://127.0.0.1:5173');
    expect(urlDeLaApp('https://webiwabou.github.io', '/the-lab-ai-tracker/')).toBe('https://webiwabou.github.io/the-lab-ai-tracker');
  });
});
