import { afterEach, describe, expect, it } from 'vitest';
import { clienteServicio } from './ayudas/entorno';
import { usuarioDePrueba } from './ayudas/usuarios';

afterEach(async () => {
  const { error } = await clienteServicio()
    .from('motores')
    .update({ modelo: null, costo_estimado: null, busqueda_web: true, activo: true, parametros: {} })
    .not('id', 'is', null);
  if (error) throw error;
});

describe('motores', () => {
  it('vienen los 4 de la ficha, sin modelo ni precio todavía', async () => {
    const u = await usuarioDePrueba();
    const m = await u.datos.listarMotores();
    expect(m.map((x) => [x.codigo, x.nombre, x.modelo, x.costoEstimado, x.busquedaWeb])).toEqual([
      ['chatgpt', 'ChatGPT', null, null, true], ['gemini', 'Gemini', null, null, true], ['claude', 'Claude', null, null, true], ['perplexity', 'Perplexity', null, null, true]]);
  });
  it('solo el admin los cambia, y un cambio de modelo queda en el historial', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const otro = await usuarioDePrueba();
    const [chatgpt] = await admin.datos.listarMotores();
    await expect(otro.datos.actualizarMotor(chatgpt!.id, { modelo: 'x' })).rejects.toMatchObject({ codigo: 'sin_permiso' });
    const antes = (await admin.datos.historialMotor(chatgpt!.id)).length;
    const conPrecio = await admin.datos.actualizarMotor(chatgpt!.id, { costoEstimado: 0.01 });
    expect(conPrecio.costoEstimado).toBe(0.01);
    expect(await admin.datos.historialMotor(chatgpt!.id)).toHaveLength(antes);
    const actualizado = await admin.datos.actualizarMotor(chatgpt!.id, { modelo: `modelo-${crypto.randomUUID().slice(0, 6)}` });
    const historial = await admin.datos.historialMotor(chatgpt!.id);
    expect(historial).toHaveLength(antes + 1);
    expect(historial[0]?.vigenteHasta).toBe(actualizado.vigenteDesde);
  });
});
