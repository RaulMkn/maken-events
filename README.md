# maken-events

Plataforma web para el registro de asistentes y la venta manual de entradas a
eventos privados. En producción: **https://maken-events.app**

> Versión 1.0 — **[Documentación completa (GitHub Pages)](https://raulmkn.github.io/maken-events/docs/)**

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
  validar entradas en la puerta. Cada QR sirve **una sola vez**. Incluye una
  **lista de invitados** (solo nombre y de parte de quién) para repasar y
  marcar como "de confianza" a cada persona.
- **Carrete de fotos por invitado**: al confirmar el pago, el email incluye un
  enlace personal a un carrete de 10 fotos. Se desbloquea cuando la persona
  entra a la fiesta (QR validado) y las fotos se guardan en Appwrite Storage.

## Funcionalidades

- Registro con validación y control de duplicados por email.
- Campo obligatorio "de parte de quién vienes" para mantener la fiesta cerrada.
- Aceptación de condiciones con lectura obligatoria (scroll) antes de aceptar.
- Confirmación de pago manual → genera un QR único y envía la entrada por email.
- Reenvío de entradas y eliminación de asistentes desde el panel.
- Escáner de QR en la puerta que marca la entrada como usada (un solo uso).
- Lista de invitados para la puerta con **agrupación inteligente** por quien
  invita: une variantes del mismo nombre (mayúsculas/minúsculas, un solo
  apellido, solo el nombre…) y permite marcar personas como validadas.
- **Carrete de fotos** personal (10 por invitado) con enlace en el email,
  desbloqueo tras validar el QR, compresión de imágenes en cliente y
  almacenamiento en Appwrite.
- El disfraz es opcional: se puede dejar en blanco para mantener la sorpresa.
- **Galería compartida** de la noche (acceso por token del email) y **cuenta
  atrás** en la landing. El email incluye además un **.ics** para añadir la
  fiesta al calendario y, si se configura, un enlace a la **playlist** de Spotify.
- Dashboard financiero: precio de entrada configurable, gastos, ingresos
  (por lo realmente pagado por cada asistente) y beneficio neto.
- Exportación de la lista de asistentes a CSV (incluye estado de validación).

## Stack

| Capa        | Tecnología |
|-------------|------------|
| Backend     | Node 22, Fastify, TypeScript (sirve también el frontend) |
| Base de datos | PostgreSQL (cliente `pg`) |
| Frontend    | React 19, Vite, TypeScript, React Router |
| Email       | Resend (dominio propio verificado con SPF/DKIM) |
| QR          | `qrcode` (generación) y `qr-scanner` (lectura por cámara) |
| Fotos       | Appwrite Storage (`node-appwrite`) + subida multipart (`@fastify/multipart`) |
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
│   │   ├── routes/       registro, auth, admin, staff, entrada, carrete
│   │   └── lib/          auth, sesión, protección de rutas, email, validación, almacenamiento
│   └── scripts/          gen-admin, smoke-test, preview-email, test-appwrite
└── frontend/
    ├── src/
    │   ├── main.tsx       router
    │   ├── api.ts         cliente HTTP
    │   ├── paginas/       Eventos, Landing, Registro, Admin, Staff, Invitados, Carrete, Galeria
    │   ├── componentes/   LoginAdmin, PanelAdmin, DashboardFinanzas, LoginStaff, EscanerQR, CuentaAtras
    │   └── utils/         agruparParte, comprimirImagen, fiesta (fecha)
    ├── public/            favicon, imagen social
    └── index.html
```

## Requisitos

- Node.js 22.x
- Una base de datos PostgreSQL (local, en Docker, o Heroku Postgres)
- Cuenta de Resend con un dominio verificado (para enviar emails)
- Proyecto de Appwrite con un bucket de Storage (para el carrete de fotos)

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

El registro, el pago y la entrada por QR funcionan sin configuración extra. El
**carrete** y la **galería** solo se activan si defines las variables de
Appwrite (`APPWRITE_*`) y `GALERIA_TOKEN`; si no, el resto de la app funciona
igual y esas funciones muestran un aviso de "no disponible".

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
| `APP_URL` | URL pública de la app (para enlaces absolutos en emails, p. ej. el carrete) |
| `APPWRITE_ENDPOINT` | Endpoint de Appwrite (por defecto `https://cloud.appwrite.io/v1`) |
| `APPWRITE_PROJECT_ID` | ID del proyecto de Appwrite |
| `APPWRITE_API_KEY` | API key de Appwrite con scope `files.write` (y `files.read` para la galería) |
| `APPWRITE_BUCKET_ID` | ID del bucket de Storage donde se guardan las fotos |
| `MAX_FOTOS_CARRETE` | Nº máximo de fotos por invitado (por defecto 10) |
| `SPOTIFY_PLAYLIST_URL` | Enlace a la playlist colaborativa (se incluye en el email, opcional) |
| `GALERIA_TOKEN` | Token de acceso a la galería compartida (va en el email; vacío = galería deshabilitada) |

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

📖 **Sitio de documentación: https://raulmkn.github.io/maken-events/docs/**

La documentación completa (arquitectura, referencia de la API, modelo de datos,
guías de administración y de puerta, despliegue y RGPD) está publicada en GitHub
Pages y su fuente vive en la carpeta [`docs/`](./docs).

| Sección | Enlace |
|---------|--------|
| Arquitectura | https://raulmkn.github.io/maken-events/docs/arquitectura.html |
| Diagrama interactivo (Archify) | https://RaulMkn.github.io/maken-events/docs/arquitectura-diagrama.html |
| Panel de administración | https://raulmkn.github.io/maken-events/docs/guia-admin.html |
| Puerta (staff) | https://raulmkn.github.io/maken-events/docs/guia-staff.html |
| Referencia de la API | https://raulmkn.github.io/maken-events/docs/api.html |
| Modelo de datos | https://raulmkn.github.io/maken-events/docs/datos.html |
| Seguridad y RGPD | https://raulmkn.github.io/maken-events/docs/seguridad.html |
| Despliegue | https://raulmkn.github.io/maken-events/docs/despliegue.html |
| Mantenimiento | https://raulmkn.github.io/maken-events/docs/mantenimiento.html |

> **Publicar el sitio**: en GitHub → Settings → Pages → Source: *Deploy from a
> branch* → rama `main`, carpeta `/ (root)`. La documentación queda bajo
> `https://raulmkn.github.io/maken-events/docs/`.
