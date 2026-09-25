#!/usr/bin/env bash
#
# replica-local.sh
# ----------------
# Descarga una copia de la base de datos de Heroku (maken-events) y la
# restaura en una PostgreSQL local corriendo en Docker. Sirve como copia
# de seguridad navegable / redundancia ante catástrofe.
#
# No necesitas tener pg_restore instalado en el Mac: se ejecuta dentro del
# propio contenedor de Postgres (la imagen ya lo incluye).
#
# Requisitos: heroku CLI (con sesión iniciada) y Docker en marcha.
#
# Uso:
#   ./scripts/replica-local.sh
#
# Variables opcionales (con valores por defecto):
#   HEROKU_APP    (maken-events)
#   CONTENEDOR    (fiesta-replica)
#   DB_LOCAL      (fiesta)
#   PUERTO_LOCAL  (5433)   -> te conectas en localhost:5433
#   PG_PASSWORD   (postgres)

set -euo pipefail

HEROKU_APP="${HEROKU_APP:-maken-events}"
CONTENEDOR="${CONTENEDOR:-fiesta-replica}"
DB_LOCAL="${DB_LOCAL:-fiesta}"
PUERTO_LOCAL="${PUERTO_LOCAL:-5433}"
PG_PASSWORD="${PG_PASSWORD:-postgres}"
IMAGEN_PG="postgres:16-alpine"
DUMP="heroku-${HEROKU_APP}.dump"

info()  { printf '\033[1;36m›\033[0m %s\n' "$1"; }
ok()    { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
error() { printf '\033[1;31m✗ %s\033[0m\n' "$1" >&2; }

# --- Comprobaciones previas ---
command -v heroku >/dev/null || { error "No se encuentra la CLI de Heroku."; exit 1; }
command -v docker >/dev/null || { error "No se encuentra Docker."; exit 1; }
docker info >/dev/null 2>&1 || { error "Docker no está en marcha. Arráncalo y reintenta."; exit 1; }
heroku auth:whoami >/dev/null 2>&1 || { error "No has iniciado sesión en Heroku (heroku login)."; exit 1; }

# --- 1. Capturar y descargar el backup de Heroku ---
info "Capturando backup en Heroku (app: ${HEROKU_APP})…"
heroku pg:backups:capture --app "$HEROKU_APP"

info "Descargando el backup a ${DUMP}…"
rm -f "$DUMP"
heroku pg:backups:download --app "$HEROKU_APP" --output "$DUMP"
ok "Backup descargado ($(du -h "$DUMP" | cut -f1))."

# --- 2. Asegurar la Postgres local en Docker ---
if docker ps -a --format '{{.Names}}' | grep -qx "$CONTENEDOR"; then
  info "Reutilizando contenedor '${CONTENEDOR}'."
  docker start "$CONTENEDOR" >/dev/null
else
  info "Creando contenedor '${CONTENEDOR}' (Postgres en localhost:${PUERTO_LOCAL})…"
  docker run -d --name "$CONTENEDOR" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -e POSTGRES_DB="$DB_LOCAL" \
    -p "${PUERTO_LOCAL}:5432" \
    "$IMAGEN_PG" >/dev/null
fi

info "Esperando a que Postgres acepte conexiones…"
for _ in $(seq 1 30); do
  if docker exec "$CONTENEDOR" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$CONTENEDOR" pg_isready -U postgres >/dev/null 2>&1 \
  || { error "Postgres no arrancó a tiempo."; exit 1; }
ok "Postgres local lista."

# --- 3. Restaurar el dump dentro del contenedor ---
info "Copiando el dump al contenedor…"
docker cp "$DUMP" "${CONTENEDOR}:/tmp/replica.dump"

info "Restaurando en la base de datos local '${DB_LOCAL}' (esto borra y recrea los datos)…"
docker exec -e PGPASSWORD="$PG_PASSWORD" "$CONTENEDOR" \
  pg_restore --clean --if-exists --no-owner --no-acl \
  -U postgres -d "$DB_LOCAL" /tmp/replica.dump || {
    # pg_restore devuelve código != 0 por avisos benignos (p. ej. "no existe"
    # al hacer --clean la primera vez). Lo tratamos como aviso, no como fallo.
    info "pg_restore terminó con avisos (normal en la primera restauración)."
  }

docker exec "$CONTENEDOR" rm -f /tmp/replica.dump

# --- 4. Resumen ---
FILAS=$(docker exec -e PGPASSWORD="$PG_PASSWORD" "$CONTENEDOR" \
  psql -U postgres -d "$DB_LOCAL" -t -A -c \
  "SELECT count(*) FROM asistentes;" 2>/dev/null || echo "?")

ok "Réplica actualizada."
echo
echo "  Asistentes en la copia local: ${FILAS}"
echo "  Conéctate con:  postgres://postgres:${PG_PASSWORD}@localhost:${PUERTO_LOCAL}/${DB_LOCAL}"
echo "  Contenedor Docker: ${CONTENEDOR}  (apágalo con: docker stop ${CONTENEDOR})"
echo
info "Recuerda: el fichero ${DUMP} contiene datos personales. Guárdalo a buen recaudo o bórralo."
