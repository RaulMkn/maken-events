import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { config } from './config.js';
import { initDb } from './db.js';
import { registroRoutes } from './routes/registro.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { entradaRoutes } from './routes/entrada.js';

const app = Fastify({
  logger: {
    level: config.isProd ? 'info' : 'debug',
    // No registramos cuerpos de peticiones para no volcar datos personales en logs.
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  },
  // Confiamos en el proxy de la plataforma (Heroku) para IP real y protocolo.
  trustProxy: true,
  bodyLimit: 64 * 1024, // 64 KB: los formularios son pequeños, cortamos payloads gigantes.
});

// Inicializamos el esquema de la base de datos antes de aceptar tráfico.
await initDb();

// ---- Seguridad base ----

// Cabeceras de seguridad. Como ahora Fastify sirve también el HTML del
// frontend, la CSP permite recursos propios + estilos inline e imágenes
// data/blob (SweetAlert2 usa estilos inline; el QR se muestra como data URL).
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: config.isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
});

await app.register(cookie, {
  secret: config.sessionSecret,
  parseOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    path: '/',
  },
});

// Rate limit global: primera línea de defensa contra abuso/DDoS de capa 7.
await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  ban: 3,
});

// ---- Salud ----
app.get('/api/health', async () => ({ ok: true }));

// ---- Rutas de la API ----
await app.register(registroRoutes, { prefix: '/api' });
await app.register(authRoutes, { prefix: '/api/admin' });
await app.register(adminRoutes, { prefix: '/api/admin' });
await app.register(entradaRoutes, { prefix: '/api' });

// ---- Frontend estático (SPA de React) ----
// El build del frontend se copia a backend/public durante el build de Heroku.
const aqui = dirname(fileURLToPath(import.meta.url));
const dirPublico = join(aqui, '..', 'public');

if (existsSync(dirPublico)) {
  await app.register(fastifyStatic, {
    root: dirPublico,
    prefix: '/',
  });

  // Fallback SPA: cualquier ruta no-API devuelve index.html para que
  // funcione el router del cliente (/registro, /admin...).
  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url && request.raw.url.startsWith('/api')) {
      return reply.status(404).send({ error: 'No encontrado.' });
    }
    return reply.sendFile('index.html');
  });
} else {
  app.log.warn(`No existe ${dirPublico}; el frontend no se servirá (¿falta el build?).`);
}

// ---- Arranque ----
try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`Servidor escuchando en el puerto ${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
