# Lógica detrás de cada pantalla

Documento para el equipo de backend. Responde la pregunta concreta:
**¿qué tiene que decidir el servidor para que salga determinado premio?**

Fuentes: «Mecánica de participación PuroSol 2026» (láminas 1 a 6) y
«Calendario de Premios 2026.xlsx». Los contratos HTTP están en
[`GUIA-BACKEND.md`](GUIA-BACKEND.md); el catálogo de premios en
[`PREMIOS-2026.md`](PREMIOS-2026.md).

---

## 1. El principio que ordena todo

**El frontend no decide nada.** No sabe qué códigos existen, no sabe cuáles
ganan y no conoce el calendario. Manda cédula + código y pinta la pantalla que
corresponde al `status` que recibe.

Eso significa que **toda la mecánica vive en el backend**, y que el calendario
de premios no puede estar en el sitio: cualquier cosa publicada en el navegador
se lee desde las herramientas de desarrollo, y con el calendario a la vista se
sabría a qué hora conviene cargar un código.

---

## 2. Flujo completo de un canje

```
USUARIO
  ↓  cédula + código
FRONTEND
  ↓  toma el token de Turnstile (acción "redeem_code"; el desafío corre desde que cargó la página)
POST /api/v2/codes/redeem
  { "cedula": "1234567", "code": "XXXXXXX", "turnstileToken": "..." }
  ↓
BACKEND
  │
  ├─ 1. Verifica el token con Cloudflare (clave SECRETA, sólo del servidor)
  │     ¿válido?
  │        NO  → rechaza. No mira el código, no lo consume, no suma al contador.
  │        SÍ  → sigue
  │
  ├─ 2. Normaliza el código: mayúsculas, sin espacios ni guiones
  │
  ├─ 3. ¿El código existe en la base?
  │        NO  → CODE_NOT_FOUND
  │
  ├─ 4. ¿Ya fue canjeado?
  │        SÍ  → CODE_ALREADY_USED
  │
  ├─ 5. ¿La cédula está registrada?
  │        NO  → REGISTER_REQUIRED
  │
  ├─ 6. TRANSACCIÓN: marca el código como canjeado
  │                  y suma 1 al contador de esa cédula
  │
  └─ 7. ¿Hay un premio del calendario vencido y sin adjudicar?
           SÍ  → WIN  + ese premio
           NO  → LOSE
```

Los pasos 3, 4 y 5 **no consumen el código ni tocan el contador**. Los pasos 6
y 7 sí: por eso el contador sólo avanza con `WIN` y `LOSE`.

---

## 3. Cómo se decide qué premio sale

Esta es la parte que el calendario define y el documento de mecánica no explica.
**Es la interpretación que hay que confirmar con el cliente antes de programar.**

El Excel trae 89 filas con `fecha + hora + premio`. Cada fila es **una unidad
de premio que se habilita en ese instante**. La lectura natural es:

> A partir de su fecha y hora, cada premio queda «armado». Lo gana el primer
> código válido que se canjee desde ese momento. Una vez adjudicado, ese premio
> ya no vuelve a salir.

Traducido a tabla:

```sql
prize_schedule
  id            PK
  prize_id      -- 'playstation-5', 'skate-mediano', ... (ver PREMIOS-2026.md)
  scheduled_at  -- timestamp exacto del Excel
  status        -- PENDING | AWARDED
  awarded_code      NULL
  awarded_cedula    NULL
  awarded_at        NULL
```

Y a consulta, en el paso 7:

```sql
-- El más viejo de los vencidos y pendientes.
SELECT id, prize_id
  FROM prize_schedule
 WHERE status = 'PENDING'
   AND scheduled_at <= NOW()
 ORDER BY scheduled_at ASC
 LIMIT 1
   FOR UPDATE SKIP LOCKED;   -- imprescindible, ver 3.1
```

Si devuelve fila → se marca `AWARDED` con el código y la cédula, y la respuesta
es `WIN` con ese `prize_id`. Si no devuelve nada → `LOSE`.

### 3.1 Concurrencia: el punto donde se rompe si se hace mal

Dos personas pueden canjear en el mismo segundo. Si los dos hilos leen el mismo
slot `PENDING`, **se entregan dos PlayStation donde había una**. El bloqueo del
paso 7 no es opcional.

Tres formas válidas, en orden de preferencia:

1. `SELECT ... FOR UPDATE SKIP LOCKED` dentro de la misma transacción que marca
   el código como canjeado.
