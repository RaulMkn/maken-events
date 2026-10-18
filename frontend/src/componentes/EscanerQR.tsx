import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { verificarEntrada, logoutStaff, type ResultadoVerificacion } from '../api.ts';
import { IconoCheck, IconoAviso, IconoProhibido } from './Iconos.tsx';

/**
 * Lector de QR para la puerta (cámara trasera si hay). Al leer llama al
 * backend, muestra el resultado unos segundos y evita reprocesar el mismo QR.
 */
export default function EscanerQR({ onLogout }: { onLogout: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  // Evita procesar dos lecturas a la vez.
  const verificandoRef = useRef(false);
  // Último código mostrado, para no reprocesar el mismo QR en bucle.
  const ultimoRef = useRef<string>('');
  const timerRef = useRef<number | null>(null);

  const [resultado, setResultado] = useState<ResultadoVerificacion | null>(null);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);

  const DURACION_RESULTADO_MS = 10000;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      (res) => {
        void onDetectar(res.data);
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 10,
      },
    );
    scannerRef.current = scanner;

    scanner.start().catch(() => {
      setErrorCamara(
        'No se pudo acceder a la cámara. Da permiso de cámara al navegador y asegúrate de usar HTTPS.',
      );
    });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDetectar(dato: string) {
    // Ignora si ya hay una verificación en curso o si es el mismo QR en pantalla.
    if (verificandoRef.current) return;
    if (dato === ultimoRef.current) return;

    verificandoRef.current = true;
    ultimoRef.current = dato;

    // Un escaneo nuevo sustituye al anterior: cancelamos su timer.
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      const res = await verificarEntrada(dato);
      setResultado(res);
      if (navigator.vibrate) navigator.vibrate(res.resultado === 'valida' ? 120 : 300);
    } catch {
      // Fallo de red: no recordamos el código para poder reintentar el mismo QR enseguida.
      setResultado({
        resultado: 'invalida',
        motivo: 'Sin conexión con el servidor. Reintenta el escaneo.',
      });
      ultimoRef.current = '';
      if (navigator.vibrate) navigator.vibrate(300);
    } finally {
      verificandoRef.current = false;
    }

    timerRef.current = window.setTimeout(() => {
      setResultado(null);
      ultimoRef.current = '';
      timerRef.current = null;
    }, DURACION_RESULTADO_MS);
  }

  async function cerrarSesion() {
    scannerRef.current?.stop();
    await logoutStaff().catch(() => undefined);
    onLogout();
  }

  return (
    <div className="contenedor" style={{ maxWidth: 460 }}>
      <div className="cabecera">
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>Escanear entradas</h1>
        </div>
        <button className="boton boton-secundario boton-pequeno" onClick={cerrarSesion}>
          Salir
        </button>
      </div>

      {errorCamara ? (
        <div className="aviso aviso-error">{errorCamara}</div>
      ) : (
        <p className="subtitulo" style={{ fontSize: '0.9rem', marginBottom: 16 }}>
          Apunta con la cámara al QR de la entrada.
        </p>
      )}

      {/* El vídeo se mantiene montado siempre; el resultado se superpone debajo. */}
      <video ref={videoRef} className="escaner-video" />

      {resultado && (
        <div className={`resultado-scan resultado-scan--${resultado.resultado} mt`}>
          {resultado.resultado === 'valida' && (
            <>
              <span className="resultado-icono"><IconoCheck /></span>
              <div className="resultado-nombre">{resultado.nombre}</div>
              <p className="subtitulo" style={{ fontSize: '0.9rem', marginTop: 6 }}>
                {resultado.disfrazado ? `Disfraz: ${resultado.disfraz ?? 'sí'}` : 'Sin disfraz'}
                {resultado.deParteDe ? ` · De parte de ${resultado.deParteDe}` : ''}
              </p>
              <p style={{ color: 'var(--verde)', fontWeight: 700, marginTop: 8 }}>
                ¡Adelante, que pase!
              </p>
            </>
          )}

          {resultado.resultado === 'ya_entro' && (
            <>
              <span className="resultado-icono"><IconoAviso /></span>
              <div className="resultado-nombre">{resultado.nombre ?? 'Entrada usada'}</div>
              <p style={{ color: 'var(--amarillo)', fontWeight: 700, marginTop: 8 }}>
                Esta entrada YA se usó.
              </p>
            </>
          )}

          {resultado.resultado === 'invalida' && (
            <>
              <span className="resultado-icono"><IconoProhibido /></span>
              <div className="resultado-nombre">Entrada no válida</div>
              <p className="subtitulo" style={{ fontSize: '0.9rem', marginTop: 6 }}>
                {resultado.motivo}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
