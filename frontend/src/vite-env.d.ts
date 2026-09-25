/// <reference types="vite/client" />

// Import del worker de qr-scanner con el sufijo ?url de Vite (devuelve la URL).
declare module 'qr-scanner/qr-scanner-worker.min.js?url' {
  const src: string;
  export default src;
}
