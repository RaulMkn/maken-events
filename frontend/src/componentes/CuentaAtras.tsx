import { useEffect, useState } from 'react';

export default function CuentaAtras({ objetivo }: { objetivo: Date }) {
  const [restante, setRestante] = useState(() => objetivo.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setRestante(objetivo.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [objetivo]);

  if (restante <= 0) {
    return (
      <div className="cuenta-atras cuenta-atras--viva">
        <span className="cuenta-atras-vivo">🎉 ¡La fiesta ya está en marcha!</span>
      </div>
    );
  }

  const segundos = Math.floor(restante / 1000);
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;

  const bloques: [number, string][] = [
    [dias, 'días'],
    [horas, 'horas'],
    [minutos, 'min'],
    [segs, 'seg'],
  ];

  return (
    <div className="cuenta-atras" role="timer" aria-label="Cuenta atrás para la fiesta">
      {bloques.map(([valor, etiqueta]) => (
        <div className="cuenta-bloque" key={etiqueta}>
          <span className="cuenta-numero">{String(valor).padStart(2, '0')}</span>
          <span className="cuenta-etiqueta">{etiqueta}</span>
        </div>
      ))}
    </div>
  );
}