2. `UPDATE prize_schedule SET status='AWARDED', ... WHERE id = (subconsulta) AND status='PENDING'`
   y confiar en el número de filas afectadas: si es 0, otro se lo llevó → `LOSE`.
3. Serializar los canjes con una cola.

Lo mismo aplica al código en el paso 6: marcarlo canjeado con un `UPDATE ...
WHERE status='DISPONIBLE'` y verificar filas afectadas evita que un doble click
lo canjee dos veces.

### 3.2 Consecuencias de esta regla

- **Se entregan exactamente 89 unidades**, ni una más. La tabla es el tope.
- Un premio programado a las 15:00 puede adjudicarse a las 15:47 si nadie
  participó antes. No se pierde: queda esperando.
- Al cierre de la campaña pueden sobrar slots sin adjudicar si hubo poca
  participación. **Qué hacer con ellos es decisión del cliente** (redistribuir,
  declarar desiertos, extender). El frontend no se entera.
- Si dos premios vencen sin que nadie participe, se adjudican en orden en los
  dos canjes siguientes, uno por canje.

### 3.3 Qué hay que confirmar con el cliente

| Punto | Por qué importa |
| --- | --- |
| ¿El premio lo gana el primer código posterior a la hora? | Es el supuesto de todo lo de arriba. Alternativa: sorteo entre los canjes de una ventana. |
| ¿Una persona puede ganar más de un premio? | Hoy nada lo impide. Si hay tope, va en el paso 7. |
| ¿Hay límite de códigos por cédula o por día? | El contador es acumulativo y sin tope. |
| ¿Qué pasa con los premios no adjudicados al cierre? | Ver 3.2. |
| ¿El código ganador tiene que coincidir con el sticker físico? | El aviso en pantalla dice «guardá tus stickers ganadores». |

---

## 4. Pantalla por pantalla

La ruta la elige el frontend con el `status`; no hay ninguna otra lógica.

| `status` | Pantalla | Ruta | ¿Consume el código? | ¿Suma al contador? |
| --- | --- | --- | --- | --- |
| `WIN` | Ganaste | `/ganaste` | Sí | Sí |
| `LOSE` | Estuviste cerca | `/perdiste` | Sí | Sí |
| `CODE_ALREADY_USED` | Código fuera de órbita | `/codigo-utilizado` | No | No |
| `CODE_NOT_FOUND` | Código fuera de órbita | `/codigo-inexistente` | No | No |
| `REGISTER_REQUIRED` | Registro | `/registro` | No | No |

### Mapa de llamadas: qué API usa cada pantalla

Verificado contra el código. **De diez pantallas, sólo cuatro hablan con el
backend.**

| Pantalla | Ruta | Cuándo llama | Endpoint |
| --- | --- | --- | --- |
| Inicio | `/` | — | ninguno |
| Vista principal | `/participar` | al apretar **Participar** | `GET /api/participants/{cedula}` → `POST /api/v2/codes/redeem` |
| Registro | `/registro` | al apretar **Registrarme** | `POST /api/participants` → `POST /api/v2/codes/redeem` |
| Premios | `/premios` | al abrir | `GET /api/prizes` |
| Dónde está el código | `/donde-esta-el-codigo` | — | ninguno |
| Bases y condiciones | `/bases` | al abrir | `GET /api/terms` |
| Ganaste | `/ganaste` | — | ninguno |
| Estuviste cerca | `/perdiste` | — | ninguno |
| Código ya utilizado | `/codigo-utilizado` | — | ninguno |
| Código inexistente | `/codigo-inexistente` | — | ninguno |

**Las cuatro pantallas de resultado no llaman a nada.** Dibujan lo que devolvió
el `redeem` anterior, que quedó guardado en memoria. Si la persona recarga la
página estando en `/ganaste`, no hay a quién volver a preguntarle: la pantalla
queda sin datos. Es a propósito —un premio no se vuelve a pedir— pero conviene
saberlo al probar.

#### Secuencia 1 — participante ya registrado

```
/participar   [Participar]
   ↓  GET /api/participants/4582913        → { "registered": true, "participant": {...} }
   ↓  POST /api/v2/codes/redeem            → { "status": "WIN", "prize": {...}, "codeCount": 4 }
/ganaste
```

#### Secuencia 2 — primera participación

