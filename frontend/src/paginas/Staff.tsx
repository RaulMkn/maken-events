import { useEffect, useState } from 'react';
import { comprobarSesionStaff } from '../api.ts';
import LoginStaff from '../componentes/LoginStaff.tsx';
import EscanerQR from '../componentes/EscanerQR.tsx';

/**
 * Página de staff (puerta): login simple por contraseña (sin MFA) y,
 * una vez dentro, el lector de QR para validar entradas.
 */
export default function Staff() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    comprobarSesionStaff()
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
    return <LoginStaff onLogin={() => setAutenticado(true)} />;
  }

  return <EscanerQR onLogout={() => setAutenticado(false)} />;
}
