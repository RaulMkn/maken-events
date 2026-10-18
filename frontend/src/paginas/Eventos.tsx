import { Link } from 'react-router-dom';

export default function Eventos() {
  return (
    <div className="contenedor">
      <header className="aparece" style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Elige tu fiesta</h1>
        <p className="subtitulo" style={{ marginTop: 12, maxWidth: '48ch' }}>
          Estos son los eventos disponibles. Entra para ver los detalles y apuntarte.
        </p>
      </header>

      <div className="eventos-grid aparece" style={{ animationDelay: '0.08s' }}>
        <Link to="/halloween" className="evento-card evento-card--activo">
          <span className="evento-badge evento-badge--activo">Abierto</span>
          <div className="evento-titulo">Halloween 4.0</div>
          <div className="evento-meta">31 de octubre · Parla · Registro abierto</div>
          <span className="evento-flecha" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </Link>

        <div
          className="evento-card evento-card--proximo"
          aria-disabled="true"
          role="link"
          tabIndex={-1}
        >
          <span className="evento-badge evento-badge--proximo">Próximamente</span>
          <div className="evento-titulo">Carnaval 2.0</div>
          <div className="evento-meta">Próximamente</div>
        </div>
      </div>
    </div>
  );
}
