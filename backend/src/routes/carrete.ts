import type { FastifyInstance } from 'fastify';
import { pool, type AsistenteRow } from '../db.js';
import { config, almacenamientoConfigurado } from '../config.js';
import { subirFoto } from '../lib/almacenamiento.js';

/**
 * Carrete de fotos de los invitados.
 *
 * No hay login: el acceso es por un token largo que llega en el email de la
 * entrada. Con ese token, la persona puede ver cuántas fotos le quedan y
 * subir hasta `config.maxFotosCarrete` fotos, que se guardan en Appwrite.
 *
 *  - GET  /carrete/:token        -> estado (nombre, usadas, máximo)
 *  - POST /carrete/:token/foto   -> sube una foto (multipart, campo "foto")
 */

const paramsSchema = {
  type: 'object',
  required: ['token'],
  properties: { token: { type: 'string', minLength: 8, maxLength: 40 } },
};

// Tipos de imagen que aceptamos. La compresión en cliente genera JPEG, pero
// admitimos los habituales por si acaso.
const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function carreteRoutes(app: FastifyInstance): Promise<void> {
  // ---- Estado del carrete ----
  app.get<{ Params: { token: string } }>(
    '/carrete/:token',
    { schema: { params: paramsSchema } },
    async (request, reply) => {
      const { rows } = await pool.query<AsistenteRow>(
        'SELECT * FROM asistentes WHERE token_carrete = $1',
        [request.params.token],
      );
      const row = rows[0];
      if (!row) {
        return reply.status(404).send({ error: 'Carrete no encontrado.' });
      }
      return reply.send({
        nombre: row.nombre,
        usadas: row.fotos_carrete,
        maximo: config.maxFotosCarrete,
        almacenamientoListo: almacenamientoConfigurado(),
        // El carrete solo se activa cuando la persona ya ha entrado a la
        // fiesta (su QR fue validado en la puerta).
        haEntrado: row.ha_entrado,
      });
    },
  );

  // ---- Subir una foto ----
  app.post<{ Params: { token: string } }>(
    '/carrete/:token/foto',
    {
      schema: { params: paramsSchema },
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      if (!almacenamientoConfigurado()) {
        return reply
          .status(503)
          .send({ error: 'El carrete no está disponible todavía. Inténtalo más tarde.' });
      }

      const { rows } = await pool.query<AsistenteRow>(
        'SELECT * FROM asistentes WHERE token_carrete = $1',
        [request.params.token],
      );
      const row = rows[0];
      if (!row) {
        return reply.status(404).send({ error: 'Carrete no encontrado.' });
      }

      // El carrete se desbloquea al entrar a la fiesta (QR validado en puerta).
      if (!row.ha_entrado) {
        return reply.status(403).send({
          error: 'Tu carrete se activa cuando entres a la fiesta y validemos tu QR en la puerta.',
        });
      }

      if (row.fotos_carrete >= config.maxFotosCarrete) {
        return reply
          .status(409)
          .send({ error: 'Ya has usado todas las fotos de tu carrete.' });
      }

      // Leemos el fichero del multipart (campo "foto").
      const parte = await request.file();
      if (!parte) {
        return reply.status(400).send({ error: 'No se ha enviado ninguna foto.' });
      }
      if (!TIPOS_PERMITIDOS.has(parte.mimetype)) {
        return reply.status(415).send({ error: 'Formato de imagen no admitido.' });
      }

      const buffer = await parte.toBuffer();

      // Reservamos el "hueco" de la foto de forma atómica ANTES de subir: así
      // dos subidas simultáneas no se saltan el límite. El UPDATE condicional
      // solo incrementa si aún queda cupo y devuelve el nuevo total.
      const reserva = await pool.query<{ fotos_carrete: number }>(
        `UPDATE asistentes SET fotos_carrete = fotos_carrete + 1
         WHERE id = $1 AND fotos_carrete < $2
         RETURNING fotos_carrete`,
        [row.id, config.maxFotosCarrete],
      );
      if (reserva.rowCount === 0) {
        return reply
          .status(409)
          .send({ error: 'Ya has usado todas las fotos de tu carrete.' });
      }
      const numeroFoto = reserva.rows[0].fotos_carrete;

      try {
        const nombre = `${sanear(row.nombre)}-${numeroFoto}.jpg`;
        await subirFoto(buffer, nombre);
      } catch (err) {
        // Si la subida falla, devolvemos el hueco reservado para que pueda
        // reintentar sin perder una foto.
        await pool.query(
          'UPDATE asistentes SET fotos_carrete = GREATEST(fotos_carrete - 1, 0) WHERE id = $1',
          [row.id],
        );
        request.log.error(
          { motivo: err instanceof Error ? err.message : 'desconocido', asistenteId: row.id },
          'Falló la subida de una foto del carrete',
        );
        return reply
          .status(502)
          .send({ error: 'No se pudo guardar la foto. Inténtalo de nuevo.' });
      }

      return reply.send({
        ok: true,
        usadas: numeroFoto,
        maximo: config.maxFotosCarrete,
      });
    },
  );
}

/** Normaliza un nombre para usarlo en el nombre de fichero. */
function sanear(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'invitado';
}
