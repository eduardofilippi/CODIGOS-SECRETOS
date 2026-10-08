# PuroSol — El Tesoro Galáctico de los Códigos Secretos 2026

> ## 👋 ¿Venís a programar el backend? Empezá acá
>
> Todo lo tuyo está en la carpeta **[`docs/`](docs/)**. Leelo en este orden;
> con los dos primeros ya podés arrancar.
>
> 1. **[docs/GUIA-BACKEND.md](docs/GUIA-BACKEND.md)** — la guía: qué hay hecho,
>    con qué stack, y los seis endpoints con request y response de ejemplo.
> 2. **[docs/LOGICA-BACKEND.md](docs/LOGICA-BACKEND.md)** — qué tiene que
>    decidir el servidor. Cómo se elige el premio (sale del **calendario**, no
>    del código), qué API usa cada pantalla, el flujo con Turnstile y los puntos
>    que faltan confirmar con el cliente.
> 3. **[docs/PREMIOS-2026.md](docs/PREMIOS-2026.md)** — los 19 premios con sus
>    `id`, que son el contrato para devolver el premio ganado.
>
> Lo mínimo que hay que saber: el frontend **no decide nada**. Manda cédula y
> código, y pinta la pantalla del `status` que le devuelven —`WIN`, `LOSE`,
> `CODE_ALREADY_USED`, `CODE_NOT_FOUND`, `REGISTER_REQUIRED`—. Hoy responde un
> adapter con datos de ejemplo; conectar el backend real es cargar
> `VITE_API_URL` (y `VITE_TURNSTILE_SITE_KEY`), sin tocar ninguna pantalla.
>
> El sitio de arriba ya funciona de punta a punta contra esos datos de ejemplo:
> sirve para ver qué se espera de cada respuesta antes de escribir nada.

## 🔗 Sitio publicado

### **https://yenifmnm.github.io/CODIGOS-SECRETOS/**

Ese es el link para compartir. Abre en cualquier navegador, sin instalar nada.
Se actualiza solo: cada push a `main` dispara el workflow
`.github/workflows/deploy.yml`, que compila y publica en GitHub Pages.

Funciona en desktop y en celular: cada pantalla tiene su propia composición
mobile tomada del Figma de 402 px, no es la vista de escritorio encogida.
Probalo achicando la ventana por debajo de 900 px o entrando desde el teléfono.

En desarrollo (`npm run dev`) aparece abajo a la derecha un selector de escenarios para forzar cada resultado
—ganaste, perdiste, código usado, código inexistente— sin depender del backend. En el sitio publicado esa esquina es de Turnstile: si Cloudflare pide confirmar que sos humano, el checkbox aparece ahí.

## 🚀 Despliegue con Turnstile

En este orden:

1. **Backend V2 publicado.** `POST /api/v2/codes/redeem` sin token tiene que
   responder `403 { "reason": "missing-token" }` (ver el README de
   `codigos-secretos-backend`, sección «Despliegue»).
2. **Widget en Cloudflare.** Turnstile → widget **Managed** con los hostnames
   `localhost`, `yenifmnm.github.io`, `promos.metis.com.py` y el dominio final.
   Si falta el hostname, Turnstile falla con el error **110200** y ningún canje
   pasa. La sitekey va acá; el secret, al backend (`TURNSTILE_SECRET_KEY`).
3. **Variable en GitHub, ANTES de mergear a `main`.** Settings → Secrets and
   variables → Actions → Variables → `VITE_TURNSTILE_SITE_KEY`. Si
   `VITE_API_URL` está cargada y la sitekey no, el workflow de Pages falla a
   propósito.
4. **CSP en Nginx** (homologación y dominio final): instalar
   `deploy/security-headers.conf` como indica
   [docs/SEGURIDAD-SERVIDOR.md](docs/SEGURIDAD-SERVIDOR.md). Sin
   `challenges.cloudflare.com` el widget no carga.
5. **CORS del backend** con el origen publicado (`CORS_ORIGIN`).
6. **Humo:** un canje real desde el sitio publicado. En la pestaña Red, el
   `POST /api/v2/codes/redeem` lleva `turnstileToken` y no vuelve `403`.
7. Avisar al backend para que retire la V1 y reCAPTCHA.

Para probar en local sin claves reales: sitekeys de prueba en `.env.example`.

## 🗺️ Recorrido del sitio

### **https://yenifmnm.github.io/CODIGOS-SECRETOS/recorrido.html**

Documento de apoyo para presentar y probar el microsite. Recorre una
participación completa con datos de ejemplo —una persona cargando cuatro
códigos distintos— y muestra, con capturas del sitio funcionando:

