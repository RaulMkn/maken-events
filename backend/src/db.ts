import pg from 'pg';
import { config } from './config.js';

/**
 * Capa de datos sobre PostgreSQL (cliente `pg`).
 *
 * Usamos un Pool de conexiones y siempre consultas parametrizadas ($1, $2...),
 * de modo que las consultas van parametrizadas -> se elimina la inyección SQL.
 *
 * En Heroku la conexión viene en DATABASE_URL y requiere SSL.
 */

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Heroku Postgres exige SSL pero con certificados que no validan contra CA
  // públicas; en local (sin sslmode) lo desactivamos.
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
});

/** Crea el esquema si no existe. Se llama una vez al arrancar. */
export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS asistentes (
      id            TEXT PRIMARY KEY,
      nombre        TEXT NOT NULL,
      apellidos     TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      disfrazado    BOOLEAN NOT NULL DEFAULT false,
      disfraz       TEXT,
      estado_pago   TEXT NOT NULL DEFAULT 'pendiente',
      token_qr      TEXT,
      email_enviado BOOLEAN NOT NULL DEFAULT false,
      creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
      pagado_en     TIMESTAMPTZ,
      acepto_condiciones_en TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_asistentes_email ON asistentes (email);
    CREATE INDEX IF NOT EXISTS idx_asistentes_token ON asistentes (token_qr);
  `);
}

export interface AsistenteRow {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  disfrazado: boolean;
  disfraz: string | null;
  estado_pago: 'pendiente' | 'pagado';
  token_qr: string | null;
  email_enviado: boolean;
  creado_en: string;
  pagado_en: string | null;
  acepto_condiciones_en: string | null;
}
