const marcas = [
  { nombre: 'Reset', texto: 'RESET' },
  { nombre: 'Wanted', texto: 'WANTED' },
];

export function Logos() {
  return (
    <div className="flex items-center gap-e6">
      {marcas.map((m) => (
        <span key={m.nombre} aria-label={`Logo de ${m.nombre}`} role="img" className="font-display text-(length:--t-20) tracking-(--espaciado-display)">
          {m.texto}
        </span>
      ))}
    </div>
  );
}
