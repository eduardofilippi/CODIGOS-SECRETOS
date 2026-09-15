# syntax=docker/dockerfile:1

# ─── Build ──────────────────────────────────────────────────────────────────
# Node 20, igual que el CI (.github/workflows/deploy.yml).
FROM node:20-alpine AS build
WORKDIR /app

# Dependencias primero: esta capa se cachea mientras no cambie el lockfile.
COPY package.json package-lock.json ./
RUN npm ci

# Variables de Vite. OJO: se INLINEAN en tiempo de build, no son de runtime;
# cambiarlas obliga a reconstruir la imagen. Se sobreescriben al construir:
#   docker build \
#     --build-arg VITE_API_URL=https://mi-backend \
#     --build-arg VITE_RECAPTCHA_SITE_KEY=6L... .
# La site key es pública (viaja al navegador); acá sólo se fija el default.
ARG VITE_API_URL=https://promo.edge.com.py/purosol
ARG VITE_RECAPTCHA_SITE_KEY=6LfcYIQtAAAAAAqpWHzZ6y-cTCPOPEBXIu8XJWOD
ENV VITE_API_URL=$VITE_API_URL \
    VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY

# Código y build. `npm run build` = tsc -b && vite build → dist/.
# .dockerignore deja fuera .env para que manden estos ARG y no el .env local.
COPY . .
RUN npm run build

# ─── Runtime ────────────────────────────────────────────────────────────────
# Sitio 100% estático servido por nginx. Sólo entra el dist/, sin Node ni fuentes.
FROM nginx:1.27-alpine AS runtime

# Config propia: SPA (HashRouter), gzip y cache larga de los assets hasheados.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# nginx:alpine ya trae CMD ["nginx", "-g", "daemon off;"].
