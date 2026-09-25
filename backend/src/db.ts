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
      acepto_condiciones_en TIMESTAMPTZ,
      de_parte_de   TEXT,
      ha_entrado    BOOLEAN NOT NULL DEFAULT false,
      entrado_en    TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_asistentes_email ON asistentes (email);
    CREATE INDEX IF NOT EXISTS idx_asistentes_token ON asistentes (token_qr);

    -- Ajustes clave/valor (p. ej. precio_entrada_centimos).
    CREATE TABLE IF NOT EXISTS ajustes (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    -- Gastos del evento (dashboard financiero). Importe en céntimos.
    CREATE TABLE IF NOT EXISTS gastos (
      id               TEXT PRIMARY KEY,
      concepto         TEXT NOT NULL,
      importe_centimos INTEGER NOT NULL,
      creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Migraciones idempotentes para bases de datos ya existentes (Heroku).
  // Postgres soporta IF NOT EXISTS en ADD COLUMN, así que es seguro repetirlo.
  await pool.query(`ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS de_parte_de TEXT;`);
  await pool.query(
    `ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS ha_entrado BOOLEAN NOT NULL DEFAULT false;`,
  );
  await pool.query(`ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS entrado_en TIMESTAMPTZ;`);
  // Precio realmente pagado por el asistente (en céntimos), fijado al confirmar.
  await pool.query(`ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS precio_pagado_centimos INTEGER;`);
  // Índice único parcial: garantiza que no haya dos entradas con el mismo
  // código de QR (permite varios NULL, para los aún no confirmados).
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_asistentes_token_qr
     ON asistentes (token_qr) WHERE token_qr IS NOT NULL;`,
  );
  // apellidos deja de ser obligatorio: quitamos el NOT NULL si existiera.
  await pool.query(`ALTER TABLE asistentes ALTER COLUMN apellidos DROP NOT NULL;`).catch(() => {});

  // Precio de entrada por defecto (7,00 €) si no hay ninguno fijado aún.
  await pool.query(
    `INSERT INTO ajustes (clave, valor) VALUES ('precio_entrada_centimos', '700')
     ON CONFLICT (clave) DO NOTHING;`,
  );
}

/** Lee un ajuste. Devuelve null si no existe. */
export async function leerAjuste(clave: string): Promise<string | null> {
  const { rows } = await pool.query<{ valor: string }>(
    'SELECT valor FROM ajustes WHERE clave = $1',
    [clave],
  );
  return rows[0]?.valor ?? null;
}

/** Escribe (o actualiza) un ajuste. */
export async function guardarAjuste(clave: string, valor: string): Promise<void> {
  await pool.query(
    `INSERT INTO ajustes (clave, valor) VALUES ($1, $2)
     ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
    [clave, valor],
  );
}

/** Precio de entrada actual en céntimos (por defecto 700 = 7 €). */
export async function precioEntradaCentimos(): Promise<number> {
  const v = await leerAjuste('precio_entrada_centimos');
  const n = v ? parseInt(v, 10) : 700;
  return Number.isFinite(n) && n >= 0 ? n : 700;
}

export interface GastoRow {
  id: string;
  concepto: string;
  importe_centimos: number;
  creado_en: string;
}

export interface AsistenteRow {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  disfrazado: boolean;
  disfraz: string | null;
  estado_pago: 'pendiente' | 'pagado';
  token_qr: string | null;
  email_enviado: boolean;
  creado_en: string;
  pagado_en: string | null;
  acepto_condiciones_en: string | null;
  de_parte_de: string | null;
  ha_entrado: boolean;
  entrado_en: string | null;
  precio_pagado_centimos: number | null;
}
