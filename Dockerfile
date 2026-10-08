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
#     --build-arg VITE_TURNSTILE_SITE_KEY=0x4AAA... .
# La sitekey es pública (viaja al navegador) pero NO tiene default: la real se
# pasa al construir.
# Un `docker build .` a secas FALLA a propósito: VITE_API_URL apunta por defecto
# al backend real y sin sitekey todo canje daría 403. Para una imagen con el
# adapter mock (sin backend): `--build-arg VITE_API_URL=`.
ARG VITE_API_URL=https://promo.edge.com.py/purosol
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

# Con backend real y sin sitekey, todo canje daría 403 (el backend V2 exige
# token): mejor fallar acá que publicar eso.
RUN if [ -n "$VITE_API_URL" ] && [ -z "$VITE_TURNSTILE_SITE_KEY" ]; then \
      echo "VITE_API_URL está cargada pero VITE_TURNSTILE_SITE_KEY no: pasala con --build-arg." >&2; \
      exit 1; \
    fi

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
