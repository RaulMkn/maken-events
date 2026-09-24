import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Sesión del admin: un JWT corto firmado con SESSION_SECRET que viaja
 * en una cookie httpOnly + sameSite=strict + secure (en prod).
 * No guardamos estado de sesión en servidor: la cookie firmada basta.
 */

export const COOKIE_SESION = 'admin_sesion';
export const COOKIE_STAFF = 'staff_sesion';
const DURACION = '8h';
// La sesión de staff dura más: la puerta puede estar abierta toda la noche.
const DURACION_STAFF = '12h';

interface SesionPayload {
  sub: string; // usuario admin
  role: 'admin';
}

interface SesionStaffPayload {
  role: 'staff';
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

export function crearTokenStaff(): string {
  return jwt.sign({ role: 'staff' } satisfies SesionStaffPayload, config.sessionSecret, {
    algorithm: 'HS256',
    expiresIn: DURACION_STAFF,
  });
}

export function verificarTokenStaff(token: string): SesionStaffPayload | null {
  try {
    const payload = jwt.verify(token, config.sessionSecret, {
      algorithms: ['HS256'],
    }) as SesionStaffPayload;
    return payload.role === 'staff' ? payload : null;
  } catch {
    return null;
  }
}
