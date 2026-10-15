import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './estilos.css';
import Eventos from './paginas/Eventos.tsx';
import Landing from './paginas/Landing.tsx';
import Registro from './paginas/Registro.tsx';
import Admin from './paginas/Admin.tsx';
import Staff from './paginas/Staff.tsx';
import Invitados from './paginas/Invitados.tsx';
import Carrete from './paginas/Carrete.tsx';
import Galeria from './paginas/Galeria.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Eventos />} />
        <Route path="/halloween" element={<Landing />} />
        <Route path="/halloween/registro" element={<Registro />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/halloween/invitados" element={<Invitados />} />
        <Route path="/halloween/carrete/:token" element={<Carrete />} />
        <Route path="/halloween/galeria" element={<Galeria />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
