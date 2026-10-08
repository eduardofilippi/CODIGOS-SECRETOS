# Cómo hacer que una pantalla quede igual al Figma

Pasarle un PNG a un agente y pedirle "hacelo igual" no funciona, y el motivo es
simple: en una imagen no está el número. ¿Ese margen es 24 o 28? ¿Ese texto es
18 o 20? ¿El pergamino está a 120 del borde o a 132? El agente estima, y estimar
doce veces por pantalla da un resultado que *se parece* pero no coincide.

Este flujo cambia dos cosas:

1. **La fuente pasa a ser el número, no la imagen.** `figma-pull.mjs` baja de
   Figma la posición, el tamaño, el color, la tipografía y la sombra de cada
   capa, y los deja en `figma/spec/`.
2. **Hay una forma de comprobar.** `figma-check.mjs` mide lo que dibuja el
   navegador y lo compara contra ese spec, capa por capa, en píxeles. El agente
   deja de adivinar si quedó bien: lo mide, corrige y vuelve a medir.

La imagen sigue sirviendo — pero como control al final, no como fuente al
principio.

---

## Preparar (una sola vez)

### 1. El token de Figma

En figma.com: foto de perfil → **Configuración** → **Seguridad** → **Tokens de
acceso personal** → generar uno con permiso de lectura de archivos.

Va en `.env`, que no se sube al repo:

```
FIGMA_TOKEN=figd_...
```

No lleva el prefijo `VITE_` a propósito: todo lo que empieza con `VITE_` termina
dentro del JavaScript publicado y cualquiera lo puede leer.

### 2. Los node id de cada frame

`figma/nodes.json` mapea cada pantalla del sitio a su frame de Figma. Los frames
de escritorio ya están cargados; **los mobile dicen `TODO`**.

Para completarlos: en Figma, clic derecho sobre el frame → **Copiar enlace**. El
link trae `?node-id=23-3159`; ese es el id (con guion o con dos puntos, da
igual, el script normaliza).

### 3. Playwright

No es dependencia del proyecto, para no engordar el despliegue. Se instala a
demanda, igual que para `audit:responsive`:

```bash
npm i -D playwright && npx playwright install chromium
```

---

## El ciclo

```bash
npm run figma:pull registro-mobile     # 1. bajar el diseño exacto
npm run dev                            # 2. (en otra terminal)
npm run figma:check registro-mobile    # 3. medir lo que hay
#    ... corregir el CSS ...
npm run figma:check registro-mobile    # 4. volver a medir
```

### 1. `figma:pull` — bajar el diseño

```bash
npm run figma:pull registro-mobile     # una pantalla
npm run figma:pull -- --all --png      # todas, con render de referencia
```

Escribe en `figma/spec/`:

| Archivo | Qué es |
| --- | --- |
| `<slug>.json` | el árbol completo: `rect` de cada capa relativo al frame, colores en hex, tipografía, radios, sombras con su CSS ya armado, autolayout |
| `<slug>.md` | lo mismo en tabla — **esto es lo que se le pasa al agente**, no el PNG |
| `<slug>.png` | el render de referencia, sólo con `--png` |

Las coordenadas son **relativas al frame**: `(0,0)` es la esquina del diseño, no
del lienzo de Figma. Eso es lo que se traduce a CSS sin hacer cuentas.

**Bajar un asset del diseño.** Cuando una pieza está en el Figma y no en el
repo —un ícono, un adorno— se baja del nodo en vez de pedírsela al diseñador:

```bash
npm run figma:pull -- --export 70:366,70:370            # svg por defecto
npm run figma:pull -- --export 70:178 --formato png --escala 2
```

Queda en `figma/assets/<nodo>.<formato>`. Bajarlo del nodo garantiza que sea la
pieza exacta y no un recorte, que es una diferencia que `figma:check` no puede
ver: compara cajas, no los píxeles de una imagen.

### 2. `figma:check` — medir

```bash
npm run figma:check registro-mobile
npm run figma:check -- --all
```

Correrlo con `VITE_TURNSTILE_SITE_KEY` vacía en `.env` (o comentada). Con una
sitekey cargada, Chromium headless suele disparar el checkbox de Turnstile, que
aparece como un bloque abajo a la derecha y ensucia el diff de píxeles; además
su tráfico en segundo plano demora el `networkidle` que espera el script.

