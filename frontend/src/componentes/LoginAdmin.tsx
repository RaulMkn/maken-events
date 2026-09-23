import { useState, type FormEvent } from 'react';
import { login, ApiError } from '../api.ts';

/**
 * Login del admin: usuario + contraseña + código TOTP (MFA en un solo paso).
 */
export default function LoginAdmin({ onLogin }: { onLogin: () => void }) {
  const [usuario, setUsuario] = useState('admin');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(usuario.trim(), password, totp.trim());
      onLogin();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo iniciar sesión. Revisa tu conexión.');
      }
      setEnviando(false);
    }
  }

  return (
    <div className="contenedor" style={{ maxWidth: 420 }}>
      <header className="centrado" style={{ margin: '32px 0 24px' }}>
        <span className="emoji-grande" role="img" aria-label="candado">
          🔐
        </span>
        <h1>Panel de administración</h1>
        <p className="subtitulo">Acceso restringido</p>
      </header>

      <form className="tarjeta" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="aviso aviso-error" role="alert">
            {error}
          </div>
        )}

        <div className="campo">
          <label htmlFor="usuario">Usuario</label>
          <input
            id="usuario"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="totp">Código de verificación (app autenticadora)</label>
          <input
            id="totp"
            type="tel"
            inputMode="numeric"
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
            placeholder="123456"
            maxLength={10}
            autoComplete="one-time-code"
            required
          />
        </div>

        <button type="submit" className="boton boton-bloque mt" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
