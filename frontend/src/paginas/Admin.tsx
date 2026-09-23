import { useEffect, useState } from 'react';
import { comprobarSesion } from '../api.ts';
import LoginAdmin from '../componentes/LoginAdmin.tsx';
import PanelAdmin from '../componentes/PanelAdmin.tsx';

/**
 * Página admin: comprueba si hay sesión. Si no, muestra el login (MFA).
 * Si la hay, muestra el panel con la tabla de asistentes.
 */
export default function Admin() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    comprobarSesion()
      .then((r) => setAutenticado(r.autenticado))
      .catch(() => setAutenticado(false));
  }, []);

  if (autenticado === null) {
    return (
      <div className="contenedor centrado">
        <p className="subtitulo" style={{ marginTop: 48 }}>
          Cargando…
        </p>
      </div>
    );
  }

  if (!autenticado) {
    return <LoginAdmin onLogin={() => setAutenticado(true)} />;
  }

  return <PanelAdmin onLogout={() => setAutenticado(false)} />;
}
