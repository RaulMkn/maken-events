import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarGaleria, ApiError, type FotoGaleria } from '../api.ts';
import { IconoGaleria } from '../componentes/Iconos.tsx';

/** Galería compartida de la fiesta. El acceso es por un token que llega en el email. */
export default function Galeria() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [fotos, setFotos] = useState<FotoGaleria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!token) {
      setError(
        'A esta galería se entra con el enlace de tu email. Parece que falta el código de acceso: abre el botón "Ver la galería" del correo de tu entrada.',
      );
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const data = await listarGaleria(token);
      setFotos(data.fotos);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(
          'Este enlace de galería ha caducado o no es válido. Usa el botón "Ver la galería" del último correo de tu entrada, o pídele a la organización el enlace actualizado.',
        );
      } else if (err instanceof ApiError && err.status === 503) {
        setError(
          'La galería todavía no está activa. Se enciende cuando empiece la fiesta: vuelve a abrir este enlace un poco más tarde.',
        );
      } else {
        setError(
          'No hemos podido cargar las fotos ahora mismo. Revisa tu conexión e inténtalo de nuevo con el botón de abajo.',
        );
      }
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="tema-halloween">
      <div className="contenedor-ancho">
        <header className="centrado aparece" style={{ margin: '36px 0 20px' }}>
          <span className="icono-destacado"><IconoGaleria /></span>
          <h1 className="titulo-fiesta" style={{ marginTop: 10, fontSize: 'clamp(1.8rem, 5vw, 2.6rem)' }}>
            Galería de la fiesta
          </h1>
          <p className="subtitulo" style={{ marginTop: 8 }}>
            Todo lo que vais capturando entre todos, en un mismo sitio.
          </p>
        </header>

        {cargando ? (
          <p className="subtitulo centrado">Cargando fotos…</p>
        ) : error ? (
          <div className="tarjeta centrado aparece" style={{ maxWidth: 460, margin: '0 auto' }}>
            <p className="subtitulo" style={{ margin: 0 }}>
              {error}
            </p>
            <button className="boton boton-secundario mt" onClick={cargar}>
              Reintentar
            </button>
          </div>
        ) : fotos.length === 0 ? (
          <p className="subtitulo centrado">
            Todavía no hay fotos. Sé el primero en subir una desde tu carrete.
          </p>
        ) : (
          <>
            <div className="galeria-grid">
              {fotos.map((f) => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="galeria-item">
                  <img src={f.url} alt="Foto de la fiesta" loading="lazy" />
                </a>
              ))}
            </div>
            <div className="centrado" style={{ marginTop: 24 }}>
              <button className="boton boton-secundario boton-pequeno" onClick={cargar}>
                Actualizar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
