import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { registrar, ApiError } from '../api.ts';
import { condicionesHtml, condicionesHtmlScrollable } from '../condiciones.ts';

/**
 * Formulario de registro. Antes de enviar, se muestran las condiciones de
 * asistencia (SweetAlert2) que el usuario debe aceptar explícitamente.
 * El campo "de qué te disfrazas" solo aparece si marca la casilla (texto libre).
 */
export default function Registro() {
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [deParteDe, setDeParteDe] = useState('');
  const [disfrazado, setDisfrazado] = useState(false);
  const [disfraz, setDisfraz] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  function verCondiciones() {
    Swal.fire({
      title: 'Condiciones de asistencia',
      html: condicionesHtml(),
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#ff7a18',
      background: '#1b1330',
      color: '#f4eefb',
      width: 640,
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (deParteDe.trim().length === 0) {
      setError('Indica de parte de quién vienes.');
      return;
    }

    if (disfrazado && disfraz.trim().length === 0) {
      setError('Indica de qué vas a ir disfrazado/a.');
      return;
    }

    // Mostramos las condiciones y exigimos leerlas (scroll hasta el final)
    // antes de poder aceptar.
    const resultado = await Swal.fire({
      title: 'Condiciones de asistencia',
      html: condicionesHtmlScrollable(),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Acepto las condiciones',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ff7a18',
      cancelButtonColor: '#2a1245',
      background: '#1b1330',
      color: '#f4eefb',
      width: 640,
      focusCancel: true,
      didOpen: () => {
        const confirmBtn = Swal.getConfirmButton();
        const caja = document.getElementById('condiciones-scroll');
        const hint = document.getElementById('condiciones-hint');
        if (!confirmBtn || !caja) return;

        // El botón de aceptar arranca deshabilitado hasta leer el texto.
        confirmBtn.setAttribute('disabled', 'true');

        const marcarLeido = () => {
          confirmBtn.removeAttribute('disabled');
          if (hint) {
            hint.textContent = '¡Gracias por leerlas! Ya puedes aceptar.';
            hint.style.color = '#4ade80';
          }
        };

        const comprobarScroll = () => {
          // Margen de 4px para tolerar redondeos.
          const alFinal = caja.scrollTop + caja.clientHeight >= caja.scrollHeight - 4;
          if (alFinal) {
            marcarLeido();
            caja.removeEventListener('scroll', comprobarScroll);
          }
        };

        caja.addEventListener('scroll', comprobarScroll);
        // Si las condiciones son tan cortas que no hay scroll, se consideran leídas.
        if (caja.scrollHeight <= caja.clientHeight + 4) {
          marcarLeido();
        }
      },
    });

    if (!resultado.isConfirmed) {
      return; // no aceptó: no registramos
    }

    setEnviando(true);
    try {
      const res = await registrar({
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: email.trim(),
        disfrazado,
        disfraz: disfrazado ? disfraz.trim() : undefined,
        deParteDe: deParteDe.trim(),
        aceptaCondiciones: true,
      });
      setExito(res.mensaje);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo completar el registro. Revisa tu conexión.');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div className="tema-halloween">
      <div className="contenedor">
        <div className="tarjeta centrado aparece">
          <span role="img" aria-label="fantasma" style={{ fontSize: '3.5rem', display: 'block' }}>
            👻
          </span>
          <h1 className="titulo-fiesta" style={{ marginTop: 8, fontSize: 'clamp(1.8rem, 5vw, 2.6rem)' }}>
            ¡Ya estás dentro!
          </h1>
          <p className="aviso aviso-ok mt" style={{ textAlign: 'left' }}>
            {exito}
          </p>
          <Link to="/" className="boton boton-secundario mt">
            Volver al inicio
          </Link>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="tema-halloween">
    <div className="contenedor">
      <header style={{ marginBottom: 28 }} className="aparece">
        <Link to="/halloween" className="subtitulo" style={{ fontSize: '0.95rem' }}>
          ← Volver al evento
        </Link>
        <span className="eyebrow" style={{ display: 'block', marginTop: 18 }}>
          Reserva tu sitio
        </span>
        <h1 className="titulo-fiesta" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
          Registro
        </h1>
        <p className="subtitulo" style={{ marginTop: 10 }}>
          Rellena tus datos y guarda tu entrada para la noche.
        </p>
      </header>

      <form className="tarjeta aparece" onSubmit={onSubmit} noValidate style={{ animationDelay: '0.08s' }}>
        {error && (
          <div className="aviso aviso-error" role="alert">
            {error}
          </div>
        )}

        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={80}
            autoComplete="given-name"
          />
        </div>

        <div className="campo">
          <label htmlFor="apellidos">Apellidos</label>
          <input
            id="apellidos"
            type="text"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            required
            maxLength={120}
            autoComplete="family-name"
          />
        </div>

        <div className="campo">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
            autoComplete="email"
          />
        </div>

        <div className="campo">
          <label htmlFor="deParteDe">¿De parte de quién vienes?</label>
          <input
            id="deParteDe"
            type="text"
            value={deParteDe}
            onChange={(e) => setDeParteDe(e.target.value)}
            required
            maxLength={120}
            placeholder="Nombre de quien te invita"
          />
          <p className="subtitulo" style={{ fontSize: '0.8rem', marginTop: 6 }}>
            La fiesta es privada. Pon el nombre de la persona del grupo que te invita.
          </p>
        </div>

        <div className="campo check">
          <input
            id="disfrazado"
            type="checkbox"
            checked={disfrazado}
            onChange={(e) => {
              setDisfrazado(e.target.checked);
              if (!e.target.checked) setDisfraz('');
            }}
          />
          <label htmlFor="disfrazado">Voy a ir disfrazado/a</label>
        </div>

        {disfrazado && (
          <div className="campo">
            <label htmlFor="disfraz">¿De qué te disfrazas?</label>
            <input
              id="disfraz"
              type="text"
              value={disfraz}
              onChange={(e) => setDisfraz(e.target.value)}
              maxLength={200}
              placeholder="Ej. vampiro, bruja, esqueleto…"
            />
          </div>
        )}

        <p className="subtitulo" style={{ fontSize: '0.85rem', marginTop: 8 }}>
          Al registrarte deberás aceptar las{' '}
          <button
            type="button"
            onClick={verCondiciones}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--naranja-claro)',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
            }}
          >
            condiciones de asistencia
          </button>
          .
        </p>

        <button type="submit" className="boton boton-bloque mt" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar registro'}
        </button>
      </form>
    </div>
    </div>
  );
}
