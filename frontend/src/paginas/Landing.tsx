import { Link } from 'react-router-dom';

/**
 * Página de inicio: información de la fiesta + botón de registro.
 * Los textos marcados son placeholders para que se rellenen luego.
 */
export default function Landing() {
  return (
    <div className="contenedor">
      <header className="centrado" style={{ marginBottom: 32 }}>
        <span className="emoji-grande" role="img" aria-label="calabaza">
          🎃
        </span>
        <h1 className="titulo-fiesta">Halloween 4.0</h1>
      </header>

      <section className="tarjeta">
        <h2>Info</h2>
        <ul className="info-lista">
          <li>
            <span className="icono" role="img" aria-label="calendario">
              📅
            </span>
            <span>
              <strong>Fecha:</strong> Viernes 31 de octubre, de 23:00 a 04:00 h
            </span>
          </li>
          <li>
            <span className="icono" role="img" aria-label="ubicación">
              📍
            </span>
            <span>
              <strong>Lugar:</strong> C. Toledo, 36, Local 5, 28981 Parla (Madrid)
            </span>
          </li>
          <li>
            <span className="icono" role="img" aria-label="entrada">
              🎟️
            </span>
            <span>
              <strong>Entrada:</strong> 7 € por persona
            </span>
          </li>
          <li>
            <span className="icono" role="img" aria-label="bebidas">
              🥤
            </span>
            <span>
              <strong>Bebida:</strong> cada uno trae su propia bebida salvo hielos y vasos.
            </span>
          </li>
          <li>
            <span className="icono" role="img" aria-label="disfraz">
              🎭
            </span>
            <span>
              <strong>Concurso de disfraces:</strong> con jurado, alfombra roja y 3 premios (más
              detalles abajo).
            </span>
          </li>
        </ul>


        <div className="mt centrado">
          <Link to="/registro" className="boton boton-bloque">
            Registrarme para la fiesta 🎫
          </Link>
        </div>
      </section>

      <section className="tarjeta mt">
        <h2>🎭 Concurso de disfraces</h2>
        <p className="subtitulo">
          Un <strong>jurado</strong> elegirá a los tres mejores disfraces de la noche. Los ganadores
          desfilarán con su disfraz por la <strong>alfombra roja</strong>.
        </p>

        <ul className="info-lista">
          <li>
            <span className="icono" role="img" aria-label="primer premio">
              🥇
            </span>
            <span>
              <strong>1.º clasificado:</strong> elige el premio que quiera entre los 3 disponibles.
            </span>
          </li>
          <li>
            <span className="icono" role="img" aria-label="segundo premio">
              🥈
            </span>
            <span>
              <strong>2.º clasificado:</strong> elige entre los 2 premios restantes.
            </span>
          </li>
          <li>
            <span className="icono" role="img" aria-label="tercer premio">
              🥉
            </span>
            <span>
              <strong>3.º clasificado:</strong> se queda con el premio que sobre.
            </span>
          </li>
        </ul>

        <p className="subtitulo mt" style={{ fontSize: '0.9rem' }}>
          {/* PLACEHOLDER: especificar cuáles son los 3 premios */}
          Los 3 premios se anunciarán próximamente.
        </p>
      </section>

      <p className="centrado subtitulo mt" style={{ fontSize: '0.85rem' }}>
        Tras registrarte, recibirás tu entrada con un QR por email cuando se confirme el pago.
      </p>
    </div>
  );
}
