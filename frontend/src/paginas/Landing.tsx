import { Link } from 'react-router-dom';

/**
 * Página de inicio: hero + información de la fiesta + concurso + registro.
 */
export default function Landing() {
  return (
    <div className="tema-halloween">
    <div className="contenedor">
      <header className="centrado aparece" style={{ marginBottom: 40 }}>
        <Link to="/" className="subtitulo" style={{ fontSize: '0.9rem', display: 'inline-block', marginBottom: 16 }}>
          ← Todos los eventos
        </Link>
        <br />
        <span className="eyebrow">31 de octubre · Parla</span>
        <h1 className="titulo-fiesta">
          Noche de
          <br />
          Halloween
        </h1>
        <p className="subtitulo" style={{ marginTop: 16, maxWidth: 520, marginInline: 'auto' }}>
          Disfraces, sustos y buena gente. Una noche para dejarse el miedo en la puerta… o traerlo
          puesto.
        </p>
      </header>

      <section className="tarjeta aparece" style={{ animationDelay: '0.08s' }}>
        <h2>Lo que necesitas saber</h2>
        <ul className="info-lista">
          <li>
            <span className="icono" role="img" aria-label="calendario">
              🗓️
            </span>
            <div>
              <div className="info-dato">Cuándo</div>
              <div>Viernes 31 de octubre · de 22:00 a 04:00</div>
            </div>
          </li>
          <li>
            <span className="icono" role="img" aria-label="ubicación">
              📍
            </span>
            <div>
              <div className="info-dato">Dónde</div>
              <div>Parla (Madrid) · La dirección exacta te llega con la entrada.</div>
            </div>
          </li>
          <li>
            <span className="icono" role="img" aria-label="entrada">
              🎟️
            </span>
            <div>
              <div className="info-dato">Entrada</div>
              <div>7 € por persona</div>
            </div>
          </li>
          <li>
            <span className="icono" role="img" aria-label="bebida">
              🍹
            </span>
            <div>
              <div className="info-dato">Bebida</div>
              <div>Trae tu propio alcohol. El hielo y los vasos los ponemos nosotros.</div>
            </div>
          </li>
        </ul>
      </section>

      <section className="tarjeta aparece" style={{ marginTop: 20, animationDelay: '0.16s' }}>
        <h2>
          Concurso de disfraces <span className="acento-creepy" style={{ color: 'var(--lima)' }}>¡vístete!</span>
        </h2>
        <p className="subtitulo" style={{ fontSize: '1rem' }}>
          Un jurado elige a los tres mejores disfraces de la noche. Los ganadores desfilan por la
          alfombra roja y eligen premio por orden:
        </p>
        <div className="premios">
          <div className="premio">
            <span className="premio-medalla" role="img" aria-label="primer puesto">
              🥇
            </span>
            <div>
              <strong>Primer puesto</strong> — elige el premio que quiera entre los tres.
            </div>
          </div>
          <div className="premio">
            <span className="premio-medalla" role="img" aria-label="segundo puesto">
              🥈
            </span>
            <div>
              <strong>Segundo puesto</strong> — se lleva uno de los dos que queden.
            </div>
          </div>
          <div className="premio">
            <span className="premio-medalla" role="img" aria-label="tercer puesto">
              🥉
            </span>
            <div>
              <strong>Tercer puesto</strong> — se queda con el premio restante.
            </div>
          </div>
        </div>
        <p className="subtitulo" style={{ fontSize: '0.9rem', marginTop: 16 }}>
          {/* PLACEHOLDER: especificar cuáles son los 3 premios */}
          Los premios se desvelan pronto. Ve pensando el disfraz.
        </p>
      </section>

      <div className="centrado" style={{ marginTop: 36 }}>
        <Link to="/halloween/registro" className="boton">
          Apuntarme a la fiesta
        </Link>
        <p className="subtitulo" style={{ fontSize: '0.85rem', marginTop: 16 }}>
          Recibirás tu entrada con un QR por email cuando confirmemos el pago.
          <br />
          Solo para mayores de 18.
        </p>
      </div>
    </div>
    </div>
  );
}
