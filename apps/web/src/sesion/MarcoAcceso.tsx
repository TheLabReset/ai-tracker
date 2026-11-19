import type { ReactNode } from 'react';
import { Logos } from './Logos';

export function MarcoAcceso({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-fondo p-e3 md:p-e4">
      <div className="mx-auto grid min-h-[calc(100vh-var(--e-8))] max-w-(--ancho-contenido) overflow-hidden rounded-card bg-capsula md:grid-cols-2">
        <section className="flex flex-col justify-between gap-e8 bg-mod p-e6 text-mod-tinta md:p-e12">
          <div className="flex items-center justify-between gap-e4">
            <span className="font-display text-(length:--t-26)">AI TRACKER</span>
            <span className="rounded-pildora bg-mod-tinta/10 px-e3 py-e1 text-(length:--t-12) font-bold tracking-(--espaciado-etiqueta)">
              THE LAB · RESET
            </span>
          </div>
          <div className="flex flex-col gap-e6">
            <h2 className="font-display text-(length:--t-72) leading-(--interlineado-display) md:text-(length:--t-112)">
              Cómo nos ven las IAs, semana a semana
            </h2>
            <p className="max-w-[32rem] text-(length:--t-16)">
              Mide si ChatGPT, Gemini, Claude y Perplexity recomiendan a tus marcas y a quién ponen primero.
            </p>
          </div>
          <Logos />
        </section>
        <section className="flex items-center justify-center p-e6 md:p-e12">
          <div className="flex w-full max-w-[26rem] flex-col gap-e4">{children}</div>
        </section>
      </div>
    </main>
  );
}

export const estiloCampo =
  'h-(--alto-accion) w-full rounded-pildora border border-linea bg-control px-e6 text-(length:--t-16) text-tinta placeholder:text-tinta-4';
export const estiloBoton =
  'h-(--alto-accion) w-full rounded-pildora bg-mod font-bold tracking-(--espaciado-accion) text-mod-tinta uppercase disabled:opacity-60';

export function EncabezadoFormulario({ etiqueta, titulo }: { etiqueta: string; titulo: string }) {
  return (
    <div className="flex flex-col gap-e2">
      <p className="text-(length:--t-12) tracking-(--espaciado-etiqueta) text-tinta-3">{etiqueta}</p>
      <h1 className="font-display text-(length:--t-40) leading-(--interlineado-titulo) uppercase">{titulo}</h1>
    </div>
  );
}