- el camino de punta a punta: carga de código, registro y resultado;
- las cuatro respuestas posibles a un código y qué pantalla abre cada una;
- cómo se comporta el contador de códigos cargados en cada caso;
- la lista de códigos de prueba que se pueden tipear en vivo;
- los caminos secundarios y los casos borde.

Sirve para tres cosas: mostrarle el flujo al cliente sin depender de una demo en
vivo, darle a QA una lista concreta de qué probar, y dejarle al equipo de backend
el mapa de estados que el sitio espera recibir.

### Cómo usar el demo

Hay dos maneras, según a quién se lo mandes:

**1. Por link.** Pasás la dirección de arriba y listo. No hace falta instalar
nada ni tener cuenta: se abre en el navegador, igual que el sitio.

**2. Como archivo suelto.** El demo vive en `public/recorrido.html` y es **un
único archivo autocontenido**, con las imágenes embebidas adentro. Eso significa
que se puede:

- descargarlo y abrirlo con doble click, sin servidor ni `npm install`;
- adjuntarlo por mail o mandarlo por chat;
- verlo sin conexión a internet.

Para bajarlo desde el repo: entrá a `public/recorrido.html`, botón **Download raw
file**. Pesa unos 650 kB.

Recorriendo el documento vas a encontrar la lista de códigos de prueba que se
pueden tipear en vivo en el sitio. Cada código dispara un resultado distinto, así
que sirve para comprobar las cuatro pantallas sin tocar nada de código.

---

## Qué es este repositorio

Microsite promocional. **Sólo frontend.** No hay backend, base de datos,
autenticación, validación real de códigos ni reglas de premio acá dentro.

## Correrlo localmente

```bash
npm install        # obligatorio antes del primer dev/build
npm run dev        # http://localhost:5180
npm run build      # genera dist/
npm run typecheck
```

El puerto 5180 está fijado en `vite.config.ts` con `strictPort`.

---

## Stack

React 18 · Vite · TypeScript · React Router (HashRouter) · Framer Motion · CSS
plano con custom properties.

Sin Tailwind, sin Bootstrap, sin Material UI.

Framer Motion se usa donde aporta (secuencia del ganador, carrusel). El resto del
movimiento es CSS `transform`/`opacity`, y el catalejo usa `requestAnimationFrame`
porque sigue al puntero.

## Fuentes del diseño

| Fuente | Qué aporta |
| --- | --- |
| Figma `BYiPd3K1fF5IbvSOhOQA9B` → `13:48 vistas web` | Composición, posiciones, proporciones, tipografía, color, assets |
| `Mecánica de participación PuroSol 2026.pptx` | Lógica de participación y estados |
| `_Codigos Secretos 2026 - Web - Cliente.pptx` | Animaciones, microinteracciones, storytelling |
| `recursos/premios/Calendario de Premios 2026.xlsx` | Catálogo de premios: 19 tipos, 89 unidades. Ver [`docs/PREMIOS-2026.md`](docs/PREMIOS-2026.md) |

Cuando el Figma y el PowerPoint discrepan, manda el Figma. La navegación
implementada es la del Figma actual (píldora cian plegable), no el menú lateral
amarillo del PowerPoint.

Cada pantalla lleva en su cabecera el nodo de Figma del que sale. Ningún fondo es
un screenshot: todos los elementos son capas independientes para poder animarlos.

Para trabajar contra el diseño hay dos scripts: `npm run figma:pull` baja de
Figma la medida exacta de cada capa a `figma/spec/`, y `npm run figma:check`
compara lo que renderiza el navegador contra esa medida, capa por capa. El
detalle está en [`docs/FIGMA-WORKFLOW.md`](docs/FIGMA-WORKFLOW.md).

## Tipografía

El sitio usa la fuente real **DK Prince Frog** en peso Regular (400). El archivo
versionado vive en `src/assets/fonts/DK-Prince-Frog.otf` y la única declaración
`@font-face` está en `src/styles/global.css`. No depende de Google Fonts, CDN ni
otro recurso externo.

---

## Sistema de escala

El Figma está sobre un lienzo de 1920×1080. En vez de escalar la página con
`transform: scale()`:

- `.stage__inner` es un **container query** que mantiene 16:9 y entra completo en
  el viewport;
- `.stage__bg` cubre la ventana, así el fondo llega siempre a los bordes;
- `src/app/stage.ts` convierte coordenadas de diseño a `cqw` (`1cqw` = 19,2 px de
  diseño);
- cada elemento usa `box({x, y, w, h})` con los números exactos del Figma.

Así la composición de escritorio escala proporcional y sin deformarse entre 1024
y 1920+.

