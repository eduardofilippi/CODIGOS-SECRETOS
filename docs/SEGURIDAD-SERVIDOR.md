# Cabeceras de seguridad del micrositio

La política de `deploy/security-headers.conf` corresponde al servidor Nginx
que publica el frontend. No modifica React, TypeScript, CSS, imágenes ni la
composición visual.

Debe probarse primero en `https://promos.metis.com.py/` y después copiarse al
servidor del dominio definitivo. La configuración permite las conexiones del
frontend con `https://promo.edge.com.py`, reCAPTCHA Enterprise y los recursos
propios del sitio.

## Instalación en Nginx

Copiar el archivo al servidor:

```bash
sudo mkdir -p /etc/nginx/snippets
sudo cp deploy/security-headers.conf /etc/nginx/snippets/codigos-secretos-security.conf
```

Dentro del bloque HTTPS `server { ... }` del micrositio, agregar:

```nginx
server_tokens off;
include /etc/nginx/snippets/codigos-secretos-security.conf;
```

Si un bloque `location` contiene otro `add_header`, Nginx deja de heredar los
del bloque `server`. En ese caso hay que repetir el mismo `include` dentro de
ese `location`.

Validar y recargar sin interrumpir el servicio:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Validación en homologación

1. Abrir todas las pantallas en desktop, Android e iPhone.
2. Confirmar que cargan imágenes, fuentes y archivos JavaScript.
3. Ejecutar un único canje autorizado y comprobar reCAPTCHA y backend.
4. Revisar las cabeceras públicas:

```bash
curl -I https://promos.metis.com.py/
```

Deben aparecer CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` y `X-Frame-Options`.

HSTS no incluye `includeSubDomains` en esta etapa para no afectar otros
subdominios del cliente. Al pasar a producción deben confirmarse también el
dominio final en reCAPTCHA Enterprise y en la lista CORS del backend.
