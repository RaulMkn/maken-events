import { useState, type FormEvent } from 'react';
import { loginStaff, ApiError } from '../api.ts';

/**
 * Login del staff de puerta: solo una contraseña compartida (sin MFA).
 */
export default function LoginStaff({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await loginStaff(password);
      onLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.');
      setEnviando(false);
    }
  }

  return (
    <div className="contenedor" style={{ maxWidth: 400 }}>
      <header className="centrado aparece" style={{ margin: '48px 0 28px' }}>
        <span role="img" aria-label="linterna" style={{ fontSize: '3rem', display: 'block' }}>
          🔦
        </span>
        <span className="eyebrow" style={{ display: 'block', marginTop: 14 }}>
          Equipo de puerta
        </span>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}>Control de acceso</h1>
        <p className="subtitulo" style={{ marginTop: 8 }}>
          Introduce la contraseña del staff para escanear entradas.
        </p>
      </header>

      <form className="tarjeta aparece" onSubmit={onSubmit} noValidate style={{ animationDelay: '0.08s' }}>
        {error && (
          <div className="aviso aviso-error" role="alert">
            {error}
          </div>
        )}
        <div className="campo">
          <label htmlFor="staff-password">Contraseña del staff</label>
          <input
            id="staff-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="boton boton-bloque mt" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
