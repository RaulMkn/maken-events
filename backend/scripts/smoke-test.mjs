/**
 * Prueba de humo del flujo crítico contra una instancia LOCAL en marcha.
 * No es un framework de tests: es un script rápido para validar a mano que
 * lo esencial funciona (registro -> login -> confirmar pago -> QR corto ->
 * verificar en puerta -> un solo uso -> CSV -> índice único).
 *
 * Requisitos: backend corriendo en localhost:3000 contra una Postgres local,
 * con las credenciales de prueba (ver README / variables de entorno abajo).
 *
 * Uso:
 *   node scripts/smoke-test.mjs
 *
 * Variables (con valores por defecto de desarrollo):
 *   BASE_URL          (http://localhost:3000)
 *   DATABASE_URL      (postgres://postgres:postgres@localhost:5432/fiesta)
 *   ADMIN_PASSWORD    (ContraseñaDePrueba123)
 *   ADMIN_TOTP_SECRET (KZFAIFBYIMCCU4AT)
 *   STAFF_PASSWORD    (puerta2026)
 */
import { authenticator } from 'otplib';
import pg from 'pg';

const B = process.env.BASE_URL ?? 'http://localhost:3000';
const DB = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/fiesta';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ContraseñaDePrueba123';
const TOTP_SECRET = process.env.ADMIN_TOTP_SECRET ?? 'KZFAIFBYIMCCU4AT';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'puerta2026';

const j = (r) => r.json();
let ok = 0;
let fail = 0;
const check = (nombre, cond) => {
  if (cond) {
    ok++;
    console.log('✓', nombre);
  } else {
    fail++;
    console.log('✗ FALLO:', nombre);
  }
};

const email = `smoke-${Date.now()}@example.com`;

let res = await fetch(`${B}/api/registro`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombre: 'Prueba',
    email,
    disfrazado: true,
    disfraz: 'bruja',
    deParteDe: 'Maken',
    aceptaCondiciones: true,
  }),
});
check('registro 201', res.status === 201);

const code = authenticator.generate(TOTP_SECRET);
res = await fetch(`${B}/api/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usuario: 'admin', password: ADMIN_PASSWORD, totp: code }),
});
const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
check('login admin 200', res.status === 200);

res = await fetch(`${B}/api/admin/asistentes`, { headers: { cookie } });
const asistente = (await j(res)).asistentes.find((a) => a.email === email);
check('asistente en el listado', Boolean(asistente));

res = await fetch(`${B}/api/admin/asistentes/${asistente.id}/confirmar-pago`, {
  method: 'POST',
  headers: { cookie },
});
check('confirmar pago ok', (await j(res)).ok === true);

const pool = new pg.Pool({ connectionString: DB });
const q = await pool.query('SELECT token_qr FROM asistentes WHERE id = $1', [asistente.id]);
const token = q.rows[0].token_qr;
check('token QR corto', token && token.length <= 24);

res = await fetch(`${B}/api/staff/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: STAFF_PASSWORD }),
});
const sc = (res.headers.get('set-cookie') ?? '').split(';')[0];

res = await fetch(`${B}/api/staff/verificar`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: sc },
  body: JSON.stringify({ token }),
});
check('verificar 1a vez = valida', (await j(res)).resultado === 'valida');

res = await fetch(`${B}/api/staff/verificar`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: sc },
  body: JSON.stringify({ token }),
});
check('verificar 2a vez = ya_entro', (await j(res)).resultado === 'ya_entro');

res = await fetch(`${B}/api/admin/asistentes.csv`, { headers: { cookie } });
const csv = await res.text();
check(
  'CSV correcto',
  (res.headers.get('content-type') ?? '').includes('text/csv') && csv.includes(email),
);

// Limpieza del asistente de prueba.
await pool.query('DELETE FROM asistentes WHERE email = $1', [email]);
await pool.end();

console.log(`\nRESULTADO: ${ok} OK, ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);
