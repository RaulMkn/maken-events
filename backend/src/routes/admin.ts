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
import { enviarEmailEntrada, enviarEmailRechazo } from '../lib/email.js';
import { limpiarTexto } from '../lib/validacion.js';

/** Endpoints del panel admin. Todos protegidos con sesión admin válida. */

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
  app.addHook('preHandler', protegerAdmin);

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

  app.get('/asistentes.csv', async (_request, reply) => {
    const { rows } = await pool.query<AsistenteRow>(
      'SELECT * FROM asistentes ORDER BY de_parte_de NULLS LAST, creado_en',
    );

    const cabecera = [
      'Nombre',
      'Apellidos',
      'Email',
      'De parte de',
      'Disfrazado',
      'Disfraz',
      'Estado pago',
      'Precio pagado (EUR)',
      'Email enviado',
      'Ha entrado',
      'Creado en',
      'Pagado en',
    ];

    const lineas = rows.map((r) =>
      [
        r.nombre,
        r.apellidos ?? '',
        r.email,
        r.de_parte_de ?? '',
        r.disfrazado ? 'Sí' : 'No',
        r.disfraz ?? '',
        r.estado_pago,
        r.precio_pagado_centimos != null ? (r.precio_pagado_centimos / 100).toFixed(2) : '',
        r.email_enviado ? 'Sí' : 'No',
        r.ha_entrado ? 'Sí' : 'No',
        r.creado_en ?? '',
        r.pagado_en ?? '',
      ]
        .map(campoCsv)
        .join(','),
    );

    // BOM inicial para que Excel abra bien los acentos.
    const csv = '\uFEFF' + [cabecera.map(campoCsv).join(','), ...lineas].join('\r\n');

    const fecha = new Date().toISOString().slice(0, 10);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="asistentes-${fecha}.csv"`)
      .send(csv);
  });

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

      // Código corto para que el QR sea poco denso y se lea bien en pantalla.
      const tokenQr = nanoid(16);
      // Token del carrete largo (difícil de adivinar) porque va en el email sin login.
      const tokenCarrete = row.token_carrete ?? nanoid(21);
      const pagadoEn = new Date().toISOString();
      // Guardamos el precio vigente ahora: cada asistente vale lo que pagó aunque el precio cambie después.
      const precio = await precioEntradaCentimos();

      await pool.query(
        `UPDATE asistentes
         SET estado_pago = 'pagado', token_qr = $1, pagado_en = $2,
             precio_pagado_centimos = $3, token_carrete = $4
         WHERE id = $5`,
        [tokenQr, pagadoEn, precio, tokenCarrete, row.id],
      );

      // Si falla el envío, el pago queda confirmado igual (no revertimos) y se informa para reenviar luego.
      try {
        await enviarEmailEntrada({
          nombre: row.nombre,
          apellidos: row.apellidos ?? '',
          email: row.email,
          tokenQr,
          tokenCarrete,
        });
        await pool.query('UPDATE asistentes SET email_enviado = true WHERE id = $1', [row.id]);
        request.log.info({ asistenteId: row.id }, 'Pago confirmado y email enviado');
        return reply.send({ ok: true, emailEnviado: true });
      } catch (err) {
        // Solo el mensaje del error, no el objeto completo, que podría incluir la dirección del destinatario.
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
          tokenCarrete: row.token_carrete,
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

  // Rechaza a un asistente: le avisa por email de que no se pudo confirmar su
  // invitación y lo elimina. Si el email falla, no se borra, para poder reintentar.
  app.post<{ Params: { id: string } }>(
    '/asistentes/:id/rechazar',
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
      const { rows } = await pool.query<AsistenteRow>(
        'SELECT * FROM asistentes WHERE id = $1',
        [request.params.id],
      );
      const row = rows[0];
      if (!row) {
        return reply.status(404).send({ error: 'Asistente no encontrado.' });
      }

      try {
        await enviarEmailRechazo({ nombre: row.nombre, email: row.email });
      } catch (err) {
        request.log.error(
          { motivo: err instanceof Error ? err.message : 'desconocido', asistenteId: row.id },
          'Falló el email de rechazo; no se elimina al asistente',
        );
        return reply
          .status(502)
          .send({ error: 'No se pudo enviar el email de rechazo. No se ha eliminado a nadie; inténtalo de nuevo.' });
      }

      await pool.query('DELETE FROM asistentes WHERE id = $1', [row.id]);
      request.log.info({ asistenteId: row.id }, 'Asistente rechazado y eliminado');
      return reply.send({ ok: true });
    },
  );

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

  app.get('/finanzas', async () => {
    // Ingresos: suma de lo realmente pagado; un confirmado sin precio cuenta como 0.
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

/**
 * Escapa un valor para CSV: si contiene comas, comillas o saltos de línea,
 * lo envuelve en comillas dobles y duplica las comillas internas.
 */
function campoCsv(valor: string): string {
  if (/[",\r\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}