```
/participar   [Participar]
   ↓  GET /api/participants/4582913        → { "registered": false }
/registro     (conserva cédula y código en memoria del navegador)
   ↓  POST /api/participants               → { "ok": true, "participant": {...} }
   ↓  POST /api/v2/codes/redeem            → { "status": "LOSE", "codeCount": 1 }
/perdiste
```

Los dos `redeem` son el mismo endpoint. **El registro no tiene un endpoint
propio que además canjee**: son dos llamadas seguidas, y si la segunda falla la
persona queda registrada pero sin su código canjeado. Ese caso hay que
contemplarlo: lo razonable es que el código siga disponible y pueda cargarlo de
nuevo.

#### `GET /api/participants/{cedula}/code-count` todavía no lo usa nadie

Está en el contrato pero **ninguna pantalla lo llama hoy**. El contador viaja
dentro de `codeCount` en cada respuesta de `redeem`, que es lo que las pantallas
muestran.

Ya tiene, sin embargo, un consumidor previsto: la pantalla de carga de código
descrita más abajo. Ahí el contador se muestra **antes** de canjear nada, así
que no puede venir de `redeem` y es exactamente para lo que sirve este endpoint.
Conviene implementarlo.

#### Pendiente de diseño: carga de código con el participante ya identificado

La columna central de la página 15 del PDF de ajustes dibuja una pantalla que
**no existe todavía**: sólo el campo de Código Secreto —sin cédula— más el
contador de códigos cargados y su rótulo.

Decisión tomada: **no reemplaza a `/participar`**. Es un estado posterior a la
identificación o registro del participante:

- la persona ya está identificada;
- sólo ingresa el Código Secreto;
- ve cuántos códigos lleva cargados.

Queda **PENDIENTE — ESTADO POST-IDENTIFICACIÓN + CONTRATO BACKEND**. Hasta que
se defina, no se crea una ruta arbitraria, no se toca `PromoApi` y el contador
no se cablea con un valor fijo: el dato tiene que ser real y equivalente a
«cantidad de códigos cargados por participante», que es lo que devuelve
`GET /api/participants/{cedula}/code-count`.

La geometría de referencia ya está medida y anotada; la composición pide además
una variante **vertical** de `CodeCounter` (placa de 231x100 con el rótulo
debajo), distinta de la horizontal que se usa hoy en mobile.

### 4.1 Vista principal — `/participar` (lámina 1)

Pide cédula y código. Al enviar, el frontend llama primero a
`GET /api/participants/{cedula}` y después a `POST /api/v2/codes/redeem`.

Valida sólo formato (campos completos, cédula de 5 a 15 dígitos, código de 4 o
más). **Eso no es seguridad**: el backend valida todo de nuevo.

### 4.2 Registro — `/registro` (lámina 2)

Se abre cuando la cédula no está registrada, **conservando el código que la
persona ya había tipeado**.

Seis campos: nombre y apellido, fecha de nacimiento, cédula, email, ciudad,
teléfono.

**Regla de edad:** se exigen **18 años cumplidos** a la fecha del registro. El
backend tiene que repetir la validación: un `POST` armado a mano se saltea el
formulario. Cuidado con la zona horaria — comparar por año/mes/día, no por
timestamp.

> ⚠️ **Desviación consciente, a confirmar con el cliente.** La mecánica escribe
> la regla como corte por año: «únicamente personas nacidas antes de 2008, ya
> que deben ser mayores de edad». No es lo mismo: quien nació en 2008 cumple 18
> durante la campaña y el corte lo dejaría afuera siendo adulto, justo cuando la
> pantalla le dice «un tutor mayor de 18 años». Se implementó el motivo que el
> documento da, no la fórmula. Las dos rechazan menores por igual; ésta no
> rechaza adultos.

**Al confirmar, el registro NO vuelve al formulario de carga**: se canjea el
código que traía y se abre directamente la pantalla de resultado, como indica
la lámina 2.

### 4.3 Ganaste — `/ganaste` (lámina 6)

Llega con `WIN`. Necesita el objeto `prize` completo, o al menos el `prizeId`
(los ids están en [`PREMIOS-2026.md`](PREMIOS-2026.md)).

El premio emerge del cofre con animación, cualquiera sea. Muestra el código
canjeado, el teléfono de contacto y el contador.

> Si el backend manda `WIN` sin premio, la pantalla felicita sin nombrarlo. No
> inventa uno: mostrar el equivocado sería peor.

### 4.4 Estuviste cerca — `/perdiste` (lámina 3)

