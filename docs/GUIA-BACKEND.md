# Guía para el desarrollador de backend

**PuroSol · El Tesoro Galáctico de los Códigos Secretos 2026**

Qué se construyó del lado del frontend, con qué tecnología, y **exactamente qué tiene que exponer el backend** para que se conecte sin tocar las pantallas.

### Por dónde empezar

| Orden | Documento | Para qué |
| --- | --- | --- |
| 1 | **Esta guía** | Qué hay hecho, con qué stack, y los seis endpoints con request y response de ejemplo. |
| 2 | [`LOGICA-BACKEND.md`](LOGICA-BACKEND.md) | Qué tiene que **decidir** el servidor: cómo se elige el premio, qué API usa cada pantalla, Turnstile y lo que falta confirmar con el cliente. |
| 3 | [`PREMIOS-2026.md`](PREMIOS-2026.md) | Los 19 premios con sus `id`, que son el contrato para devolver el premio ganado. |

Antes de leer nada, conviene abrir el sitio y usarlo:
**https://yenifmnm.github.io/CODIGOS-SECRETOS/** — funciona de punta a punta
contra datos de ejemplo, así se ve qué espera recibir cada pantalla.

Lo mínimo que hay que saber: **el frontend no decide nada.** Manda cédula y
código, y pinta la pantalla del `status` que le devuelvan. Conectar el backend
real es cambiar **una línea** en `src/services/promoApi.ts`.

---

## 1. Qué se entregó

Microsite promocional completo del lado del **frontend**: 10 pantallas navegables, fieles al Figma, responsive de 1920 px a mobile, con todas las animaciones del PowerPoint.

Funciona hoy end-to-end contra datos simulados. No falta ninguna pantalla.

**No se construyó nada de backend**: no hay base de datos, ni autenticación, ni validación real de códigos, ni lógica de sorteo, ni endpoints, ni integraciones externas. Todo eso queda del lado de ustedes.

### Pantallas implementadas

| Ruta | Pantalla | Nodo Figma |
| --- | --- | --- |
| `/` | Inicio | `13:49` |
| `/participar` | Bienvenidos — carga de cédula + código | `70:396` |
| `/registro` | Registro | `17:2912` |
| `/premios` | Premios (carrusel) | `57:86` |
| `/donde-esta-el-codigo` | Dónde está el código (catalejo) | `19:2982` |
| `/bases` | Bases y condiciones | `22:3021` |
| `/ganaste` | Ganaste | `23:3081` |
| `/perdiste` | Perdiste | `23:3159` |
| `/codigo-utilizado` | Código ya utilizado | `107:297` |
| `/codigo-inexistente` | Código inexistente | `131:131` |

---

## 2. Tecnología del frontend

| | |
| --- | --- |
| **Lenguaje** | TypeScript (modo `strict`) |
| **Librería UI** | React 18 |
| **Build tool** | Vite 5 |
| **Ruteo** | React Router 6, en modo `HashRouter` |
| **Animaciones** | CSS (`transform`/`opacity`) + Framer Motion donde hace falta secuencia |
| **Estilos** | CSS plano con custom properties. Sin Tailwind, sin Bootstrap, sin Material UI |
| **Node** | 18 o superior para compilar |
| **Salida** | Sitio 100 % estático: HTML + JS + CSS + imágenes (`dist/`, 2,7 MB) |

### Qué implica esto para el backend

1. **El frontend es estático.** Se sirve desde cualquier CDN, S3, Nginx o hosting de archivos. No necesita Node en el servidor de producción; Node sólo hace falta para compilarlo.

2. **El backend puede estar en el lenguaje que ustedes prefieran** — PHP, Laravel, .NET, Node, Python, Java, lo que ya usen. El frontend sólo consume JSON por HTTP. No hay ningún acoplamiento de lenguaje.

3. **Se comunican por una API JSON.** El contrato ya está definido y tipado (sección 4).

4. **CORS**: si el frontend se sirve desde un dominio distinto al de la API, hay que habilitar CORS para ese origen.

5. **Ruteo `HashRouter`**: las URLs son del tipo `sitio.com/#/participar`. Esto es a propósito — evita que el servidor tenga que configurar rewrites para que las rutas internas funcionen. Si prefieren URLs limpias (`sitio.com/participar`), se cambia a `BrowserRouter` en `src/App.tsx` y el servidor debe redirigir todas las rutas a `index.html`. **Decisión de ustedes.**

