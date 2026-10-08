# Documentación — Códigos Secretos 2026

Todo lo que necesita el equipo de backend para conectar su capa al microsite.

| Documento | Qué contiene |
| --- | --- |
| **[GUIA-BACKEND.md](GUIA-BACKEND.md)** | **Empezá acá.** Qué se entregó, con qué stack, cómo está preparada la conexión y los seis endpoints con request y response de ejemplo. |
| [LOGICA-BACKEND.md](LOGICA-BACKEND.md) | Qué tiene que decidir el servidor: cómo se elige el premio, qué API usa cada pantalla, el flujo con Turnstile y lo que falta confirmar con el cliente. |
| [PREMIOS-2026.md](PREMIOS-2026.md) | Los 19 premios de la campaña con sus `id`, cantidades e imágenes. Los `id` son el contrato para devolver el premio ganado. |

## Las tres cosas que hay que entender antes de programar

1. **El frontend no decide nada.** Manda cédula y código, y muestra la pantalla
   del `status` que recibe: `WIN`, `LOSE`, `CODE_ALREADY_USED`,
   `CODE_NOT_FOUND` o `REGISTER_REQUIRED`.

2. **El premio no lo decide el código, lo decide el calendario.** Son 89
   unidades con fecha y hora; la gana el primer código válido que se cargue
   después de esa hora. Necesita bloqueo por concurrencia: sin eso se entregan
   dos premios donde había uno.

3. **Conectar es una línea.** En `src/services/promoApi.ts` se reemplaza el
   adapter de ejemplo por el que consuma la API real. Ninguna pantalla cambia.

## Probarlo antes de escribir código

El sitio funciona hoy de punta a punta contra datos de ejemplo:
**https://yenifmnm.github.io/CODIGOS-SECRETOS/**

Sirve para ver qué espera recibir cada pantalla. Los códigos de prueba están en
el [README del proyecto](../README.md#probar-los-estados-sin-backend).
