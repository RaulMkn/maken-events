import type { FastifyReply, FastifyRequest } from 'fastify';
import { COOKIE_SESION, verificarTokenSesion } from './sesion.js';

/** preHandler que exige una sesión admin válida. */
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

  (request as FastifyRequest & { adminUser?: string }).adminUser = sesion.sub;
}
