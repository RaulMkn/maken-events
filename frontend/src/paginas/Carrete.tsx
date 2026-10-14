import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  estadoCarrete,
  subirFotoCarrete,
  ApiError,
  type EstadoCarrete,
} from '../api.ts';
import { comprimirImagen } from '../utils/comprimirImagen.ts';

/**
 * Carrete de fotos del invitado. Acceso por token (sin login). Permite hacer
 * o elegir fotos hasta agotar el cupo; cada una se sube y se guarda.
 */
export default function Carrete() {
  const { token = '' } = useParams();
  const [estado, setEstado] = useState<EstadoCarrete | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  // Miniaturas de lo subido en esta sesión (object URLs locales).
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const e = await estadoCarrete(token);
      setEstado(e);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNoEncontrado(true);
      } else {
        setError('No se pudo cargar tu carrete. Revisa el enlace del email.');
      }
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Limpia las object URLs al desmontar para no filtrar memoria.
  useEffect(() => {
    return () => miniaturas.forEach((u) => URL.revokeObjectURL(u));
  }, [miniaturas]);

  async function onElegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    // Permite volver a elegir el mismo fichero después.
    e.target.value = '';
    if (!archivo || !estado) return;

    setError(null);
    setSubiendo(true);
    try {
      const comprimida = await comprimirImagen(archivo);
      const res = await subirFotoCarrete(token, comprimida);
      setEstado((prev) => (prev ? { ...prev, usadas: res.usadas } : prev));
      setMiniaturas((prev) => [URL.createObjectURL(comprimida), ...prev]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo subir la foto.');
    } finally {
      setSubiendo(false);
    }
  }

  if (cargando) {
    return (
      <div className="tema-halloween">
        <div className="contenedor centrado">
          <p className="subtitulo" style={{ marginTop: 48 }}>
            Cargando tu carrete…
          </p>
        </div>
      </div>
    );
  }

  if (noEncontrado) {
    return (
      <div className="tema-halloween">
        <div className="contenedor">
          <div className="tarjeta centrado aparece">
            <span role="img" aria-label="fantasma" style={{ fontSize: '3.5rem', display: 'block' }}>
              👻
            </span>
            <h1 className="titulo-fiesta" style={{ marginTop: 8, fontSize: 'clamp(1.6rem, 5vw, 2.2rem)' }}>
              Carrete no encontrado
            </h1>
            <p className="subtitulo mt">
              Este enlace no es válido. Abre el que te llegó en el email de tu entrada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const restantes = estado ? Math.max(estado.maximo - estado.usadas, 0) : 0;
  const agotado = restantes === 0;
  const bloqueado = !!estado && !estado.haEntrado;

  return (
    <div className="tema-halloween">
      <div className="contenedor" style={{ maxWidth: 560 }}>
        <header className="centrado aparece" style={{ margin: '36px 0 20px' }}>
          <span role="img" aria-label="cámara" style={{ fontSize: '3rem', display: 'block' }}>
            📸
          </span>
          <span className="eyebrow" style={{ display: 'block', marginTop: 12 }}>
            Carrete de la noche
          </span>
          <h1 className="titulo-fiesta" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)' }}>
            {estado?.nombre ? `Fotos de ${estado.nombre}` : 'Tu carrete'}
          </h1>
          <p className="subtitulo" style={{ marginTop: 8 }}>
            Captura los mejores momentos. Cada foto se guarda al instante.
          </p>
        </header>

        <div className="tarjeta aparece" style={{ animationDelay: '0.08s' }}>
          {error && (
            <div className="aviso aviso-error" role="alert">
              {error}
            </div>
          )}

          {bloqueado ? (
            <div className="centrado" style={{ padding: '18px 0 4px' }}>
              <span role="img" aria-label="candado" style={{ fontSize: '2.6rem', display: 'block' }}>
                🔒
              </span>
              <p className="mt" style={{ fontWeight: 600 }}>
                Tu carrete todavía no está activo
              </p>
              <p className="subtitulo" style={{ fontSize: '0.9rem', marginTop: 6 }}>
                Se desbloquea cuando entres a la fiesta y validemos tu QR en la puerta.
                Vuelve a abrir este enlace una vez dentro. 🎃
              </p>
            </div>
          ) : (
            <>
              {estado && !estado.almacenamientoListo && (
                <div className="aviso aviso-warn">
                  El carrete aún no está activo. Vuelve a intentarlo un poco más tarde.
                </div>
              )}

              <div className="carrete-contador">
                <span className="carrete-numero">{restantes}</span>
                <span className="carrete-de">
                  {restantes === 1 ? 'foto restante' : 'fotos restantes'} de {estado?.maximo}
                </span>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onElegirFoto}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                className="boton boton-bloque mt"
                onClick={() => inputRef.current?.click()}
                disabled={subiendo || agotado || !estado?.almacenamientoListo}
              >
                {subiendo ? 'Subiendo…' : agotado ? 'Carrete completo 🎉' : 'Hacer / elegir foto'}
              </button>

              {agotado && (
                <p className="subtitulo centrado mt" style={{ fontSize: '0.9rem' }}>
                  Has usado tus {estado?.maximo} fotos. ¡Gracias por inmortalizar la fiesta! 🖤
                </p>
              )}

              {miniaturas.length > 0 && (
                <div className="carrete-galeria">
                  {miniaturas.map((url, i) => (
                    <img key={url} src={url} alt={`Foto ${miniaturas.length - i}`} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
