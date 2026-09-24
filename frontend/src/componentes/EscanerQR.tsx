import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { verificarEntrada, logoutStaff, type ResultadoVerificacion } from '../api.ts';

/**
 * Lector de QR para la puerta. Usa la cámara del dispositivo (trasera si hay).
 * Al leer un QR llama al backend, muestra el resultado unos segundos y luego
 * reanuda el escaneo. Evita procesar el mismo QR repetidamente.
 */
export default function EscanerQR({ onLogout }: { onLogout: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const procesandoRef = useRef(false);
  const ultimoRef = useRef<string>('');

  const [resultado, setResultado] = useState<ResultadoVerificacion | null>(null);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);

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
        maxScansPerSecond: 5,
      },
    );
    scannerRef.current = scanner;

    scanner.start().catch(() => {
      setErrorCamara(
        'No se pudo acceder a la cámara. Da permiso de cámara al navegador y asegúrate de usar HTTPS.',
      );
    });

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDetectar(dato: string) {
    // Evita reentradas y re-escaneos del mismo código seguidos.
    if (procesandoRef.current) return;
    if (dato === ultimoRef.current) return;
    procesandoRef.current = true;
    ultimoRef.current = dato;

    try {
      const res = await verificarEntrada(dato);
      setResultado(res);
      // Vibración de feedback si el dispositivo lo soporta.
      if (navigator.vibrate) navigator.vibrate(res.resultado === 'valida' ? 120 : 300);
    } catch {
      setResultado({ resultado: 'invalida', motivo: 'Error de conexión al verificar.' });
    }

    // Tras mostrar el resultado, se limpia y se permite escanear de nuevo.
    window.setTimeout(() => {
      setResultado(null);
      ultimoRef.current = '';
      procesandoRef.current = false;
    }, 3500);
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
          <span className="eyebrow">Puerta</span>
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
              <span className="resultado-icono" role="img" aria-label="ok">
                ✅
              </span>
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
              <span className="resultado-icono" role="img" aria-label="atención">
                ⚠️
              </span>
              <div className="resultado-nombre">{resultado.nombre ?? 'Entrada usada'}</div>
              <p style={{ color: 'var(--amarillo)', fontWeight: 700, marginTop: 8 }}>
                Esta entrada YA se usó.
              </p>
            </>
          )}

          {resultado.resultado === 'invalida' && (
            <>
              <span className="resultado-icono" role="img" aria-label="no válida">
                ⛔
              </span>
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