Hace tres comprobaciones distintas, y la primera es la que importa:

**Capa por capa.** Todo elemento del DOM con `data-figma="23:3163"` se mide y se
compara contra ese mismo nodo en el spec. Sale una tabla así:

```
✗ registro-mobile  402×913  14 capas medidas, 3 fuera de 2px
    pergamino (23:3163): 0.0x +14.0y 0.0w -8.0h
    dino (23:3170): -6.0x +2.0y 0.0w 0.0h
```

Eso es accionable: *el pergamino está 14 px más abajo y 8 px más bajo de lo que
dice el diseño*. Una captura no dice eso.

**Al revés: qué falta.** La comprobación de arriba recorre el DOM, así que sólo
puede hablar de lo que ya está marcado. Una capa del diseño que nadie escribió no
está en el DOM y por lo tanto no aparece en ninguna fila: la pantalla da ✓ con 0
desvíos igual. Ese fue el agujero por el que las dos cintas del titular de
REGISTRO pasaron sin que nada las comparara nunca.

Así que hay una segunda pasada que sale del **spec** y va en la dirección
contraria: por cada capa que pinta algo y no tiene contraparte marcada en el DOM,
la lista como «sin implementar o sin marcar».

```
✓ registro-mobile  402×913  28 capas medidas, 0 fuera de 2px
    cobertura: 24/50 capas del diseño que pintan tienen data-figma
    ⚠ 26 capa(s) del diseño sin implementar o sin marcar (14 sin ningún ancestro marcado)
```

«Pinta algo» = tiene relleno o trazo visible. Un grupo o un frame sin relleno no
dibuja nada por sí mismo —lo dibujan sus hijos— así que no entra en la cuenta:
marcarlo no verificaría nada.

La columna **«Dentro de»** del reporte es la que hace accionable la lista, porque
separa dos casos muy distintos:

- **sin ancestro marcado** — la capa no está en el código. Hay que dibujarla, y
  hasta entonces no hay ningún número que diga que falta.
- **con un ancestro marcado** — está dibujada y la marca vive más arriba (el
  vector y el rótulo de un botón, cubiertos por la marca del grupo). Bajar la
  marca un nivel es opcional, y sólo suma si esa capa se puede mover por su
  cuenta.

El frame raíz no cuenta como ancestro que cubra: todas las capas descienden de él
y está marcado en las once pantallas, así que si contara la distinción no
distinguiría nada.

Esta pasada **todavía no decide el código de salida**: informa. Dos categorías
esperan una decisión antes de poder endurecerla —el chrome del iPhone (la barra
de estado y el indicador de home, ocho capas por pantalla, que el sitio no puede
dibujar) y las capas que sólo existen en un estado que la captura no visita, como
las miniaturas a la izquierda del carrusel de PREMIOS, que no están en el DOM
cuando el carrusel arranca en la primera posición—.

**Píxel a píxel.** Escribe en `figma/check/<slug>/`:

- `render.png` — lo que dibuja el sitio
- `diff.png` — en rojo lo que no coincide
- `overlay.png` — el diseño al 50% encima del render, para mirar a ojo
- `reporte.md` — el resumen

Devuelve código 1 si algo quedó fuera de tolerancia, así que sirve en CI.

Variables: `TOL=2` (px de tolerancia), `UMBRAL=32` (cuánto tiene que diferir un
píxel para contar), `BASE=http://localhost:5180`.

### 3. Marcar las capas con `data-figma`

Sin esto sólo hay comparación por píxel, que dice *que* algo está mal pero no
*qué*. Marcar es una línea por elemento:

```tsx
<img className="registro__pergamino" data-figma="23:3163" src={pergamino} alt="" />
```

No hace falta marcar todo: alcanza con los elementos que posicionás vos —
contenedores, imágenes grandes, bloques de texto, botones—. Ocho o diez por
pantalla ya cierran el ciclo. El atributo no molesta en producción y sirve de
documentación de dónde salió cada cosa.

Hay dos casos que no entran en el molde, y cada uno tiene su atributo:

**Un contenedor que scrollea.** El alto real nunca va a coincidir con los 913 o
969 px del frame, así que compararlo sería un desvío permanente y falso. Se
declara qué ejes cuentan:

```tsx
<main className="register-m" data-figma="17:2912" data-figma-ejes="x,w">
```

Los demás ejes se siguen midiendo y se muestran en el reporte, pero no deciden
si la capa pasa.

**Un componente compartido por varios frames.** Las cuatro pantallas de
resultado son una sola composición en el código (`ResultLayout`) y cuatro frames
distintos en Figma. Se listan los nodos separados por espacio y gana el que
exista en el spec de la pantalla que se está midiendo:

```tsx
<section data-figma="23:3159 23:3081 107:297 131:131">
```

Si ninguno está en ese spec, el reporte lo marca «pertenece a otro frame» y no
lo cuenta como falla.

**Capas rotadas: no hace falta hacer nada, pero conviene saber qué pasa.** Para
una capa girada, la API no devuelve la medida de la imagen sino la caja alineada
a los ejes que **envuelve** a la forma rotada: un dino rotado 37° "mide" 363×389
cuando la imagen es de 185×294. Perseguir ese número rompería lo que está bien.
`figma:pull` guarda además el tamaño real en `tamano`, y `figma:check` detecta
la rotación solo: compara **centro contra centro** —rotar un rectángulo no mueve
su centro— y usa `tamano` para el ancho y el alto. En el reporte esas capas
aparecen como «rotada -37.3°, centro», y por defecto sólo deciden por posición:
el ancho de un asset rotado depende de cuánto margen transparente le dejó el
diseñador al exportarlo, que no es un dato de diseño.

---

### La pintura: lo que no mueve la caja

`figma:check` no compara sólo geometría. Por cada capa marcada también verifica
contra el spec:

| | |
| --- | --- |
| **color** | del texto, o el relleno sólido de una caja |
| **tipografía** | que la familia del diseño esté realmente aplicada, o su sustituta declarada |
| **cuerpo, interlineado, espaciado** | en px de diseño, escalados al lienzo |
| **transformación y alineación** | `uppercase`, `center`, etc. |
| **opacidad y radios** | |
| **espejo** | si el nodo está volteado horizontalmente |
| **trazo** | ancho, color y **orden de pintado** |
| **sombras** | busca en `text-shadow`, `box-shadow` y `filter` a la vez |

Esto existe porque la tabla de capas puede dar **todo en cero y la pantalla
verse distinta igual**: un título con el resplandor del color equivocado, una
etiqueta en otro tono, o —el más silencioso— un texto que cayó en la tipografía
sustituta porque la licenciada no cargó. Ninguna de esas tres mueve un píxel de
la caja.

Sale en su propia sección del reporte, con el valor del diseño y el del sitio
lado a lado.

Cuando el color no lo pinta el elemento marcado sino un hijo, se lo saca del
control con `data-figma-omitir="pintura"`. También acepta claves sueltas —
`data-figma-omitir="fondo,sombras"`— para omitir una sola propiedad en vez de
todas.

**Tipografía.** El diseño y el sitio usan DK Prince Frog Regular (400). El
control debe comparar la familia y el cuerpo de forma directa, sin mapas de
sustitución ni tolerancias creadas para otra fuente.

**El espejo, que es el más traicionero.** Figma no lo guarda como una
propiedad: lo mete en la matriz `relativeTransform` como una escala negativa, y
muchas veces lo acompaña de una rotación de 180° que por sí sola dejaría la
pieza cabeza abajo. El spec dice «rotado 180°» y lo que se ve es una nave
derecha mirando al otro lado.

Importa porque **la caja envolvente es idéntica con espejo o sin él**: una pieza
dada vuelta pasa el control con las cuatro medidas en cero. `figma:pull` lo
detecta por el determinante de la matriz y lo guarda como `espejo: true`;
`figma:check` compara contra el determinante del `transform` calculado.

Si el espejo vive en un hijo —porque el elemento marcado lleva una animación que
le pisaría el `transform`— se saca con `data-figma-omitir="espejo"`, anotando por
qué.

