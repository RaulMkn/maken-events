import { Link } from 'react-router-dom';
import CuentaAtras from '../componentes/CuentaAtras.tsx';
import { INICIO_FIESTA } from '../utils/fiesta.ts';
import {
  IconoCalendario,
  IconoUbicacion,
  IconoEntrada,
  IconoCopa,
} from '../componentes/Iconos.tsx';

export default function Landing() {
  return (
    <div className="tema-halloween">
    <div className="contenedor">
      <header className="centrado aparece" style={{ marginBottom: 40 }}>
        <Link to="/" className="volver-link">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Todos los eventos
        </Link>
        <h1 className="titulo-fiesta" style={{ marginTop: 22 }}>
          Noche de
          <br />
          Halloween
        </h1>
        <p className="subtitulo" style={{ marginTop: 14 }}>
          31 de octubre · Parla
        </p>
        <CuentaAtras objetivo={INICIO_FIESTA} />
      </header>

      <section className="tarjeta aparece" style={{ animationDelay: '0.08s' }}>
        <h2>Info</h2>
        <ul className="info-lista">
          <li>
            <span className="icono"><IconoCalendario /></span>
            <div>
              <div className="info-dato">Cuándo</div>
              <div>Sábado 31 de octubre · de 23:00 a 04:00</div>
            </div>
          </li>
          <li>
            <span className="icono"><IconoUbicacion /></span>
            <div>
              <div className="info-dato">Dónde</div>
              <div>Parla (Madrid) · La dirección exacta llega con la entrada.</div>
            </div>
          </li>
          <li>
            <span className="icono"><IconoEntrada /></span>
            <div>
              <div className="info-dato">Entrada</div>
              <div>7 € por persona</div>
            </div>
          </li>
          <li>
            <span className="icono"><IconoCopa /></span>
            <div>
              <div className="info-dato">Bebida</div>
              <div>Trae tu propio alcohol. En el local habrá hielo y vasos</div>
            </div>
          </li>
        </ul>
      </section>

      <section className="tarjeta aparece" style={{ marginTop: 20, animationDelay: '0.16s' }}>
        <h2>
          Concurso de disfraces <span className="acento-creepy">¡vístete!</span>
        </h2>
        <p className="subtitulo" style={{ fontSize: '1rem' }}>
          Un jurado elige a los tres mejores disfraces de la noche. En juego:
        </p>

        <ul className="botin">
          <li className="botin-item">
            <span className="botin-licor">Tequila de fresa</span>
          </li>
          <li className="botin-item">
            <span className="botin-licor">Licor 43</span>
          </li>
          <li className="botin-item">
            <span className="botin-licor">Baileys</span>
          </li>
        </ul>

        <div className="premios">
          <div className="premio">
            <span className="premio-puesto premio-puesto--1">1</span>
            <div>
              <strong>Primer puesto</strong> — elige la botella que quiera entre las tres.
            </div>
          </div>
          <div className="premio">
            <span className="premio-puesto premio-puesto--2">2</span>
            <div>
              <strong>Segundo puesto</strong> — se lleva una de las dos que queden.
            </div>
          </div>
          <div className="premio">
            <span className="premio-puesto premio-puesto--3">3</span>
            <div>
              <strong>Tercer puesto</strong> — se queda con la botella restante.
            </div>
          </div>
        </div>
      </section>

      <div className="centrado" style={{ marginTop: 36 }}>
        <Link to="/halloween/registro" className="boton">
          Apuntarme a la fiesta
        </Link>
        <p className="subtitulo" style={{ fontSize: '0.85rem', marginTop: 16 }}>
          Recibirás la entrada con un QR por email cuando confirmemos el pago.
          <br />
          Solo para mayores de 18.
        </p>
      </div>

      <footer className="landing-pie">
        <Link to="/staff" className="landing-pie-link">
          Acceso del equipo de puerta
        </Link>
      </footer>
    </div>
    </div>
  );
}