Llega con `LOSE`: el código era válido pero no había premio vencido pendiente.
El código igual se consume y el contador sube.

### 4.5 Código ya utilizado — `/codigo-utilizado` (lámina 5)

Llega con `CODE_ALREADY_USED`. El panel dice «CÓDIGO INGRESADO», no
«canjeaste»: no se consumió nada.

### 4.6 Código inexistente — `/codigo-inexistente` (lámina 4)

Llega con `CODE_NOT_FOUND`, para códigos fuera de la base.

### 4.7 El contador

«Acumulativo, refleja la cantidad total de códigos y/o cupones generados
exitosamente por cada cliente» (láminas 3, 4 y 5).

Lo calcula el backend y viaja en `codeCount` dentro de cada respuesta. El
frontend no lo incrementa por su cuenta: muestra lo que recibe. Aparece en las
cuatro pantallas de resultado, incluso en las dos que no suman.

### 4.8 Pantallas sin lógica de backend

`/` (inicio), `/premios`, `/donde-esta-el-codigo` y `/bases` son informativas.
`/premios` consume `GET /api/prizes`; `/bases` consume `GET /api/terms`.

---

## 5. Turnstile

El canje viaja con un token de **Cloudflare Turnstile** (reemplazó a reCAPTCHA v3
en octubre de 2026). El cableado del frontend está en
[`src/services/turnstile.ts`](../src/services/turnstile.ts) y el widget vive en
[`src/components/security/TurnstileHost.tsx`](../src/components/security/TurnstileHost.tsx):
un contenedor fijo abajo a la derecha, invisible salvo que Cloudflare pida un click.

| Dónde | Qué |
| --- | --- |
| Frontend | `VITE_TURNSTILE_SITE_KEY` — clave **del sitio**, pública, viaja al navegador |
| Backend | `TURNSTILE_SECRET_KEY` — clave **secreta**, nunca sale del servidor, nunca en una variable `VITE_` |

Con la variable vacía el sitio no carga nada de Cloudflare y manda el canje sin
`turnstileToken` (sirve para la demo con el adapter mock). **Contra el backend
real eso no alcanza**: `POST /api/v2/codes/redeem` rechaza con `403` todo canje
sin token o con token inválido, sin consumir el código.
El widget se renderiza con la acción "redeem_code"; si el backend recibe otra,
también responde 403 (reason: "action-mismatch").

El token es de un solo uso y vive 5 minutos; el desafío corre en segundo plano
desde que carga la página, así que al momento del canje casi siempre ya está.
El frontend espera hasta 20 s a que llegue; si no llega, muestra «No pasó la
verificación de seguridad…» y **no** manda el canje. Después de cada canje el
widget se resetea para que el próximo intento lleve un token nuevo.

Para probar en local sin claves reales, Cloudflare publica sitekeys de prueba
(ver `.env.example`): `1x…AA` siempre pasa, `3x…FF` fuerza el checkbox en la
esquina, `2x…AB` bloquea siempre.

---

## 6. Las 89 unidades

Verificado contra las cuatro hojas del Excel con `npm run audit:premios`:

```
CALENDARIO   89 eventos · 19 tipos · 01/09/2026 → 27/11/2026
NOMBRE WEB   19 tipos · 89 unidades
PREMIOS      89 filas · 19 tipos
CANTIDADES   19 tipos · 89 unidades
```

Las cuatro coinciden premio por premio. **La campaña entrega 89 unidades de 19
tipos**, y la tabla `prize_schedule` con 89 filas es lo que lo garantiza.

El reparto por tipo está en [`PREMIOS-2026.md`](PREMIOS-2026.md).

---

## 7. La base de códigos

La mecánica adjunta `OT243586 PARTE 1_base.txt` y `OT243586 PARTE 2_base.txt`.
**Esos archivos no están en este repo**: los carga el backend en su tabla.

El frontend trae una base de ejemplo (`src/mocks/codes.ts`) con 19 códigos
premiados —uno por tipo de premio— más válidos sin premio y ya canjeados. Es
sólo para QA y se borra al conectar el backend real.

Ojo con la diferencia: en la demo el premio lo determina el código, para poder
probar cada pantalla. **En producción el código no decide nada**: sólo dice si
es válido, y el premio sale del calendario.

Normalización, para que las dos bases coincidan: mayúsculas, sin espacios ni
guiones. `psnsw 7k2-m9x` tiene que encontrar `PSNSW7K2M9X`.
