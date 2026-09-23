# Fiesta de Halloween — Registro y entradas

MVP de web para registro de asistentes y venta manual de entradas a una fiesta de Halloween.

- **Landing pública** con info de la fiesta y botón de registro.
- **Registro** de asistentes (nombre, apellidos, email, ¿disfrazado?, disfraz).
- **Panel admin** protegido con contraseña + TOTP (MFA).
- **Confirmación de pago manual** → envío de email con QR de entrada.

## Estructura

```
fest/
├── backend/      API Fastify + TypeScript + SQLite
├── frontend/     React + Vite + TypeScript
├── Caddyfile     Reverse proxy con TLS, headers de seguridad y rate limiting
├── docker-compose.yml
└── .env.example
```

> La documentación detallada se añadirá más adelante.
# maken-events
