# ---- Etapa de build ----
# Node 26: node:sqlite ya es estable (sin flag --experimental-sqlite).
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Reinstalamos solo dependencias de producción para la imagen final.
RUN npm ci --omit=dev

# ---- Etapa final ----
FROM node:26-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copiamos solo lo necesario.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Creamos la carpeta de datos y corremos como usuario no-root.
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]
