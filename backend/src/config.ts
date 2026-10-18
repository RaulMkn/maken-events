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

/** Decodifica el hash; acepta prefijo "b64:" para evitar los '$' del hash argon2 que algunos gestores de variables interpretan como interpolación. */
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
    // Aceptamos el hash en base64 (prefijo "b64:") por los '$' del hash argon2.
    passwordHash: decodificarHash(optional('ADMIN_PASSWORD_HASH')),
    totpSecret: optional('ADMIN_TOTP_SECRET'),
  },

  staffPassword: optional('STAFF_PASSWORD'),

  // Remitente verificado en Resend (SPF/DKIM para evitar spam).
  email: {
    resendApiKey: optional('RESEND_API_KEY'),
    from: optional('EMAIL_FROM', 'entradas@maken-events.app'),
  },

  partyName: optional('PARTY_NAME', 'Halloween 4.0'),

  // Sin barra final: se usa para construir enlaces absolutos en los emails.
  appUrl: optional('APP_URL', 'https://maken-events.app').replace(/\/+$/, ''),

  appwrite: {
    endpoint: optional('APPWRITE_ENDPOINT', 'https://cloud.appwrite.io/v1'),
    projectId: optional('APPWRITE_PROJECT_ID'),
    apiKey: optional('APPWRITE_API_KEY'),
    bucketId: optional('APPWRITE_BUCKET_ID'),
  },

  maxFotosCarrete: Number(process.env.MAX_FOTOS_CARRETE ?? 10),

  spotifyPlaylistUrl: optional('SPOTIFY_PLAYLIST_URL'),

  // El token va en el email; si está vacío, la galería se deshabilita para no exponer las fotos a cualquiera.
  galeriaToken: optional('GALERIA_TOKEN'),
} as const;

export function almacenamientoConfigurado(): boolean {
  return Boolean(
    config.appwrite.projectId && config.appwrite.apiKey && config.appwrite.bucketId,
  );
}

export function assertAdminConfigured(): void {
  if (!config.admin.passwordHash || !config.admin.totpSecret) {
    throw new Error(
      'El admin no está configurado. Ejecuta "npm run gen-admin" y rellena ADMIN_PASSWORD_HASH y ADMIN_TOTP_SECRET en el .env',
    );
  }
}
