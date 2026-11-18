import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { claveMarca } from '../src/texto';
import { leerFicha } from '../src/ficha/leer';
import { panelComoExcel } from '../src/ficha/panel';
import { diagnosticarFicha } from '../src/ficha/diagnostico';
import { importarFicha } from '../src/ficha/importar';
import { verificarContraPanel } from '../src/ficha/verificar';

const dir = process.env.FICHAS_DIR;
const fichas = dir ? readdirSync(dir).filter((f) => f.endsWith('.xlsx')).map((f) => leerFicha(new Uint8Array(readFileSync(join(dir, f))))) : [];
const por = (marca: string) => fichas.find((f) => claveMarca(f.datos.marca) === claveMarca(marca))!;
const cuenta = (marca: string, tipo: string) => diagnosticarFicha(por(marca)).filter((a) => a.tipo === tipo);
const op = { marcaClienteId: 'cliente', catalogo: [] };

describe.runIf(dir)('las 8 fichas reales', () => {
  it('están las 8', () => expect(fichas).toHaveLength(8));
  it('el Panel recalculado es idéntico al de cada ficha', () => {
    for (const f of fichas) expect(panelComoExcel(f.filas), f.datos.marca).toEqual(f.panel);
  });
  it('encuentra los problemas descritos en §1.3', () => {
    expect(cuenta('Protecta Security', 'fila_incompleta')).toHaveLength(78);
    expect(cuenta('San Fernando', 'fila_incompleta')).toHaveLength(46);
    expect(cuenta('Programa de Alta Dirección', 'fila_incompleta')).toHaveLength(0);
    expect(cuenta('San Fernando', 'valor_fuera_de_lista').filter((a) => a.valor === 'No Cita')).toHaveLength(40);
    expect(cuenta('Reset', 'valor_fuera_de_lista').filter((a) => a.valor === 'Si')).toHaveLength(5);
    expect(cuenta('Reset', 'puesto_con_no')).toHaveLength(16);
    expect(cuenta('AunaSalud', 'puesto_con_no')).toHaveLength(39);
    expect(cuenta('Reset', 'cobertura_incompleta')).toHaveLength(6);
    const sinNumero = cuenta('Bioderma', 'vuelta_sin_numero');
    expect(sinNumero).toHaveLength(20);
    expect(new Set(sinNumero.map((a) => a.correccion?.a))).toEqual(new Set([7]));
    expect(cuenta('Win', 'formula_rota').length).toBeGreaterThan(0);
    expect(cuenta('Bioderma', 'formula_rota').length).toBeGreaterThan(0);
  });
  it('PAD: nos nombra 75, 75, 95, 85, 90 y 75, y sugiere UP, ESAN y CENTRUM', () => {
    const pad = por('Programa de Alta Dirección');
    expect([1, 2, 3, 4, 5, 6].map((v) => pad.panel.vueltas[v as 1].nombraPct)).toEqual([75, 75, 95, 85, 90, 75]);
    expect(importarFicha(pad, { ...op, aceptadas: [] }).competidoresSugeridos.slice(0, 3).map((c) => c.texto)).toEqual(['UP', 'ESAN', 'CENTRUM']);
  });
  it('cada ficha cuadra con el Panel, sin correcciones y con todas las propuestas', () => {
    for (const f of fichas) {
      const anomalias = diagnosticarFicha(f);
      const todas = anomalias.flatMap((a) => (a.correccion ? [a.correccion] : []));
      for (const aceptadas of [[], todas]) {
        const v = verificarContraPanel(f, importarFicha(f, { ...op, aceptadas }), anomalias, op);
        expect(v.diferencias.filter((d) => d.explicadaPor.length === 0), f.datos.marca).toEqual([]);
      }
    }
  });
});
