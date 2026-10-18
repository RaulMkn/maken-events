import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { pool, type AsistenteRow } from '../db.js';
import { COOKIE_STAFF, crearTokenStaff } from '../lib/sesion.js';
import { protegerStaff } from '../lib/proteger-staff.js';

/** Rutas del equipo de puerta (staff): login por contraseña compartida (sin MFA) y validación del QR. */

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

  // Devuelve solo id, nombre y de parte de quién: nada de email ni pago, por privacidad.
  app.get('/invitados', { preHandler: protegerStaff }, async () => {
    const { rows } = await pool.query<{
      id: string;
      nombre: string;
      apellidos: string | null;
      de_parte_de: string | null;
      validado_lista: boolean;
    }>(
      `SELECT id, nombre, apellidos, de_parte_de, validado_lista
       FROM asistentes ORDER BY de_parte_de NULLS LAST, nombre`,
    );

    const invitados = rows.map((r) => ({
      id: r.id,
      nombre: `${r.nombre} ${r.apellidos ?? ''}`.trim(),
      deParteDe: r.de_parte_de,
      validado: r.validado_lista,
    }));

    return { total: invitados.length, invitados };
  });

  // No guardamos quién valida, solo si está validado o no.
  app.post<{ Body: { id: string; validado: boolean } }>(
    '/invitados/validar',
    {
      preHandler: protegerStaff,
      schema: {
        body: {
          type: 'object',
          required: ['id', 'validado'],
          additionalProperties: false,
          properties: {
            id: { type: 'string', minLength: 1, maxLength: 40 },
            validado: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, validado } = request.body;
      const res = await pool.query(
        'UPDATE asistentes SET validado_lista = $1 WHERE id = $2',
        [validado, id],
      );
      if (res.rowCount === 0) {
        return reply.status(404).send({ error: 'Invitado no encontrado.' });
      }
      return reply.send({ ok: true, id, validado });
    },
  );

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

      // El QR es de un solo uso.
      if (row.ha_entrado) {
        return reply.send({
          resultado: 'ya_entro',
          motivo: 'Esta entrada ya se usó.',
          nombre,
          entradoEn: row.entrado_en,
        });
      }

      // UPDATE condicional (ha_entrado = false) para evitar doble marca si dos escaneos llegan a la vez.
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
