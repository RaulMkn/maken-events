import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { pool, type AsistenteRow } from '../db.js';
import { COOKIE_STAFF, crearTokenStaff } from '../lib/sesion.js';
import { protegerStaff } from '../lib/proteger-staff.js';

/**
 * Rutas para el equipo de puerta (staff):
 *  - POST /staff/login     -> login con contraseña compartida (sin MFA)
 *  - POST /staff/logout
 *  - GET  /staff/sesion    -> saber si la sesión sigue viva
 *  - POST /staff/verificar -> valida el QR y marca la entrada como usada
 */

interface LoginBody {
  password: string;
}

export async function staffRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['password'],
          additionalProperties: false,
          properties: { password: { type: 'string', minLength: 1, maxLength: 200 } },
        },
      },
      config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
    },
    async (request, reply) => {
      if (!config.staffPassword) {
        return reply.status(500).send({ error: 'El acceso de staff no está configurado.' });
      }
      if (request.body.password !== config.staffPassword) {
        request.log.warn('Intento de login staff fallido');
        return reply.status(401).send({ error: 'Contraseña incorrecta.' });
      }

      const token = crearTokenStaff();
      reply.setCookie(COOKIE_STAFF, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: request.protocol === 'https',
        path: '/',
        maxAge: 12 * 60 * 60,
      });
      return reply.send({ ok: true });
    },
  );

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_STAFF, { path: '/' });
    return reply.send({ ok: true });
  });

  app.get('/sesion', { preHandler: protegerStaff }, async () => ({ autenticado: true }));

  // ---- Verificación del QR en la puerta ----
  app.post<{ Body: { token: string } }>(
    '/verificar',
    {
      preHandler: protegerStaff,
      schema: {
        body: {
          type: 'object',
          required: ['token'],
          additionalProperties: false,
          properties: { token: { type: 'string', minLength: 1, maxLength: 1024 } },
        },
      },
    },
    async (request, reply) => {
      // El QR contiene un código corto que buscamos directamente en la BD.
      const codigo = request.body.token.trim();
      const { rows } = await pool.query<AsistenteRow>(
        'SELECT * FROM asistentes WHERE token_qr = $1',
        [codigo],
      );
      const row = rows[0];

      if (!row) {
        return reply.send({ resultado: 'invalida', motivo: 'QR no válido o no reconocido.' });
      }
      if (row.estado_pago !== 'pagado') {
        return reply.send({ resultado: 'invalida', motivo: 'El pago no está confirmado.' });
      }

      const nombre = `${row.nombre} ${row.apellidos}`.trim();

      // Si ya había entrado, se rechaza (QR de un solo uso).
      if (row.ha_entrado) {
        return reply.send({
          resultado: 'ya_entro',
          motivo: 'Esta entrada ya se usó.',
          nombre,
          entradoEn: row.entrado_en,
        });
      }

      // Marcamos la entrada como usada. El UPDATE condicional (ha_entrado = false)
      // evita una doble marca si dos escaneos llegan casi a la vez.
      const upd = await pool.query(
        `UPDATE asistentes SET ha_entrado = true, entrado_en = now()
         WHERE id = $1 AND ha_entrado = false`,
        [row.id],
      );

      if (upd.rowCount === 0) {
        // Otro escaneo se adelantó: tratar como ya entrada.
        return reply.send({ resultado: 'ya_entro', motivo: 'Esta entrada ya se usó.', nombre });
      }

      request.log.info({ asistenteId: row.id }, 'Entrada validada en puerta');
      return reply.send({
        resultado: 'valida',
        nombre,
        disfrazado: row.disfrazado,
        disfraz: row.disfraz,
        deParteDe: row.de_parte_de,
      });
    },
  );
}
