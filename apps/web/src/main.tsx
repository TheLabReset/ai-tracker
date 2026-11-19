import '@fontsource/bebas-neue/400.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import './estilos/base.css';
import { crearDatos, crearClienteTracker } from '@lab/datos';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app/App';
import { Proveedores } from './app/proveedores';
import { rutaBase, urlDeLaApp } from './app/rutaBase';

const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_CLAVE;
if (!url || !clave) {
  throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_CLAVE. Cópialas desde .env.example a .env.');
}

const base = import.meta.env.BASE_URL;
const datos = crearDatos(crearClienteTracker(url, clave, { persistirSesion: true }), {
  urlApp: urlDeLaApp(window.location.origin, base),
});

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <BrowserRouter basename={rutaBase(base)}>
      <Proveedores datos={datos}>
        <App />
      </Proveedores>
    </BrowserRouter>
  </StrictMode>,
);