**Por debajo de 900 px** (`useIsMobile`) cada pantalla renderiza una composición
vertical propia — no es la vista de escritorio encogida. Prioridad: branding →
mensaje → acción principal → contenido → decoración.

---

## Pantallas

| Ruta | Figma | Notas |
| --- | --- | --- |
| `/` | `13:49` INICIO | Nave que entra, cofre interactivo, cúmulo de premios |
| `/participar` | `70:396` BIENVENIDOS | Cédula + código secreto |
| `/registro` | `17:2912` REGISTRO | Seis campos, validación de formato en frontend |
| `/premios` | `57:86` PREMIOS | Carrusel de 5 ranuras |
| `/donde-esta-el-codigo` | `19:2982` | Catalejo-lupa sobre el pack |
| `/bases` | `22:3021` | Pergamino que se despliega |
| `/ganaste` | `23:3081` | El cofre se abre y el premio emerge |
| `/perdiste` | `23:3159` | Cofre cerrado con balanceo |
| `/codigo-utilizado` | `107:297` | Código ya activado |
| `/codigo-inexistente` | `131:131` | Código fuera de la base |

Cualquier ruta desconocida redirige a `/`. El menú plegado (`13:32`) está
disponible en toda la navegación; en registro, carga de código y resultados
arranca cerrado.

---

## Frontera con el backend

```
src/types/promo.ts             Contratos: Participant, RegistrationForm, PromoCode,
                               PromoCodeResult, Prize, UserCodeCount, SessionState, Terms
src/services/promoApi.ts       Interfaz PromoApi + export del adapter activo
src/services/mockPromoApi.ts   Implementación de desarrollo
src/mocks/scenarios.ts         Interruptor de escenarios
src/mocks/prizes.ts            Catálogo mock (assets originales del Figma)
src/mocks/codes.ts             Base de códigos de ejemplo
```

Para conectar el backend real se cambia **una línea**:

```ts
// src/services/promoApi.ts
export const promoApi: PromoApi = new HttpPromoApi(baseUrl); // antes: new MockPromoApi()
```

Ninguna pantalla toca `fetch` y ninguna decide si un código gana. El flujo
(`src/app/useCodeFlow.ts`) enruta según el `status` que devuelve el adapter:

| `status` | Pantalla | Consume el código |
| --- | --- | --- |
| `WIN` | `/ganaste` | Sí |
| `LOSE` | `/perdiste` | Sí |
| `CODE_ALREADY_USED` | `/codigo-utilizado` | No |
| `CODE_NOT_FOUND` | `/codigo-inexistente` | No |
| `REGISTER_REQUIRED` | `/registro` | No |

El contador de códigos cargados sólo avanza con los dos estados que consumen el
código. Por eso el panel de aviso dice «CANJEASTE EL CÓDIGO» en `WIN` y `LOSE`, y
«CÓDIGO INGRESADO» en los dos errores.

Al conectar el backend, `src/mocks/codes.ts` se elimina: la consulta pasa a hacerse
contra la tabla real.

### Probar los estados sin backend

Por defecto el mock corre en modo **`BASE`**: consulta `src/mocks/codes.ts` y el
resultado lo decide el código ingresado, igual que hará contra la tabla real. Un
código que no está en esa lista devuelve `CODE_NOT_FOUND`; uno ya cargado,
`CODE_ALREADY_USED`.

Códigos de ejemplo. Hay uno por cada uno de los 19 premios reales de la
campaña; el catálogo completo está en [`docs/PREMIOS-2026.md`](docs/PREMIOS-2026.md).

| Código | Resultado |
| --- | --- |
| `PSPS5B4T8LQ` | Gana — PlayStation 5 |
| `PSNSW7K2M9X` | Gana — Nintendo Switch OLED |
| `PSCAR3J6VN2` | Gana — Kit volante + pedales |
| `PSBIC9D1RZ5` | Gana — Bicicleta Milano aro 24 |
| `PSAUR6H4KW8` | Gana — Auriculares JBL Tune 520BT |
| `PSCOL4M8XT1` | Gana — Columpio de jardín |
| `PSCAM7B2QK9` | Gana — Cama elástica |
| `PSSIL2H6NW4` | Gana — Silla gamer |
| `PSTAB9F3RD7` | Gana — Tablet Acer |
| `PSARO5K1VZ8` | Gana — Aro de basketball |
| `PSPIS3T7MJ2` | Gana — Piscina Bestway |
| `PSMON8W4CY6` | Gana — Monopatín Globber |
| `PSJBL6D9LP3` | Gana — Speaker JBL Flip 7 |
| `PSB201G5SX7` | Gana — Bicicleta Milano aro 20 |
| `PSGLO4N8HB2` | Gana — Mini Globo Loco Bestway |
| `PSB167V2QF9` | Gana — Bicicleta Milano aro 16 |
| `PSSMA1J6TR4` | Gana — Consola Smartfy Game Boy |
| `PSROL9C3KM5` | Gana — Rollers Ferrari |
| `PSSKA2Z7DN8` | Gana — Skate mediano |
| `QF3B8N6V2W5` y otros nueve | Válido, sin premio |
| `ABCDG847FR5`, `ZX9Q4L2PT60` | Ya canjeados de fábrica |
| Cualquier otro | No existe |

