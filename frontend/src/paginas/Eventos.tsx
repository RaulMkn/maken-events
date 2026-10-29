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
        <div
          className="evento-card evento-card--proximo"
          aria-disabled="true"
          role="link"
          tabIndex={-1}
        >
          <span className="evento-badge evento-badge--proximo">Registro cerrado</span>
          <div className="evento-titulo">Halloween 4.0</div>
          <div className="evento-meta">31 de octubre · Parla</div>
        </div>

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