---

## 3. Cómo está preparada la conexión

Toda la comunicación con el backend pasa por **una sola interfaz**: `PromoApi`, en `src/services/promoApi.ts`.

Hoy la implementa `MockPromoApi` (datos simulados). Cuando exista la API real, se escribe `HttpPromoApi` con la misma interfaz y se cambia **una línea**:

```ts
// src/services/promoApi.ts
export const promoApi: PromoApi = new HttpPromoApi(baseUrl); // antes: new MockPromoApi()
```

Ninguna pantalla hace `fetch`. Ninguna pantalla decide si un código gana o pierde. El frontend recibe un `status` y muestra la pantalla que corresponde.

### Ejemplo explícito de la separación

Lo que el frontend **NO** hace:

```ts
if (code.startsWith('A')) winner = true;   // esto no existe en el proyecto
```

Lo que sí hace:

```ts
const result = await promoApi.submitPromoCode({ cedula, code });
navigate(ROUTE_BY_STATUS[result.status]);
```

---

## 4. Contrato que tiene que implementar el backend

Los tipos exactos están en `src/types/promo.ts`. Abajo, cada operación con el endpoint REST sugerido.

### 4.1 Verificar si una cédula ya está registrada

```
GET /api/participants/{cedula}
```

**Respuesta**

```json
{
  "registered": true,
  "participant": {
    "cedula": "1234567",
    "fullName": "Juan Pérez",
    "city": "Asunción"
  }
}
```

Si no está registrado: `{ "registered": false }`.

El frontend usa esto para decidir si manda al usuario a la pantalla de REGISTRO antes de cargar el código.

---

### 4.2 Registrar participante

```
POST /api/participants
```

**Body**

```json
{
  "fullName": "Juan Pérez",
  "birthDate": "1990-05-14",
  "cedula": "1234567",
  "email": "juan@ejemplo.com",
  "city": "Asunción",
  "phone": "+595981123456"
}
```

`birthDate` va en formato ISO `yyyy-mm-dd`.

**Respuesta OK**

```json
{ "ok": true, "participant": { "cedula": "1234567", "fullName": "Juan Pérez", "city": "Asunción" } }
```

**Respuesta con errores de validación** — el frontend los pinta campo por campo:

```json
{
  "ok": false,
  "fieldErrors": {
    "email": "Ese email ya está registrado",
    "cedula": "Cédula inválida"
  }
}
```

Las claves de `fieldErrors` deben coincidir con los nombres de campo: `fullName`, `birthDate`, `cedula`, `email`, `city`, `phone`.

**Regla de edad — obligatoria del lado del servidor.** Sólo se registra quien tenga **18 años cumplidos** a la fecha del registro. El frontend lo valida (`src/app/age.ts`) y limita el selector de fecha, pero eso es sólo experiencia de usuario: un `POST` armado a mano pasa por encima. Si la fecha no cumple, el backend responde:

```json
{
  "ok": false,
  "fieldErrors": { "birthDate": "El registro lo hace un tutor de 18 años cumplidos." }
}
```

> ⚠️ **Desviación consciente respecto de la mecánica, a confirmar con el cliente.** La lámina 2 escribe la regla como corte por año: «únicamente personas **nacidas antes de 2008**, ya que deben ser mayores de edad». No son equivalentes: quien nació en 2008 cumple 18 durante la campaña y el corte lo dejaría afuera **siendo adulto**, mientras la propia pantalla le dice «un tutor mayor de 18 años». Se implementó el motivo que el documento da —la mayoría de edad— y no la fórmula. Ambas rechazan menores por igual; ésta no rechaza adultos. Si el cliente prefiere el corte literal, es una línea en `src/app/age.ts`.

Cuidado con la zona horaria al calcular la edad: `new Date("2008-08-13")` se interpreta en UTC y en Paraguay (UTC−3/−4) adelanta el cumpleaños un día. Comparar por año/mes/día, no por timestamp.

> **Nota:** el frontend ya valida formato (requerido, email válido, fecha válida, edad mínima, largos). Esa validación es sólo para la experiencia de usuario, **no es seguridad**. El backend tiene que validar todo de nuevo.

