import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { pool } from '../db.js';
import { limpiarTexto, normalizarEmail, emailValido } from '../lib/validacion.js';

/** Endpoint público de registro de asistentes. */

interface RegistroBody {
  nombre: string;
  apellidos?: string;
  email: string;
  disfrazado: boolean;
  disfraz?: string;
  deParteDe: string;
  aceptaCondiciones: boolean;
}

const registroSchema = {
  body: {
    type: 'object',
    required: ['nombre', 'email', 'disfrazado', 'deParteDe', 'aceptaCondiciones'],
    additionalProperties: false,
    properties: {
      nombre: { type: 'string', minLength: 1, maxLength: 80 },
      apellidos: { type: 'string', maxLength: 120 },
      email: { type: 'string', minLength: 3, maxLength: 254 },
      disfrazado: { type: 'boolean' },
      disfraz: { type: 'string', maxLength: 200 },
      // Obligatorio porque la fiesta es cerrada.
      deParteDe: { type: 'string', minLength: 1, maxLength: 120 },
      aceptaCondiciones: { type: 'boolean', const: true },
    },
  },
};

export async function registroRoutes(app: FastifyInstance): Promise<void> {
  // Rate limit estricto en el registro para evitar spam de altas.
  app.post<{ Body: RegistroBody }>(
    '/registro',
    {
      schema: registroSchema,
      config: {
        rateLimit: { max: 10, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const nombre = limpiarTexto(request.body.nombre);
      const apellidos = limpiarTexto(request.body.apellidos ?? '');
      const email = normalizarEmail(request.body.email);
      const disfrazado = request.body.disfrazado;
      // Si no indica de qué se disfraza (sorpresa), guardamos null.
      const disfrazTexto = disfrazado ? limpiarTexto(request.body.disfraz ?? '') : '';
      const disfraz = disfrazTexto.length > 0 ? disfrazTexto : null;
      const deParteDe = limpiarTexto(request.body.deParteDe);

      if (!emailValido(email)) {
        return reply.status(400).send({ error: 'El email no es válido.' });
      }

      if (deParteDe.length === 0) {
        return reply
          .status(400)
          .send({ error: 'Indica de parte de quién vienes.' });
      }

      // Redundante con el esquema (const: true), pero explícito por seguridad.
      if (request.body.aceptaCondiciones !== true) {
        return reply
          .status(400)
          .send({ error: 'Debes aceptar las condiciones para registrarte.' });
      }

      const existe = await pool.query('SELECT id FROM asistentes WHERE email = $1', [email]);
      if (existe.rowCount && existe.rowCount > 0) {
        return reply
          .status(409)
          .send({ error: 'Ya hay un registro con ese email.' });
      }

      const id = nanoid();
      const ahora = new Date().toISOString();

      await pool.query(
        `INSERT INTO asistentes
           (id, nombre, apellidos, email, disfrazado, disfraz, de_parte_de, creado_en, acepto_condiciones_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, nombre, apellidos, email, disfrazado, disfraz, deParteDe, ahora, ahora],
      );

      request.log.info({ asistenteId: id }, 'Nuevo registro');

      return reply.status(201).send({
        ok: true,
        mensaje:
          'Registro recibido. Te avisaremos por email cuando se confirme el pago con tu entrada.',
      });
    },
  );
}
