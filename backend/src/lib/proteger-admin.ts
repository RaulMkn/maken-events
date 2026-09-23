import type { FastifyReply, FastifyRequest } from 'fastify';
import { COOKIE_SESION, verificarTokenSesion } from './sesion.js';

/**
 * preHandler que exige una sesión admin válida.
 * Se usa en las rutas del panel admin.
 */
export async function protegerAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies?.[COOKIE_SESION];
  if (!token) {
    reply.status(401).send({ error: 'No autenticado.' });
    return;
  }

  const sesion = verificarTokenSesion(token);
  if (!sesion) {
    reply.clearCookie(COOKIE_SESION, { path: '/' });
    reply.status(401).send({ error: 'Sesión inválida o caducada.' });
    return;
  }

  // Adjuntamos el usuario a la request por si se necesita más adelante.
  (request as FastifyRequest & { adminUser?: string }).adminUser = sesion.sub;
}
