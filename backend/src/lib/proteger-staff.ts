import type { FastifyReply, FastifyRequest } from 'fastify';
import { COOKIE_STAFF, verificarTokenStaff } from './sesion.js';

/**
 * preHandler que exige una sesión de staff válida (login por contraseña,
 * sin MFA). Se usa en las rutas de la puerta (escaneo de QR).
 */
export async function protegerStaff(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies?.[COOKIE_STAFF];
  if (!token) {
    reply.status(401).send({ error: 'No autenticado.' });
    return;
  }
  const sesion = verificarTokenStaff(token);
  if (!sesion) {
    reply.clearCookie(COOKIE_STAFF, { path: '/' });
    reply.status(401).send({ error: 'Sesión inválida o caducada.' });
    return;
  }
}