---

### 4.3 Cargar un código — **la operación central**

```
POST /api/v2/codes/redeem
```

**Body**

```json
{ "cedula": "1234567", "code": "ABCDG847FR5", "turnstileToken": "0.AbCd..." }
```

`turnstileToken` lo genera Cloudflare Turnstile en el navegador. **Se verifica contra Cloudflare ANTES de mirar el código**: si falta o no es válido, el backend responde `403` sin consumir nada. Detalle en [`LOGICA-BACKEND.md`](LOGICA-BACKEND.md#5-turnstile).

**Cómo se decide el premio cuando el status es `WIN`** —la pregunta central— está desarrollada en [`LOGICA-BACKEND.md`](LOGICA-BACKEND.md#3-cómo-se-decide-qué-premio-sale): sale del calendario, no del código, y necesita bloqueo por concurrencia.

**Respuesta**

```json
{
  "status": "WIN",
  "code": "ABCDG847FR5",
  "codeCount": 4,
  "prize": {
    "id": "nintendo-switch",
    "name": "Nintendo Switch",
    "image": "https://cdn.purosol.com/premios/nintendo-switch.webp"
  },
  "message": null
}
```

**Valores posibles de `status`** — cada uno tiene su pantalla:

| `status` | Pantalla que muestra el frontend |
| --- | --- |
| `WIN` | Ganaste (el cofre se abre y sale el premio) |
| `LOSE` | Perdiste |
| `CODE_ALREADY_USED` | Código ya utilizado |
| `CODE_NOT_FOUND` | Código inexistente |
| `REGISTER_REQUIRED` | Redirige a Registro |

**Campos**

- `status` — obligatorio. Uno de los cinco de arriba.
- `code` — obligatorio. El código tal como se ingresó; se muestra en la pantalla de resultado.
- `codeCount` — obligatorio. Total de códigos cargados por ese participante **después** de esta operación. Alimenta el contador visual.
- `prize` — sólo cuando `status` es `WIN`. Si viene, `image` debe ser una URL absoluta accesible públicamente.
- `message` — opcional. Si viene, reemplaza el texto del diseño. Si no, se usa el copy del Figma.

**Toda la regla de negocio vive acá**: qué código es válido, si ya fue usado, si gana, qué premio le toca, cuántos códigos puede cargar una persona. El frontend no opina.

---

### 4.4 Contador de códigos

```
GET /api/participants/{cedula}/code-count
```

```json
{ "cedula": "1234567", "count": 4 }
```

---

### 4.5 Catálogo de premios

```
GET /api/prizes
```

```json
[
  { "id": "playstation-5", "name": "PlayStation 5", "article": "un", "image": "https://cdn.../playstation-5.webp" },
  { "id": "nintendo-switch-oled", "name": "Nintendo Switch OLED", "article": "una", "image": "https://cdn.../nintendo-switch-oled.webp" }
]
```

Alimenta el carrusel de la pantalla PREMIOS.

**Son 19 premios y 89 unidades**, transcritos del `Calendario de Premios 2026.xlsx`. La lista completa —id, nombre visible, artículo, cantidad e imagen de cada uno— está en [`PREMIOS-2026.md`](PREMIOS-2026.md), y hoy la sirve el mock desde `src/mocks/prizes.ts` con las imágenes incluidas en el proyecto. **Los `id` de ese documento son el contrato**: si el backend los respeta, puede devolver sólo el `prizeId` al premiar y dejar que el frontend resuelva nombre e imagen.

Tres cosas a tener en cuenta:

1. **`article`** («un», «una», «unos») acompaña al premio porque la pantalla arma la frase «te ganaste ___ {name}!» y el género no se puede deducir del nombre. Si el backend sirve el catálogo, tiene que incluirlo.
2. **Las imágenes**: si van a servirse desde el backend, tienen que ser URLs absolutas accesibles desde el navegador, PNG/WebP con fondo transparente y el producto centrado ocupando ~70 % de un lienzo cuadrado, que es como están preparadas las actuales.
3. **La disponibilidad la decide el backend.** El catálogo del frontend lleva las unidades planificadas de cada premio sólo como dato informativo; no descuenta stock ni oculta premios agotados.

### El calendario de adjudicación no va al frontend

El Excel trae fecha y hora exactas de las 89 entregas. Ese calendario **no está en el código del sitio y no debe estarlo**: todo lo que se publica en el bundle se puede leer desde las herramientas de desarrollo del navegador, y publicarlo permitiría saber de antemano a qué hora conviene cargar un código. Cruzar código + calendario + disponibilidad para decidir `WIN`/`LOSE` es responsabilidad exclusiva del backend (sección 4.3).

---

### 4.6 Bases y condiciones

```
GET /api/terms
```

```json
{ "termsHtml": "<p>...</p>" }
```

o bien

```json
{ "termsText": "Párrafo 1\n\nPárrafo 2" }
```

El frontend acepta cualquiera de los dos. **Si mandan `termsHtml`, tiene que venir sanitizado desde el backend** — el frontend lo inyecta tal cual.

Hoy el texto es provisorio y está hardcodeado en el mock. **Falta el texto legal definitivo.**

---

## 5. Cosas que el backend tiene que resolver y hoy no están definidas

Conviene cerrarlas antes de empezar:

1. **Identificación del usuario.** Hoy el frontend manda la cédula en cada request. ¿Va a haber sesión, token o cookie? Si sí, hay que definir cómo se obtiene y el frontend lo agrega en `HttpPromoApi`. **No hay ninguna autenticación implementada.**

2. **Anti-abuso.** No hay nada del lado del frontend que impida reintentos masivos. Rate limiting, captcha o lo que definan, va del lado del servidor.

3. **Datos de menores.** El formulario declara que lo completa un tutor mayor de 18. El tratamiento y la retención de esos datos es responsabilidad del backend; el frontend no persiste nada (el estado vive en memoria y se pierde al recargar).

4. **Texto legal de bases y condiciones.** Falta el definitivo.

5. **Imágenes de premios.** Hoy son las del Figma, empaquetadas en el frontend. Si el catálogo va a cambiar sin redeploy, tienen que servirlas por URL.

6. **Integración con WhatsApp** — mencionada en el brief original, **no implementada** y fuera del alcance del frontend.

7. **`HashRouter` vs `BrowserRouter`** — ver punto 5 de la sección 2.

---

## 6. Cómo pueden probar el frontend hoy, sin backend

Los cinco estados se fuerzan sin escribir código:

- Panel flotante abajo a la derecha cuando corre en modo desarrollo.
- Por URL: `?scenario=WIN`, `?scenario=LOSE`, `?scenario=CODE_ALREADY_USED`, `?scenario=CODE_NOT_FOUND`, `?scenario=REGISTER_REQUIRED`.
- Por consola: `window.__PROMO_SCENARIO__ = 'WIN'`.

Sin nada de eso, el mock va rotando los estados automáticamente para poder recorrer el flujo completo.

El mock también simula 750 ms de latencia, para que se vean los estados de carga. Está en `MOCK_LATENCY_MS`, en `src/mocks/scenarios.ts`.

---

## 7. Dónde mirar en el código

```
src/types/promo.ts          ← el contrato. Empezar por acá.
src/services/promoApi.ts    ← la interfaz + el punto donde se enchufa el adapter real
src/services/mockPromoApi.ts ← implementación de referencia con las formas exactas de respuesta
src/app/useCodeFlow.ts      ← cómo se enruta cada status
src/mocks/scenarios.ts      ← interruptor de escenarios
README.md                   ← cómo levantarlo, publicarlo y compartirlo
```

---

## 8. Pendientes conocidos del frontend

Se resuelven con material del cliente, no bloquean el backend:

1. **Tipografía `DK Prince Frog`** — está incluida en `src/assets/fonts/DK-Prince-Frog.otf` y se carga globalmente desde `src/styles/global.css` en peso 400.
2. **Posición del cofre en el Inicio** — el PowerPoint lo pide, el Figma actual no lo ubica en esa pantalla. Está en un espacio libre; se reubica con un solo cambio de coordenadas.
3. **Íconos vectoriales chicos** (hamburguesa, cruz de cerrar, cintas de botones, íconos de campos) — reconstruidos con la geometría y paleta del Figma porque no vinieron en la exportación de assets. Si el estudio los entrega, se reemplazan.
