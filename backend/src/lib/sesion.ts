import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Sesión del admin: un JWT corto firmado con SESSION_SECRET que viaja
 * en una cookie httpOnly + sameSite=strict + secure (en prod).
 * No guardamos estado de sesión en servidor: la cookie firmada basta.
 */

export const COOKIE_SESION = 'admin_sesion';
const DURACION = '8h';

interface SesionPayload {
  sub: string; // usuario admin
  role: 'admin';
}

export function crearTokenSesion(usuario: string): string {
  return jwt.sign({ sub: usuario, role: 'admin' } satisfies SesionPayload, config.sessionSecret, {
    algorithm: 'HS256',
    expiresIn: DURACION,
  });
}

export function verificarTokenSesion(token: string): SesionPayload | null {
  try {
    const payload = jwt.verify(token, config.sessionSecret, { algorithms: ['HS256'] }) as SesionPayload;
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}
