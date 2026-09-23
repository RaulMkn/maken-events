import type { FastifyInstance } from 'fastify';
import { assertAdminConfigured } from '../config.js';
import { usuarioValido, verificarPassword, verificarTotp } from '../lib/auth.js';
import { COOKIE_SESION, crearTokenSesion } from '../lib/sesion.js';
import { protegerAdmin } from '../lib/proteger-admin.js';

/**
 * Autenticación del admin: login con usuario + contraseña + código TOTP,
 * en un único paso (MFA obligatorio). Rate limit estricto contra fuerza bruta.
 */

interface LoginBody {
  usuario: string;
  password: string;
  totp: string;
}

const loginSchema = {
  body: {
    type: 'object',
    required: ['usuario', 'password', 'totp'],
    additionalProperties: false,
    properties: {
      usuario: { type: 'string', minLength: 1, maxLength: 80 },
      password: { type: 'string', minLength: 1, maxLength: 200 },
      totp: { type: 'string', minLength: 6, maxLength: 10 },
    },
  },
};

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: loginSchema,
      config: {
        // Muy restrictivo: protege contra fuerza bruta de credenciales/TOTP.
        rateLimit: { max: 5, timeWindow: '5 minutes' },
      },
    },
    async (request, reply) => {
      assertAdminConfigured();

      const { usuario, password, totp } = request.body;

      // Verificamos siempre las tres cosas antes de responder, y devolvemos
      // un error genérico: no revelamos si falló el usuario, la clave o el TOTP.
      const okUsuario = usuarioValido(usuario);
      const okPassword = await verificarPassword(password);
      const okTotp = verificarTotp(totp);

      if (!okUsuario || !okPassword || !okTotp) {
        request.log.warn({ usuario }, 'Intento de login admin fallido');
        return reply.status(401).send({ error: 'Credenciales incorrectas.' });
      }

      const token = crearTokenSesion(usuario);
      reply.setCookie(COOKIE_SESION, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: request.protocol === 'https',
        path: '/',
        maxAge: 8 * 60 * 60, // 8 horas en segundos
      });

      request.log.info({ usuario }, 'Login admin correcto');
      return reply.send({ ok: true });
    },
  );

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_SESION, { path: '/' });
    return reply.send({ ok: true });
  });

  // Permite al frontend saber si la sesión sigue viva.
  app.get('/sesion', { preHandler: protegerAdmin }, async (request) => {
    const usuario = (request as typeof request & { adminUser?: string }).adminUser;
    return { autenticado: true, usuario };
  });
}