Y una advertencia sobre el método: cuando un nodo tiene una sombra grande, el
render que devuelve Figma viene con el lienzo inflado por esa sombra, así que
**correlacionar el render contra el asset no sirve** para adivinar la
orientación — da valores bajos en todas. Ahí hay que mirar.

**El orden de pintado del trazo.** CSS por defecto dibuja el relleno y **encima**
el trazo, así que un trazo centrado de 2 px se come 1 px de letra por todo el
contorno: el texto queda pálido y hueco, y el borde se lee como un contorno duro
en vez de un filo. Figma lo muestra al revés. Por eso, si el nodo declara trazo
sobre un texto, el control exige `paint-order: stroke fill`.

**Dos conversiones que conviene no equivocar:**

- Una sombra de Figma (`DROP_SHADOW`) va **1:1** al radio de CSS. El `÷2` es
  para el desenfoque de capa (`LAYER_BLUR`) contra `filter: blur()`, que es
  otra cosa.
- Sobre texto va con `text-shadow`, que sigue la forma de las letras. Sobre una
  imagen con transparencia, con `filter: drop-shadow()`, que sigue el alfa.
  `box-shadow` dibujaría el rectángulo de la caja.

El spec ya trae cada efecto con su CSS armado en el campo `css`: usá ese valor
en vez de recalcularlo.

---

## Ojo con el alto del frame

Los exports mobile no miden todos igual: `landing`, `Registro`, `Premios`,
`bases` y `donde esta el codigo` son **402×913**, mientras que `ganaste`,
`perdiste` y `codigo utilizado` son **402×969**. Por eso `figma:check` toma el
alto del frame del spec o, si no hay spec todavía, del PNG de referencia —
nunca uno fijo.

### La barra de estado: se descuenta

Los once frames mobile arrancan con una instancia `Status bar - iPhone` de
**402×62**: el `9:41` con la señal y la batería. Esa barra la dibuja el sistema
operativo, **fuera** del viewport de la página.

**La decisión, y es una corrección de la anterior: se descuenta.** El cero del
eje Y del sitio es el borde INFERIOR de esa barra, no el borde del frame.

Antes no se descontaba, y el razonamiento era que el sitio le dejaba esos 62 px
libres arriba «como área de la barra del sistema, que en un teléfono real
existe». Eso contaba la barra dos veces: el sistema la dibuja afuera y encima la
página le reservaba lugar adentro, así que el contenido terminaba 62 px más
abajo de lo que el diseño muestra respecto del borde visible. Se ve en un
número: el frame pone la píldora del menú en y 79, o sea 17 px por debajo de la
barra; sin descontar, el sitio la ponía a 79 px del borde de la página.

Dónde vive cada mitad del descuento:

| Quién | Qué hace |
| --- | --- |
| `layout/mobile-stage.css` | sube el lienzo 62 px de diseño con un margen negativo. Una vez, para las once pantallas |
| `figma-check.mjs` | hace la misma resta en la `y` esperada, leyendo el alto de la barra del propio spec |
| `figma-check.mjs` | recorta esos 62 px de arriba del PNG de referencia antes del diff de píxeles |

**Las composiciones no cambian.** Siguen escritas en las coordenadas crudas del
frame, con el cero en el borde del mock: el descuento es un cambio de
contenedor, no de capa. Al agregar una capa nueva se copia la `y` del spec tal
cual y no se le resta nada.

El alto se lee del spec y no se escribe `62` a mano: un frame sin esa instancia
—el desktop, o un frame mobile nuevo— da 0 y el descuento se desactiva solo.

Lo que el diseño pone por encima de y 62 —el planeta B3 de REGISTRO, la cabeza
del dino— queda dentro del área segura, debajo de la barra real. Es donde el
diseño lo puso: debajo de la suya.

---

## Cuando el control pide el defecto

El 27-08-2026 salió `paint-order: stroke fill` de siete hojas de estilo. Es una
propiedad que **Figma no tiene**: la había agregado el código. En Figma un trazo
CENTER se pinta ENCIMA del relleno —la mitad para adentro, la mitad para
afuera—, así que la letra de color adelgaza y el contorno es una banda completa.
Con `paint-order: stroke fill` el relleno tapa la mitad interior: la letra no
adelgaza y del contorno se ve la mitad. La clienta lo vio antes que cualquier
script: «parece que se juntan mucho y no se leen bien».

