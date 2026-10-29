import pg from 'pg';
import { config } from './config.js';

/**
 * Capa de datos sobre PostgreSQL. Siempre consultas parametrizadas ($1, $2...)
 * para eliminar la inyección SQL.
 */

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Heroku Postgres exige SSL con certificados que no validan contra CA públicas.
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
      entrado_en    TIMESTAMPTZ,
      token_carrete TEXT,
      fotos_carrete INTEGER NOT NULL DEFAULT 0
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
  await pool.query(`ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS de_parte_de TEXT;`);
  await pool.query(
    `ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS ha_entrado BOOLEAN NOT NULL DEFAULT false;`,
  );
  await pool.query(`ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS entrado_en TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS precio_pagado_centimos INTEGER;`);
  await pool.query(`ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS token_carrete TEXT;`);
  await pool.query(
    `ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS fotos_carrete INTEGER NOT NULL DEFAULT 0;`,
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_asistentes_token_carrete
     ON asistentes (token_carrete) WHERE token_carrete IS NOT NULL;`,
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_asistentes_token_qr
     ON asistentes (token_qr) WHERE token_qr IS NOT NULL;`,
  );
  await pool.query(`ALTER TABLE asistentes ALTER COLUMN apellidos DROP NOT NULL;`).catch(() => {});

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

/** ¿Admite el evento nuevos registros? Sin ajuste explícito, está cerrado. */
export async function registroAbierto(): Promise<boolean> {
  return (await leerAjuste('registro_abierto')) === 'true';
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
  token_carrete: string | null;
  fotos_carrete: number;
}
