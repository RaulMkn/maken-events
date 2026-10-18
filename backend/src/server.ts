import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { config } from './config.js';
import { initDb } from './db.js';
import { registroRoutes } from './routes/registro.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { entradaRoutes } from './routes/entrada.js';
import { staffRoutes } from './routes/staff.js';
import { carreteRoutes } from './routes/carrete.js';

const app = Fastify({
  logger: {
    level: config.isProd ? 'info' : 'debug',
    // No volcamos cuerpos de peticiones en logs por privacidad.
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  },
  // Confiamos en el proxy de Heroku para IP real y protocolo.
  trustProxy: true,
  bodyLimit: 64 * 1024,
});

await initDb();

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // El lector de QR usa un Web Worker que se carga como blob:.
      scriptSrc: ["'self'", 'blob:'],
      workerSrc: ["'self'", 'blob:'],
      childSrc: ["'self'", 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
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

await app.register(multipart, {
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 1,
  },
});

app.get('/api/health', async () => ({ ok: true }));

await app.register(registroRoutes, { prefix: '/api' });
await app.register(authRoutes, { prefix: '/api/admin' });
await app.register(adminRoutes, { prefix: '/api/admin' });
await app.register(entradaRoutes, { prefix: '/api' });
await app.register(staffRoutes, { prefix: '/api/staff' });
await app.register(carreteRoutes, { prefix: '/api' });

const aqui = dirname(fileURLToPath(import.meta.url));
const dirPublico = join(aqui, '..', 'public');

if (existsSync(dirPublico)) {
  await app.register(fastifyStatic, {
    root: dirPublico,
    prefix: '/',
  });

  // Fallback SPA: las rutas no-API devuelven index.html para el router del cliente.
  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url && request.raw.url.startsWith('/api')) {
      return reply.status(404).send({ error: 'No encontrado.' });
    }
    return reply.sendFile('index.html');
  });
} else {
  app.log.warn(`No existe ${dirPublico}; el frontend no se servirá (¿falta el build?).`);
}

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`Servidor escuchando en el puerto ${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
