import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { pool, type AsistenteRow } from '../db.js';
import { protegerAdmin } from '../lib/proteger-admin.js';
import { firmarTokenEntrada } from '../lib/qr-token.js';
import { enviarEmailEntrada } from '../lib/email.js';

/**
 * Endpoints del panel admin. Todos protegidos con sesión admin válida.
 *  - GET  /asistentes                    -> listado
 *  - POST /asistentes/:id/confirmar-pago -> marca pagado, genera QR y envía email
 *  - POST /asistentes/:id/reenviar-email -> reenvía el email de una entrada ya confirmada
 */

interface AsistenteDTO {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  disfrazado: boolean;
  disfraz: string | null;
  deParteDe: string | null;
  estadoPago: 'pendiente' | 'pagado';
  emailEnviado: boolean;
  haEntrado: boolean;
  creadoEn: string;
  pagadoEn: string | null;
}

function aDTO(row: AsistenteRow): AsistenteDTO {
  return {
    id: row.id,
    nombre: row.nombre,
    apellidos: row.apellidos,
    email: row.email,
    disfrazado: row.disfrazado,
    disfraz: row.disfraz,
    deParteDe: row.de_parte_de,
    estadoPago: row.estado_pago,
    emailEnviado: row.email_enviado,
    haEntrado: row.ha_entrado,
    creadoEn: row.creado_en,
    pagadoEn: row.pagado_en,
  };
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Todas las rutas de este plugin exigen sesión admin.
  app.addHook('preHandler', protegerAdmin);

  // ---- Listado de asistentes ----
  app.get('/asistentes', async () => {
    const { rows } = await pool.query<AsistenteRow>(
      'SELECT * FROM asistentes ORDER BY creado_en DESC',
    );

    const asistentes = rows.map(aDTO);
    const resumen = {
      total: asistentes.length,
      pagados: asistentes.filter((a) => a.estadoPago === 'pagado').length,
      pendientes: asistentes.filter((a) => a.estadoPago === 'pendiente').length,
      disfrazados: asistentes.filter((a) => a.disfrazado).length,
      entrados: asistentes.filter((a) => a.haEntrado).length,
    };

    return { resumen, asistentes };
  });

  // ---- Confirmar pago: genera QR + envía email ----
  app.post<{ Params: { id: string } }>(
    '/asistentes/:id/confirmar-pago',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1, maxLength: 40 } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const { rows } = await pool.query<AsistenteRow>(
        'SELECT * FROM asistentes WHERE id = $1',
        [id],
      );
      const row = rows[0];

      if (!row) {
        return reply.status(404).send({ error: 'Asistente no encontrado.' });
      }

      if (row.estado_pago === 'pagado') {
        return reply
          .status(409)
          .send({ error: 'Este asistente ya tiene el pago confirmado.' });
      }

      // Generamos el token del QR (firmado) y lo persistimos.
      const jti = nanoid();
      const tokenQr = firmarTokenEntrada(row.id, jti);
      const pagadoEn = new Date().toISOString();

      await pool.query(
        `UPDATE asistentes
         SET estado_pago = 'pagado', token_qr = $1, pagado_en = $2
         WHERE id = $3`,
        [tokenQr, pagadoEn, row.id],
      );

      // Enviamos el email con el QR. Si falla el envío, el pago queda confirmado
      // igual (no revertimos) pero informamos para poder reenviar luego.
      try {
        await enviarEmailEntrada({
          nombre: row.nombre,
          apellidos: row.apellidos,
          email: row.email,
          tokenQr,
        });
        await pool.query('UPDATE asistentes SET email_enviado = true WHERE id = $1', [row.id]);
        request.log.info({ asistenteId: row.id }, 'Pago confirmado y email enviado');
        return reply.send({ ok: true, emailEnviado: true });
      } catch (err) {
        request.log.error({ err, asistenteId: row.id }, 'Pago confirmado pero falló el email');
        return reply.send({
          ok: true,
          emailEnviado: false,
          aviso:
            'El pago se ha marcado como confirmado, pero no se pudo enviar el email. Revisa la configuración del correo (SMTP) y reenvíalo.',
        });
      }
    },
  );

  // ---- Reenviar email de una entrada ya confirmada ----
  app.post<{ Params: { id: string } }>(
    '/asistentes/:id/reenviar-email',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1, maxLength: 40 } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { rows } = await pool.query<AsistenteRow>(
        'SELECT * FROM asistentes WHERE id = $1',
        [id],
      );
      const row = rows[0];

      if (!row) {
        return reply.status(404).send({ error: 'Asistente no encontrado.' });
      }
      if (row.estado_pago !== 'pagado' || !row.token_qr) {
        return reply
          .status(409)
          .send({ error: 'Este asistente no tiene el pago confirmado todavía.' });
      }

      try {
        await enviarEmailEntrada({
          nombre: row.nombre,
          apellidos: row.apellidos,
          email: row.email,
          tokenQr: row.token_qr,
        });
        await pool.query('UPDATE asistentes SET email_enviado = true WHERE id = $1', [row.id]);
        return reply.send({ ok: true, emailEnviado: true });
      } catch (err) {
        request.log.error({ err, asistenteId: row.id }, 'Falló el reenvío del email');
        return reply
          .status(502)
          .send({ error: 'No se pudo enviar el email. Revisa la configuración del correo (SMTP).' });
      }
    },
  );
}
