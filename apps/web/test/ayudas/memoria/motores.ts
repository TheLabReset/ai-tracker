import type { Datos, Motor } from '@lab/datos';
import { INICIO, generico, sinPermiso, type Contexto } from './contexto';

type Motores = Pick<Datos, 'listarMotores' | 'actualizarMotor' | 'historialMotor'>;

export function motoresIniciales(): Motor[] {
  const base = { modelo: null, costoEstimado: null, busquedaWeb: true, activo: true, vigenteDesde: INICIO };
  return [
    { id: crypto.randomUUID(), codigo: 'chatgpt', nombre: 'ChatGPT', proveedor: 'OpenAI', ...base },
    { id: crypto.randomUUID(), codigo: 'gemini', nombre: 'Gemini', proveedor: 'Google', ...base },
    { id: crypto.randomUUID(), codigo: 'claude', nombre: 'Claude', proveedor: 'Anthropic', ...base },
    { id: crypto.randomUUID(), codigo: 'perplexity', nombre: 'Perplexity', proveedor: 'Perplexity', ...base },
  ];
}

export function crearMotores(ctx: Contexto): Motores {
  const { estado } = ctx;
  return {
    listarMotores: () => ctx.leer(() => estado.motores),

    actualizarMotor: (id, cambios) =>
      ctx.escribir((yo) => {
        const motor = estado.motores.find((m) => m.id === id);
        if (!yo.admin || !motor) throw sinPermiso();
        if (cambios.costoEstimado != null && cambios.costoEstimado < 0) throw generico();
        const antes = structuredClone(motor);
        if (cambios.modelo !== undefined) motor.modelo = cambios.modelo;
        if (cambios.busquedaWeb !== undefined) motor.busquedaWeb = cambios.busquedaWeb;
        if (cambios.costoEstimado !== undefined) motor.costoEstimado = cambios.costoEstimado;
        if (cambios.activo !== undefined) motor.activo = cambios.activo;
        if (motor.modelo !== antes.modelo || motor.busquedaWeb !== antes.busquedaWeb) {
          motor.vigenteDesde = ctx.ahora();
          estado.historialMotores.push({
            motorId: id,
            modelo: antes.modelo,
            busquedaWeb: antes.busquedaWeb,
            vigenteHasta: motor.vigenteDesde,
          });
        }
        ctx.registrarSiCambia('motores', id, antes, motor);
        return motor;
      }),

    historialMotor: (id) =>
      ctx.leer(() =>
        estado.historialMotores
          .filter((h) => h.motorId === id)
          .reverse()
          .map(({ modelo, busquedaWeb, vigenteHasta }) => ({ modelo, busquedaWeb, vigenteHasta })),
      ),
  };
}
