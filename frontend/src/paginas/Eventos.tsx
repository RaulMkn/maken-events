import { Link } from 'react-router-dom';

/**
 * Home neutra: selector de eventos. De momento Halloween (activo) y
 * Carnaval (próximamente, no clicable). Tono sobrio, sin identidad de fiesta.
 */
export default function Eventos() {
  return (
    <div className="contenedor">
      <header className="centrado aparece" style={{ marginBottom: 8 }}>
        <span className="eyebrow">Eventos</span>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Elige tu fiesta</h1>
        <p className="subtitulo" style={{ marginTop: 12 }}>
          Estos son los eventos disponibles. Entra para ver los detalles y apuntarte.
        </p>
      </header>

      <div className="eventos-grid aparece" style={{ animationDelay: '0.08s' }}>
        <Link to="/halloween" className="evento-card evento-card--activo">
          <span className="evento-badge evento-badge--activo">Abierto</span>
          <span className="evento-emoji" role="img" aria-label="calabaza">
            🎃
          </span>
          <div className="evento-titulo">Noche de Halloween</div>
          <div className="evento-meta">31 de octubre · Parla · Registro abierto</div>
        </Link>

        <div
          className="evento-card evento-card--proximo"
          aria-disabled="true"
          role="link"
          tabIndex={-1}
        >
          <span className="evento-badge evento-badge--proximo">Próximamente</span>
          <span className="evento-emoji" role="img" aria-label="máscara">
            🎭
          </span>
          <div className="evento-titulo">Carnaval</div>
          <div className="evento-meta">Coming soon…</div>
        </div>
      </div>
    </div>
  );
}