**El octavo lugar donde estaba era este control.** `figma-check.mjs` tenía la
regla `trazo (orden): esperaba stroke fill`, con el mismo razonamiento escrito en
un comentario. Mientras esa línea estuviera ahí, el control no sólo dejaba pasar
el defecto: lo **reclamaba**. Corregir las siete hojas hacía aparecer un desvío
de pintura en cada pantalla con título.

Lo que hay que sacar de acá no es el valor: es que **una expectativa mal puesta
en el control es peor que la ausencia de control**, porque se lee como
confirmación. La regla de `CLAUDE.md` —«el diseño se lee de `figma/spec/`, no de
una captura»— vale también para las reglas del checker: `trazoAlineacion:
"CENTER"` estaba en el spec todo el tiempo.

Y para lo que el control no alcanza a ver, `npm run audit:trazo`
(`scripts/medir-trazo.mjs`) cuenta la tinta: qué proporción de cada texto con
trazo es relleno y qué proporción es contorno, en el render y en el export de
Figma, con los colores del propio nodo. Al ser un COCIENTE se puede comparar el
render a 3× contra un export de 1×, cosa que los conteos absolutos no permiten.

## Efectos inventados

Mismo caso, otra propiedad. El logo de REGISTRO tenía
`filter: drop-shadow(0 0 3cqw rgba(9,234,255,.6))` y su nodo, el 73:553,
declara `efectos: null`. El resplandor estaba copiado del logo del LANDING
(70:169, que sí lleva dos de `0 0 250px #09EAFF`). La clienta lo describió como
«un brillo raro verde detrás de códigos secretos».

`figma:check` no lo veía y no podía: compara la caja, el relleno y el trazo, y
un `filter` no mueve la caja ni cambia el `color`. Sacarlo bajó el diff de
píxeles de la pantalla de 6,49% a 5,22%, que es la medida de cuánto ensuciaba.

`npm run audit:efectos` (`scripts/medir-efectos.mjs`) recorre las once
pantallas y, por cada capa que pinta `filter`, `box-shadow`, `text-shadow` o
`backdrop-filter`, pregunta si el nodo declara un efecto equivalente. Dos cosas
que el script sabe y conviene no volver a descubrir:

- **`text-shadow` se hereda.** Un hijo devuelve el del padre sin declararlo.
  Sólo cuenta el elemento donde el valor CAMBIA.
- **Una sombra declarada no siempre pinta.** `rgba(9,234,255,0) 0 0 0 0` está en
  varias reglas como estado de partida de una transición: alfa 0 y todo en cero.

Y una que es la frontera del control: **lo que no está marcado no se puede
comprobar.** El script lista aparte las capas que pintan un efecto sin
`data-figma`; esa lista es hasta dónde llega, no «no hay más».

## Problema abierto: el checker es ciego al estado, al movimiento y al gesto

`figma:check` abre una ruta, espera a que cargue y mide **una sola foto quieta,
sin tocar nada**. Todo lo que el sitio sabe hacer y no está en esa foto queda sin
comparar, aunque esté escrito y aunque esté marcado. No es una cuestión de
cobertura: sumar `data-figma` no lo arregla, porque o el elemento no está en el
DOM en el instante en que se mide, o lo que falla no se dibuja.

Tres casos confirmados por **estado**, que no son rutas:

| Caso | Qué se pierde | Por qué |
| --- | --- | --- |
| Carrusel de PREMIOS | `premio 5 1` (73:747) y `premio 4 1` (73:748) | `nodoDeRanura()` asigna la marca por offset relativo a la miniatura activa. La captura toma el carrusel siempre en la posición 0, donde no hay nada a la izquierda, así que `miniIzq1` y `miniIzq2` nunca llegan al DOM. **Están declaradas en `Prizes.tsx`** y aun así el reporte inverso las lista como sin implementar — con razón: nada las compara |
| `menu-mobile` (79:1111) | el frame entero, 25 capas | Es el menú desplegado. No tiene `ruta` en `figma/nodes.json` porque no es una URL, así que `figma-check` lo filtra de entrada. Es la única de las once que este control no puede tocar |
| ~~`CodeOnlyMobile`~~ | *(ya no aplica)* | Era la variante de PARTICIPAR con el código ya cargado. Se eliminó el 27-08-2026: la página 15B del PDF de la que salía quedó **descartada por decisión de la clienta**. PARTICIPAR tiene una sola composición y sí tiene frame (`70:343`). Ver `recursos/mobile/CLAUDE.md` |

