import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '../src');

function archivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : /\.(tsx?|css)$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

describe('tokens de diseño', () => {
  it('los tamaños de texto usados existen en tokens.css', () => {
    const definidos = new Set([...readFileSync(join(SRC, 'estilos/tokens.css'), 'utf8').matchAll(/(--t-\d+):/g)].map((m) => m[1]));
    const usados = archivos(SRC).flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/(--t-\d+)(?!\d|:)/g)].map((m) => `${m[1]} en ${f.slice(SRC.length + 1)}`),
    );
    expect(usados.filter((u) => !definidos.has(u.split(' ')[0]!))).toEqual([]);
  });
});
