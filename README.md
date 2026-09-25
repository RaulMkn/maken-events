# maken-events

Plataforma web para el registro de asistentes y la venta manual de entradas a
eventos privados. En producción: **https://maken-events.app**

> Versión 1.0 — **[Documentación completa (GitHub Pages)](https://raulmkn.github.io/maken-events/)**

---

## Qué es

`maken-events` es una web pensada para gestionar la entrada a fiestas privadas
de principio a fin, sin pasarela de pago (el pago se confirma a mano):

- **Home de eventos**: selector de fiestas. La primera es Halloween; Carnaval
  aparece como "próximamente".
- **Registro público**: la gente se apunta indicando de parte de quién viene
  (la fiesta es cerrada) y si va disfrazada. Debe aceptar las condiciones.
- **Panel de administración** (con contraseña + doble factor): lista de
  asistentes agrupada, confirmación de pago (que genera la entrada con QR y la
  envía por email), y un panel de finanzas (precio, gastos, beneficio).
- **Panel de staff** (con contraseña simple): lector de QR por cámara para
  validar entradas en la puerta. Cada QR sirve **una sola vez**.

## Funcionalidades

- Registro con validación y control de duplicados por email.
- Campo obligatorio "de parte de quién vienes" para mantener la fiesta cerrada.
- Aceptación de condiciones con lectura obligatoria (scroll) antes de aceptar.
- Confirmación de pago manual → genera un QR único y envía la entrada por email.
- Reenvío de entradas y eliminación de asistentes desde el panel.
- Escáner de QR en la puerta que marca la entrada como usada (un solo uso).
- Dashboard financiero: precio de entrada configurable, gastos, ingresos
  (por lo realmente pagado por cada asistente) y beneficio neto.
- Exportación de la lista de asistentes a CSV.

## Stack

| Capa        | Tecnología |
|-------------|------------|
| Backend     | Node 22, Fastify, TypeScript (sirve también el frontend) |
| Base de datos | PostgreSQL (cliente `pg`) |
| Frontend    | React 19, Vite, TypeScript, React Router |
| Email       | Resend (dominio propio verificado con SPF/DKIM) |
| QR          | `qrcode` (generación) y `qr-scanner` (lectura por cámara) |
| Seguridad   | argon2 (contraseña admin), TOTP (otplib), JWT en cookie |
| Despliegue  | Heroku (buildpack de Node) + Heroku Postgres |

## Estructura del repositorio

```
maken-events/
├── package.json          orquesta el build (heroku-postbuild) y el arranque
├── Procfile              proceso web para Heroku
├── .env.example          plantilla de variables de entorno
├── scripts/
│   └── replica-local.sh  descarga la BD de Heroku y la replica en Docker
├── backend/
│   ├── src/
│   │   ├── server.ts     arranque de Fastify, seguridad, rutas, estáticos
│   │   ├── config.ts     configuración desde variables de entorno
│   │   ├── db.ts         conexión, esquema y migraciones de PostgreSQL
│   │   ├── routes/       registro, auth, admin, staff, entrada
│   │   └── lib/          auth, sesión, protección de rutas, email, validación
│   └── scripts/          gen-admin, smoke-test, preview-email
└── frontend/
    ├── src/
    │   ├── main.tsx       router
    │   ├── api.ts         cliente HTTP
    │   ├── paginas/       Eventos, Landing, Registro, Admin, Staff
    │   └── componentes/   LoginAdmin, PanelAdmin, DashboardFinanzas, LoginStaff, EscanerQR
    ├── public/            favicon, imagen social
    └── index.html
```

## Requisitos

- Node.js 22.x
- Una base de datos PostgreSQL (local, en Docker, o Heroku Postgres)
- Cuenta de Resend con un dominio verificado (para enviar emails)

## Desarrollo local

```bash
# 1. Base de datos: por ejemplo, PostgreSQL en Docker
docker run -d --name fiesta-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fiesta -p 5432:5432 postgres:16-alpine

# 2. Backend
cd backend
npm install
npm run gen-admin -- "TuContraseñaDeAdmin"   # genera hash + TOTP (escanea el QR)
# copia ADMIN_PASSWORD_HASH y ADMIN_TOTP_SECRET a tu entorno
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fiesta npm run dev

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxya /api al backend)
```

## Variables de entorno

Ver `.env.example`. En producción se configuran como *config vars* de Heroku,
no en un fichero `.env`.

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV` | `production` en producción |
| `PORT` | Puerto del backend (Heroku lo inyecta) |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (obligatoria en producción) |
| `DATABASE_SSL` | `true` en Heroku |
| `SESSION_SECRET` | Secreto para firmar las cookies de sesión (obligatorio en producción) |
| `ADMIN_USER` | Usuario del admin (por defecto `admin`) |
| `ADMIN_PASSWORD_HASH` | Hash de la contraseña admin en formato `b64:...` (lo genera `gen-admin`) |
| `ADMIN_TOTP_SECRET` | Secreto TOTP del admin (lo genera `gen-admin`) |
| `STAFF_PASSWORD` | Contraseña compartida del equipo de puerta |
| `RESEND_API_KEY` | API key de Resend |
| `EMAIL_FROM` | Remitente (una dirección del dominio verificado) |
| `PARTY_NAME` | Nombre del evento para asuntos y plantillas |

## Scripts

**Raíz** (usados por Heroku):
- `heroku-postbuild` — compila frontend, lo copia al backend y compila el backend.
- `start` — arranca el servidor.

**backend/**:
- `npm run dev` — desarrollo con recarga.
- `npm run build` — compila TypeScript.
- `npm run gen-admin -- "contraseña"` — genera credenciales del admin (hash + TOTP + QR).
- `npm run smoke-test` — prueba de humo del flujo crítico contra una instancia local.

**frontend/**:
- `npm run dev` — servidor de desarrollo (Vite).
- `npm run build` — build de producción.

## Despliegue (Heroku)

```bash
git push heroku main
```

El esquema de la base de datos se crea y migra solo al arrancar (`initDb`).
Config vars necesarias: las de la tabla de arriba (mínimo `DATABASE_URL`,
`SESSION_SECRET`, credenciales de admin, `STAFF_PASSWORD`, `RESEND_API_KEY`).

## Operativa y respaldo

- **Backups de Heroku**: `heroku pg:backups:capture` y `heroku pg:backups:download`.
- **Exportar CSV**: botón en el panel admin (copia de la lista y respaldo).
- **Réplica local**: `./scripts/replica-local.sh` descarga la BD de producción
  y la restaura en una PostgreSQL en Docker (`localhost:5433`).

## Documentación

📖 **Sitio de documentación: https://raulmkn.github.io/maken-events/**

La documentación completa (arquitectura, referencia de la API, modelo de datos,
guías de administración y de puerta, despliegue y RGPD) está publicada en GitHub
Pages y su fuente vive en la carpeta [`docs/`](./docs).

| Sección | Enlace |
|---------|--------|
| Arquitectura | https://raulmkn.github.io/maken-events/arquitectura.html |
| Diagrama interactivo (Archify) | https://RaulMkn.github.io/maken-events/docs/arquitectura-diagrama.html |
| Panel de administración | https://raulmkn.github.io/maken-events/guia-admin.html |
| Puerta (staff) | https://raulmkn.github.io/maken-events/guia-staff.html |
| Referencia de la API | https://raulmkn.github.io/maken-events/api.html |
| Modelo de datos | https://raulmkn.github.io/maken-events/datos.html |
| Seguridad y RGPD | https://raulmkn.github.io/maken-events/seguridad.html |
| Despliegue | https://raulmkn.github.io/maken-events/despliegue.html |
| Mantenimiento | https://raulmkn.github.io/maken-events/mantenimiento.html |

> **Publicar el sitio** (una sola vez): en GitHub → Settings → Pages → Source:
> *Deploy from a branch* → rama `main`, carpeta `/docs`. Estará disponible en
> `https://raulmkn.github.io/maken-events/`.