Lo que tienen en común: la unidad de medida del control es la **ruta**, y el
diseño está organizado por **pantalla**, que a veces es un estado. Mientras eso
no cambie, «0 fuera de tolerancia» significa «0 fuera de tolerancia en el estado
inicial de esta ruta», y conviene leerlo así.

Y dos ejes más, de la misma familia, donde el problema no es *cuál* estado se
mide sino que la foto es una foto:

| Eje | Qué se pierde | Caso real |
| --- | --- | --- |
| **Movimiento** | Todo lo que el control apaga para poder medir. `figma:check` y `audit:responsive` usan `reducedMotion: 'reduce'` para congelar las animaciones, así que lo que sólo existe con movimiento no está en la foto | Las partículas del reveal de GANASTE (`Sparkles`) hacían `if (reduced) return null`. Sobraban respecto del diseño y estuvieron puestas meses sin que nada las marcara |
| **Gesto** | Todo lo que no pinta un píxel. `touch-action`, `setPointerCapture`, los umbrales de arrastre: el control no toca la pantalla, y Playwright por defecto usa mouse, donde el defecto ni siquiera se reproduce | La lupa de `/donde-esta-el-codigo` tenía `touch-action: none` sobre el 43% de la altura y dejaba la página **sin scroll en el teléfono**. Diez pantallas en ✓, 0 desvíos, y la clienta sin poder bajar |

Del segundo salió `npm run audit:gestos` (`scripts/medir-gestos.mjs`), que sí
pasa un dedo por el centro de las diez pantallas — contexto con `hasTouch: true`
y `Input.dispatchTouchEvent` por CDP, porque con `page.mouse` no aparece. Cubre
un eje, no el problema.

Las salidas posibles para el eje del estado, ninguna elegida todavía: que
`nodes.json` acepte pasos de interacción antes de medir; que `figma:check` mida N
estados por ruta; o que las marcas de un componente con ranuras no dependan del
estado. La primera es la que menos toca el código de producción y la que más se
parece a lo que ya hace `?scenario=` en las cuatro pantallas de resultado.

---

## La otra puerta: el MCP de Figma en Claude Code

La API REST y el MCP devuelven la misma data; cambia por dónde entra y qué cuota
gasta. Tener las dos sirve: el MCP es cómodo para preguntar puntual mientras
programás, y `figma:pull` deja el spec versionado en el repo, que es lo que hace
reproducible el trabajo.

Para agregarlo en Claude Code:

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

Después `/mcp` para autorizar con la cuenta de Figma.

Dos condiciones que no son obvias:

- Hace falta puesto **Dev o Full** en un plan **Profesional** o superior. Con
  puesto View o Collab son 6 llamadas por mes y no alcanza para nada.
- **La cuota se le cobra al equipo dueño del archivo, no a tu cuenta.** Un
  archivo en Borradores o en un equipo Starter aplica el tope de Starter (20
  llamadas por mes) aunque vos tengas puesto Dev en el equipo Pro. Si el MCP
  responde "You've reached the Figma MCP tool call limit on the Starter plan",
  el problema es dónde vive el archivo, no tu puesto: hay que moverlo al equipo
  Pro.

Los límites completos están en
[developers.figma.com/docs/figma-mcp-server/rate-limits-access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/).

---

## Resumen para pegar en un prompt

> Antes de tocar el CSS de una pantalla, leé `figma/spec/<slug>.md`: ahí está la
> posición, el tamaño, el color y la tipografía exactos de cada capa. No estimes
> medidas de una captura. Marcá con `data-figma="<nodeId>"` los elementos que
> posiciones. Cuando termines, corré `npm run figma:check <slug>` y seguí
> corrigiendo hasta que ninguna capa quede fuera de la tolerancia.
