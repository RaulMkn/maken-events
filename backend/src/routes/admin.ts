import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import {
  pool,
  guardarAjuste,
  precioEntradaCentimos,
  type AsistenteRow,
  type GastoRow,
} from '../db.js';
import { protegerAdmin } from '../lib/proteger-admin.js';
import { enviarEmailEntrada } from '../lib/email.js';
import { limpiarTexto } from '../lib/validacion.js';

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
  precioPagadoCentimos: number | null;
}

function aDTO(row: AsistenteRow): AsistenteDTO {
  return {
    id: row.id,
    nombre: row.nombre,
    apellidos: row.apellidos ?? '',
    email: row.email,
    disfrazado: row.disfrazado,
    disfraz: row.disfraz,
    deParteDe: row.de_parte_de,
    estadoPago: row.estado_pago,
    emailEnviado: row.email_enviado,
    haEntrado: row.ha_entrado,
    creadoEn: row.creado_en,
    pagadoEn: row.pagado_en,
    precioPagadoCentimos: row.precio_pagado_centimos,
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

      // Código corto y aleatorio para el QR. Al ser corto, el QR es poco denso
      // y se lee bien desde la pantalla de un móvil. La validez se comprueba
      // buscando este código en la BD (no hace falta que sea un JWT).
      const tokenQr = nanoid(16);
      const pagadoEn = new Date().toISOString();
      // Guardamos el precio vigente en este momento: cada asistente "vale" lo
      // que pagó, aunque el precio del evento cambie después.
      const precio = await precioEntradaCentimos();

      await pool.query(
        `UPDATE asistentes
         SET estado_pago = 'pagado', token_qr = $1, pagado_en = $2, precio_pagado_centimos = $3
         WHERE id = $4`,
        [tokenQr, pagadoEn, precio, row.id],
      );

      // Enviamos el email con el QR. Si falla el envío, el pago queda confirmado
      // igual (no revertimos) pero informamos para poder reenviar luego.
      try {
        await enviarEmailEntrada({
          nombre: row.nombre,
          apellidos: row.apellidos ?? '',
          email: row.email,
          tokenQr,
        });
        await pool.query('UPDATE asistentes SET email_enviado = true WHERE id = $1', [row.id]);
        request.log.info({ asistenteId: row.id }, 'Pago confirmado y email enviado');
        return reply.send({ ok: true, emailEnviado: true });
      } catch (err) {
        // Registramos solo el mensaje del error, no el objeto completo, que
        // en errores de SMTP puede contener la dirección del destinatario.
        request.log.error(
          { motivo: err instanceof Error ? err.message : 'desconocido', asistenteId: row.id },
          'Pago confirmado pero falló el email',
        );
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
          apellidos: row.apellidos ?? '',
          email: row.email,
          tokenQr: row.token_qr,
        });
        await pool.query('UPDATE asistentes SET email_enviado = true WHERE id = $1', [row.id]);
        return reply.send({ ok: true, emailEnviado: true });
      } catch (err) {
        request.log.error(
          { motivo: err instanceof Error ? err.message : 'desconocido', asistenteId: row.id },
          'Falló el reenvío del email',
        );
        return reply
          .status(502)
          .send({ error: 'No se pudo enviar el email. Revisa la configuración del correo (SMTP).' });
      }
    },
  );

  // ---- Eliminar un asistente ----
  app.delete<{ Params: { id: string } }>(
    '/asistentes/:id',
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
      const res = await pool.query('DELETE FROM asistentes WHERE id = $1', [request.params.id]);
      if (res.rowCount === 0) {
        return reply.status(404).send({ error: 'Asistente no encontrado.' });
      }
      request.log.info({ asistenteId: request.params.id }, 'Asistente eliminado');
      return reply.send({ ok: true });
    },
  );

  // ---- Ajustes: precio de entrada ----
  app.get('/ajustes', async () => {
    const precioCentimos = await precioEntradaCentimos();
    return { precioEntradaCentimos: precioCentimos };
  });

  app.put<{ Body: { precioEntradaCentimos: number } }>(
    '/ajustes',
    {
      schema: {
        body: {
          type: 'object',
          required: ['precioEntradaCentimos'],
          additionalProperties: false,
          properties: {
            // Precio en céntimos: entero >= 0, tope razonable (1.000 €).
            precioEntradaCentimos: { type: 'integer', minimum: 0, maximum: 100000 },
          },
        },
      },
    },
    async (request, reply) => {
      await guardarAjuste('precio_entrada_centimos', String(request.body.precioEntradaCentimos));
      return reply.send({ ok: true, precioEntradaCentimos: request.body.precioEntradaCentimos });
    },
  );

  // ---- Gastos ----
  app.get('/gastos', async () => {
    const { rows } = await pool.query<GastoRow>(
      'SELECT * FROM gastos ORDER BY creado_en DESC',
    );
    return {
      gastos: rows.map((g) => ({
        id: g.id,
        concepto: g.concepto,
        importeCentimos: g.importe_centimos,
        creadoEn: g.creado_en,
      })),
    };
  });

  app.post<{ Body: { concepto: string; importeCentimos: number } }>(
    '/gastos',
    {
      schema: {
        body: {
          type: 'object',
          required: ['concepto', 'importeCentimos'],
          additionalProperties: false,
          properties: {
            concepto: { type: 'string', minLength: 1, maxLength: 120 },
            importeCentimos: { type: 'integer', minimum: 0, maximum: 100000000 },
          },
        },
      },
    },
    async (request, reply) => {
      const concepto = limpiarTexto(request.body.concepto);
      if (concepto.length === 0) {
        return reply.status(400).send({ error: 'El concepto no puede estar vacío.' });
      }
      const id = nanoid();
      await pool.query(
        'INSERT INTO gastos (id, concepto, importe_centimos) VALUES ($1, $2, $3)',
        [id, concepto, request.body.importeCentimos],
      );
      return reply.status(201).send({ ok: true, id });
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/gastos/:id',
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
      await pool.query('DELETE FROM gastos WHERE id = $1', [request.params.id]);
      return reply.send({ ok: true });
    },
  );

  // ---- Resumen financiero ----
  app.get('/finanzas', async () => {
    // Ingresos: suma de lo realmente pagado por los asistentes confirmados.
    // Si algún confirmado antiguo no tuviera precio guardado, cuenta como 0.
    const ingresosQ = await pool.query<{ total: string | null }>(
      `SELECT COALESCE(SUM(precio_pagado_centimos), 0) AS total
       FROM asistentes WHERE estado_pago = 'pagado'`,
    );
    const gastosQ = await pool.query<{ total: string | null }>(
      'SELECT COALESCE(SUM(importe_centimos), 0) AS total FROM gastos',
    );

    const ingresosCentimos = Number(ingresosQ.rows[0]?.total ?? 0);
    const gastosCentimos = Number(gastosQ.rows[0]?.total ?? 0);
    const precioActual = await precioEntradaCentimos();

    return {
      ingresosCentimos,
      gastosCentimos,
      beneficioCentimos: ingresosCentimos - gastosCentimos,
      precioEntradaCentimos: precioActual,
    };
  });
}
