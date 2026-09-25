# maken-events — Web de eventos y entradas

Web para registro de asistentes y venta manual de entradas a eventos privados
(actualmente la fiesta de Halloween). En producción: **https://maken-events.app**

## Qué hace

- **Home de eventos**: selector de fiestas (Halloween activo; Carnaval "próximamente").
- **Landing del evento** con la info de la fiesta y botón de registro.
- **Registro** de asistentes: nombre, apellidos (opcional), email, de parte de quién,
  ¿disfrazado? + disfraz. Requiere aceptar las condiciones (con lectura obligatoria).
- **Panel admin** (`/admin`) protegido con contraseña + TOTP (MFA):
  - Listado de asistentes agrupado por "de parte de quién".
  - Confirmar pago (genera QR y envía la entrada por email), reenviar y eliminar.
  - Dashboard financiero: precio configurable, gastos, ingresos y beneficio.
- **Panel de staff** (`/staff`) protegido con contraseña simple (sin MFA):
  lector de QR por cámara que valida entradas y las marca como usadas (un solo uso).

## Stack

- **Backend**: Node + Fastify + TypeScript. Sirve también el frontend estático.
- **Base de datos**: PostgreSQL (cliente `pg`).
- **Frontend**: React + Vite + TypeScript.
- **Email**: SMTP (Gmail) con nodemailer; QR con `qrcode`.
- **Auth**: argon2 (contraseña admin) + TOTP (otplib); sesiones con JWT en cookie.
- **Despliegue**: Heroku (app `maken-events`) con add-on Heroku Postgres.

## Estructura

```
fest/
├── backend/         API Fastify + TS (sirve el frontend en producción)
│   ├── src/
│   │   ├── routes/  registro, auth, admin, staff, entrada
│   │   ├── lib/     auth, sesión, email, qr-token, validación
│   │   └── db.ts    esquema y acceso a Postgres
│   └── scripts/     gen-admin (credenciales), preview-email
├── frontend/        React + Vite (páginas: Eventos, Landing, Registro, Admin, Staff)
├── package.json     orquesta el build para Heroku (heroku-postbuild)
├── Procfile         arranque en Heroku
└── .env.example     plantilla de variables de entorno
```

## Desarrollo local

Requiere una base de datos PostgreSQL accesible (local o Docker).

```
# Backend
cd backend && npm install
DATABASE_URL=postgres://... npm run dev

# Frontend (en otra terminal)
cd frontend && npm install && npm run dev
```

Genera credenciales de admin con:

```
cd backend && npm run gen-admin -- "TuContraseña"
```

## Variables de entorno

Ver `.env.example`. En producción se configuran como *config vars* de Heroku,
no en un fichero `.env`. Las principales: `DATABASE_URL`, `SESSION_SECRET`,
`QR_TOKEN_SECRET`, `ADMIN_USER`/`ADMIN_PASSWORD_HASH`/`ADMIN_TOTP_SECRET`,
`STAFF_PASSWORD`, y el bloque SMTP (`SMTP_HOST`/`PORT`/`SECURE`/`USER`/`PASS`, `EMAIL_FROM`).

## Despliegue

```
git push heroku main
```

El build compila frontend y backend, y el frontend se sirve desde el propio backend.
El esquema de la base de datos se crea/migra solo al arrancar.
