import type { FastifyInstance } from 'fastify';
import { pool, type AsistenteRow } from '../db.js';
import { protegerAdmin } from '../lib/proteger-admin.js';

/**
 * Consulta de una entrada por su código de QR (solo lectura, no marca entrada).
 * Protegido con sesión admin. La validación real de puerta (que marca la
 * entrada como usada) está en /api/staff/verificar.
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
      const codigo = request.body.token.trim();
      const { rows } = await pool.query<AsistenteRow>(
        'SELECT * FROM asistentes WHERE token_qr = $1',
        [codigo],
      );
      const row = rows[0];

      if (!row) {
        return reply.send({ valida: false, motivo: 'QR no válido o no reconocido.' });
      }
      if (row.estado_pago !== 'pagado') {
        return reply.send({ valida: false, motivo: 'Pago no confirmado.' });
      }

      return reply.send({
        valida: true,
        asistente: {
          nombre: row.nombre,
          apellidos: row.apellidos,
          disfrazado: row.disfrazado,
          disfraz: row.disfraz,
          haEntrado: row.ha_entrado,
        },
      });
    },
  );
}
