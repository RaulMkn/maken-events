import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Los QR de entrada llevan un token firmado (JWT) con el id del asistente.
 * Al firmarlo con QR_TOKEN_SECRET, en la puerta podríamos verificar que el
 * QR es legítimo y no ha sido falsificado, sin necesidad de consultar nada
 * más que la firma (aunque también guardamos el token en BD para poder
 * revocarlo / marcar entradas ya usadas si hiciera falta).
 */

export interface QrPayload {
  sub: string; // id del asistente
  jti: string; // identificador único del token (para poder invalidar)
}

export function firmarTokenEntrada(asistenteId: string, jti: string): string {
  return jwt.sign({ sub: asistenteId, jti } satisfies QrPayload, config.qrTokenSecret, {
    algorithm: 'HS256',
    // La entrada no caduca por tiempo; su validez la controla el estado en BD.
  });
}

export function verificarTokenEntrada(token: string): QrPayload | null {
  try {
    return jwt.verify(token, config.qrTokenSecret, { algorithms: ['HS256'] }) as QrPayload;
  } catch {
    return null;
  }
}
