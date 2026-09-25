import 'dotenv/config';

/**
 * Lee y valida la configuración desde variables de entorno.
 * Falla rápido al arrancar si falta algo crítico en producción.
 */

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

/**
 * Decodifica el hash de la contraseña. Si viene con prefijo "b64:", lo
 * interpreta como base64 (así el .env no contiene los '$' del hash argon2
 * que docker-compose intentaría interpolar). Si no, se usa tal cual.
 */
function decodificarHash(valor: string): string {
  if (valor.startsWith('b64:')) {
    return Buffer.from(valor.slice(4), 'base64').toString('utf8');
  }
  return valor;
}

const isProd = (process.env.NODE_ENV ?? 'development') === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  publicHost: optional('PUBLIC_HOST', 'localhost'),

  // Conexión a PostgreSQL. En Heroku la inyecta el add-on como DATABASE_URL.
  databaseUrl: isProd
    ? required('DATABASE_URL')
    : optional('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/fiesta'),
  // SSL activado por defecto en producción (Heroku lo requiere).
  databaseSsl: (process.env.DATABASE_SSL ?? (isProd ? 'true' : 'false')) === 'true',

  sessionSecret: isProd
    ? required('SESSION_SECRET')
    : optional('SESSION_SECRET', 'dev-session-secret-no-usar-en-prod'),


  admin: {
    user: optional('ADMIN_USER', 'admin'),
    // El hash argon2 contiene '$', que docker-compose interpreta como
    // interpolación de variables en el .env. Para evitarlo, aceptamos el
    // hash codificado en base64 con prefijo "b64:" (formato que emite
    // gen-admin). También admitimos el hash en texto plano por comodidad
    // en desarrollo.
    passwordHash: decodificarHash(optional('ADMIN_PASSWORD_HASH')),
    totpSecret: optional('ADMIN_TOTP_SECRET'),
  },

  // Contraseña única y compartida para el equipo de puerta (staff).
  // Login simple, sin MFA: solo sirve para escanear QR en la puerta.
  staffPassword: optional('STAFF_PASSWORD'),

  // Email vía Resend con dominio propio verificado (evita spam por SPF/DKIM).
  email: {
    resendApiKey: optional('RESEND_API_KEY'),
    // Remitente. Debe ser una dirección del dominio verificado en Resend.
    from: optional('EMAIL_FROM', 'entradas@maken-events.app'),
  },

  partyName: optional('PARTY_NAME', 'Fiesta de Halloween'),
} as const;

export function assertAdminConfigured(): void {
  if (!config.admin.passwordHash || !config.admin.totpSecret) {
    throw new Error(
      'El admin no está configurado. Ejecuta "npm run gen-admin" y rellena ADMIN_PASSWORD_HASH y ADMIN_TOTP_SECRET en el .env',
    );
  }
}
