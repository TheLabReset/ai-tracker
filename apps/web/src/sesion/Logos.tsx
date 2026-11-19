import reset from './logos/reset.png';
import wanted from './logos/wanted.png';

const marcas = [
  { nombre: 'Reset', src: reset },
  { nombre: 'Wanted', src: wanted },
];

export function Logos() {
  return (
    <div className="flex items-center gap-e6">
      {marcas.map((m) => (
        <img key={m.nombre} src={m.src} alt={`Logo de ${m.nombre}`} className="h-12 w-auto" />
      ))}
    </div>
  );
}
