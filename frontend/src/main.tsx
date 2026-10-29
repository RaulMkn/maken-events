import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './estilos.css';
import Eventos from './paginas/Eventos.tsx';
import Admin from './paginas/Admin.tsx';
import Staff from './paginas/Staff.tsx';
import Carrete from './paginas/Carrete.tsx';
import Galeria from './paginas/Galeria.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Eventos />} />
        <Route path="/halloween" element={<Navigate to="/" replace />} />
        <Route path="/halloween/registro" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/halloween/carrete/:token" element={<Carrete />} />
        <Route path="/halloween/galeria" element={<Galeria />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
