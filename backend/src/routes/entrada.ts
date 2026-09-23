import type { FastifyInstance } from 'fastify';
import { pool, type AsistenteRow } from '../db.js';
import { verificarTokenEntrada } from '../lib/qr-token.js';
import { protegerAdmin } from '../lib/proteger-admin.js';

/**
 * Verificación de una entrada en la puerta a partir del token del QR.
 * Protegido con sesión admin (quien esté en la puerta usa el panel).
 *
 * Comprueba que:
 *  - el token está firmado correctamente,
 *  - el asistente existe y tiene el pago confirmado,
 *  - el token coincide con el guardado (no revocado / reemitido).
 */
export async function entradaRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { token: string } }>(
    '/entrada/verificar',
    {
      preHandler: protegerAdmin,
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
      const payload = verificarTokenEntrada(request.body.token);
      if (!payload) {
        return reply.send({ valida: false, motivo: 'QR no válido o manipulado.' });
      }

      const { rows } = await pool.query<AsistenteRow>(
        'SELECT * FROM asistentes WHERE id = $1',
        [payload.sub],
      );
      const row = rows[0];

      if (!row) {
        return reply.send({ valida: false, motivo: 'La entrada no corresponde a nadie.' });
      }
      if (row.estado_pago !== 'pagado') {
        return reply.send({ valida: false, motivo: 'Pago no confirmado.' });
      }
      if (row.token_qr !== request.body.token) {
        return reply.send({ valida: false, motivo: 'Entrada caducada o reemitida.' });
      }

      return reply.send({
        valida: true,
        asistente: {
          nombre: row.nombre,
          apellidos: row.apellidos,
          disfrazado: row.disfrazado,
          disfraz: row.disfraz,
        },
      });
    },
  );
}