Para recorrer la pantalla de ganador premio por premio sin tipear códigos, el
panel de escenarios tiene un desplegable **Premio** cuando está en modo
«Ganaste». También por URL: `?scenario=WIN&prize=skate-mediano`.

El código se normaliza antes de buscarlo (mayúsculas, sin espacios ni guiones):
`psnsw 7k2-m9x` encuentra `PSNSW7K2M9X`. Un código válido se gasta al usarlo, así
que cargarlo dos veces devuelve `CODE_ALREADY_USED`.

Para forzar un estado sin importar el código hay tres formas equivalentes:

1. Panel flotante abajo a la derecha, sólo en `npm run dev`.
2. Query string `?scenario=WIN`, **antes** del `#`:
   `localhost:5180/?scenario=WIN#/participar`.
3. Consola: `window.__PROMO_SCENARIO__ = 'CODE_NOT_FOUND'`.

Escenarios disponibles: `BASE` (por defecto), `AUTO` (rota entre los cuatro
resultados), `WIN`, `LOSE`, `CODE_ALREADY_USED`, `CODE_NOT_FOUND`,
`REGISTER_REQUIRED`.

El padrón de registrados y los códigos canjeados viven en memoria: recargar la
página reinicia la demo desde cero. La latencia simulada (`MOCK_LATENCY_MS`,
750 ms) permite ver los estados de carga.

---

## Inventario de animaciones

| # | Animación | Dónde vive |
| --- | --- | --- |
| 1 | Lluvia de estrellas, 3 capas de profundidad | `components/effects/StarField.tsx` — un `<canvas>`, un solo `rAF`, `pointer-events: none` |
| 2 | Flotación asincrónica (4–12 px, 3–7 s, delays distintos) | `components/effects/FloatingLayer.tsx` |
| 3 | Nave que entra desde la derecha → idle | `components/promo/PurosolShip.tsx` |
| 4 | Cofre del Home que se abre con hover (tap en touch) | `components/promo/TreasureChest.tsx` |
| 5 | Glow en iconos y botones (hover / focus / active) | `PromoButton`, `RibbonButton`, `SiteMenu`, `CloseButton` |
| 6 | Menú que se despliega, con entrada escalonada | `components/navigation/SiteMenu.tsx` |
| 7 | Catalejo-lupa (mouse, touch y teclado), zoom 2,2× | `components/promo/TelescopeMagnifier.tsx` |
| 8 | Ganador: anticipación → apertura → luz → premio + holograma + partículas | `components/promo/PrizeReveal.tsx` |
| 9 | Cofre perdedor: respiración y balanceo sutiles | `TreasureChest` modo `idle` |
| 12 | Pergamino que se despliega + Ralph "leyendo" | `components/promo/Parchment.tsx`, `pages/Terms` |
| 13 | Carrusel de premios | `components/promo/PrizeCarousel.tsx` |
| 14 | Contador con la cifra en HTML real | `components/promo/CodeCounter.tsx` |
| 15 | Cursor ancla (sólo puntero fino, nunca en inputs) | `App.tsx` + `styles/global.css` |

---

## Accesibilidad y motion

- HTML semántico: todos los botones son `<button>` y cada input tiene su `<label>`
  asociado. En el registro la etiqueta se lee sobre la línea y sube al escribir,
  así que nunca desaparece.
- Decoración con `aria-hidden` y `pointer-events: none`.
- Foco visible en cian y skip-link al contenido.
- Teclado: TAB, ENTER/SPACE, ESC cierra el menú, y las flechas mueven el carrusel
  y el catalejo.
- El catalejo no es la única vía: el contenido está descrito en texto.
- `prefers-reduced-motion: reduce` desactiva parallax, flotaciones y recorridos;
  las estrellas quedan fijas, y el pergamino y el premio aparecen con un fundido.
  El sitio sigue siendo completamente usable.

## Performance

- Sólo el Home entra en el bundle inicial; el resto es `React.lazy`.
- Animaciones sobre `transform`/`opacity`; nunca `top`/`left`/`width`/`height`.
- Un único `rAF` para el starfield y otro para el catalejo, ambos cancelados al
  desmontar.
- Sin listeners por elemento decorativo.
