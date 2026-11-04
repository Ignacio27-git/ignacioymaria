# Hoja de ruta de diseño

Esqueleto de los pasos de diseño `D.n` de la Fase D de `docs/ROADMAP.md`. Aquí se anotará el progreso visual y sus desviaciones.

> **Dependencia.** D.1 y D.2 tienen que estar terminados antes del paso 1.6.

**Estados:** `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[-]` descartado

## [x] D.1 · Dirección visual

**Objetivo.** Personalidad, referencias, tipografía y color con `impeccable`.

**Notas:** 2026-10-30 · Hecho con `impeccable` (init + new-work, construcción a partir del código porque no hay generación de imágenes).
- **Contexto de producto.** `PRODUCT.md`: uso principal en el móvil, en el sofá y de noche. Tono cálido pero sobrio. Los colores del Excel inspiran, pero no obligan. Hay que evitar lo cursi y lo frío o corporativo.
- **Dirección elegida: «Tabla de críticos».** Vosotros dos sois el consejo de críticos de una revista de cine: cada título es una fila, con una columna por persona (María, Ignacio) y la media en una caja invertida de tinta.
- **Proceso.** Se presentaron la dirección asignada por la tirada («La hoja, pasada a limpio»), dos alternativas competitivas (talonario de entradas y muro de pósters), cuatro descartadas y el estándar de la categoría. La elegida fue la carta «IMPECCABLE’S PICK» (semilla `c60de183`).
- **Tipografía.** Archivo, una sola familia variable: anchura estrecha para títulos y cabeceras, normal para la interfaz y cifras tabulares en todas las notas.
- **Color.** Estrategia contenida: neutros y una paleta de estados.
  - Tema claro: papel `#f4f4f1` y tinta `#131313`.
  - Tema oscuro: fondo `#111214` y tinta `#ebe9e4`, nunca blanco puro. Es de primera clase, pensado para una habitación a oscuras.
  - El estado es una celda pintada (un guiño al Excel) con su etiqueta: urgente rojo, vista verde, repetir ámbar, no repetir lila, horrible azul, pendiente con borde vacío.
- **Primera pantalla de referencia.** La lista de vistas: cabecera fija de tabla con palabras guía y la media como la única cifra grande.
- **Contrato de dirección.** Está en `.impeccable/surfaces/src-app-vistas-page-tsx.md`.
- **Pendiente para la fase de cierre de `impeccable`.** `DESIGN.md` se escribe al terminar la construcción (D.2 y 1.6), a partir de lo construido.

---

## [x] D.2 · Sistema de diseño

**Objetivo.** Tokens, componentes base, tema claro y oscuro.

**Notas:** 2026-10-30 · Hecho como cambio SDD `design-system` (commits `92b2c01` a `324941c`, un único PR con excepción de tamaño). Decisiones D-47 a D-57.
- **Tokens.** Colores claros y oscuros con `src/lib/design/tokens.ts` como única fuente, replicados en `globals.css` y comprobados con tests de sincronización y de contraste AA.
- **Tipografía.** Archivo con eje `wdth` mediante `next/font`; la anchura estrecha usa `font-stretch: 75%`.
- **Tema.** Sistema, Claro y Oscuro, guardado en una cookie que lee el servidor (sin parpadeo), con `ThemeToggle` en `/` y `/sistema`.
- **Componentes.** Nueve componentes base (`Button`, `TextField`, `StateCell`, `ScoreFigure`, `AverageBox`, `FilterChip`, `SortControl`, `CriticsTable`, `Masthead`) más `ThemeToggle` y `AddAction`, con tests de accesibilidad (axe) por componente. El login y la portada ya usan el sistema.
- **Muestrario.** `/sistema` (protegido por sesión) enseña todos los componentes con datos de muestra del servidor; los E2E lo recorren en ambos temas, a 1280 y a 390 px.
- **Revisión final de `impeccable`.** Nuevas capturas, revisión con 7 correcciones materiales (aspecto propio para acción principal, seleccionado y error; acción «Añadir»; media vacía con borde; filtros completos en escritorio y alineados con el margen; palabras guía; reglas de la tabla; flecha propia del orden) y entrega sobre esas correcciones. `DESIGN.md` y `.impeccable/design.json` los escribió el documentador a partir de lo construido.
- **Pendiente para el paso 1.6.** La interacción de «sello» con alternativa para movimiento reducido y el anclaje de «Añadir» en escritorio.
  - Hecho en el paso 1.6: el «sello» (`ScorePanel`, animación de 180 ms con `motion-reduce:animate-none` y aviso «Nota guardada» en `role="status"`) y el anclaje de «Añadir» a la columna de 760 px (D-67). Falta la comprobación visual con el MCP de Playwright.
- **Pruebas.** 524 tests unitarios y 34 E2E (7 de acceso y 27 de interfaz) en verde, con lint, typecheck y build limpios.

---

## [ ] D.3 · Pantallas clave

**Objetivo.** Listas, ficha, alta y login sobre el sistema de diseño.

**Notas:**

---

## [ ] D.4 · Movimiento

**Objetivo.** Transiciones y microinteracciones con `animate` y `emil-design-eng`.

**Notas:**

---

## [ ] D.5 · Pulido

**Objetivo.** Accesibilidad, rendimiento, móvil (`mobile-native`) y capturas con Playwright.

**Notas:**

---

## [~] Ficha de serie y listas por temporada (paso 1.8)

Cambio visual del paso 1.8 de `docs/ROADMAP.md` (cambio SDD `season-ratings`), fuera de la numeración `D.n` porque es una ampliación de la ficha y de las listas de 1.6.

**Notas:** 2026-11-03 · Construido con el lenguaje visual existente (tabla de críticos, solo reglas, sin radio ni sombra, estado como cuadrado pintado, una única inversión: la media).
- **Ficha de una serie con temporadas.** Arriba, `Resumen` de solo lectura: las notas de María e Ignacio en columnas iguales, la `AverageBox` (única pieza invertida), el estado de la última temporada con su cuadrado pintado y la fecha; una línea en tinta atenuada explica que se calcula con las temporadas. Debajo, una sección `Temporadas` cerrada por una regla de tinta de 2 px y una fila por temporada.
- **Fila de temporada.** Es un `<details>` nativo (teclado y lectores de pantalla sin trabajo extra) con una línea plegada siempre visible: `Temporada N` en condensada, estado, fecha y las dos notas a la derecha. Dentro, los editores de siempre (selector de estado, fecha con «Hoy» y «No sé cuándo», panel de nota) reutilizados con una prop `save`. Cualquiera de las dos personas edita estado y fecha; cada una, solo su nota (la de la otra se lee en la línea plegada). Solo la última temporada nace abierta, para que una serie de ocho temporadas no se convierta en un muro de controles.
- **Añadir temporada.** Botón primario (regla de 2 px y 4 px inferior) con el número que va a crear (`Añadir temporada 3`), desactivado mientras guarda, con aviso `role="status"` («Temporada 3 añadida.») y alerta propia si falla. La nueva fila nace abierta, pendiente, sin fecha ni notas.
- **Serie sin temporadas.** Conserva los editores de título de siempre y ofrece `Añadir temporada 1`.
- **Listas.** Estado, fecha, notas y media de una serie salen del resumen derivado; las medias fuera de la rejilla de 0,25 (7,13) caben en las columnas de 44 px. Una película no cambia.
- **Pruebas.** Componentes con axe (resumen, fila, botón, ficha completa), E2E del flujo (nota propia, estado, fecha, añadir temporada, la serie pasa a Pendientes) y la ficha de una serie añadida al recorrido de axe, desbordamiento e hidratación a 1280, 1440 y 390 px en ambos temas.
- **Pendiente.** Comprobación visual con el MCP de Playwright (escritorio y móvil, ambos temas) y sus correcciones, que hace el orquestador.

---

## [~] Vista de tarjetas (paso 3.1)

Cambio visual del paso 3.1 de `docs/ROADMAP.md` (cambio SDD `card-view`), fuera de la numeración `D.n`: es una vista alternativa de las listas de 1.6. `DESIGN.md` se enmienda para permitirla (D-99).

**Notas:** 2026-11-04 · Construido con el lenguaje visual existente (reglas, sin radio ni sombra, estado como cuadrado pintado, una única inversión: la media) y con las skills `impeccable`, `emil-design-eng` y `mobile-native`.
- **Interruptor de vista.** `Vista` con dos opciones, `Tabla` y `Tarjetas`, en el aspecto de chip del selector de tema sobre radios nativos (flechas y espacio sin código propio), 44 px de alto, marca de verificación en la elegida y sin fondo invertido. Va debajo de los controles de la lista y no toca la URL.
- **Tarjeta.** Portada 2:3, título (condensada, dos líneas como máximo) con el año a la derecha, `StateCell`, columnas María / Ignacio / Media (`1fr 1fr 3rem`) con `ScoreFigure` y `AverageBox`, y la fecha como en la tabla. Plana y cuadrada, cerrada por una línea fina; el enlace del título se extiende por toda la tarjeta (una parada de tabulador, el nombre se anuncia una vez). El gris de pulsación y el aro de foco interior son los de la fila de la tabla.
- **Cuadrícula.** 2 columnas en móvil, 3 desde `sm` y 4 desde `md`, dentro de `max-w-table`, abierta por una regla de tinta de 2 px. Las tarjetas de una fila comparten altura y alinean notas, media y fecha (`mt-auto`).
- **Sin portada.** El título en condensada `text-2xl` extrabold ocupa la caja 2:3 (seis líneas como máximo, `overflow-wrap:anywhere`), sin imagen. Con portada, la imagen carga perezosa desde TMDB (w342).
- **Sin notas.** Raya visible por persona con «Sin nota» solo para lectores de pantalla y la media vacía («Sin media»), igual que la fila.
- **Movimiento.** Sin animación nueva: solo el cambio de color de 150 ms ya existente, apagado con `prefers-reduced-motion`. El cambio de vista es una acción repetida y no se anima.
- **Pruebas.** Componentes con axe (interruptor, portada tipográfica, tarjeta, lista), E2E con imágenes de TMDB simuladas (interruptor en ambas listas, URL intacta, persistencia, cookie inválida, HTML inicial con la cuadrícula, clic con búsqueda pendiente, teclado real, tarjetas planas y de igual altura, carga perezosa, sin desbordamiento a 390 y 1280 px) y el recorrido de axe, desbordamiento e hidratación a 1280, 1440 y 390 px en ambos temas ampliado con las tarjetas.
- **Comprobación con el MCP de Playwright (2026-11-04).** Contra `pnpm dev` y la base local, con títulos de prueba y las imágenes de TMDB simuladas por un degradado, así que no valida carteles reales. Sin correcciones. Las capturas están en `.playwright-mcp/card-view/`, carpeta ignorada por git.

  | Viewport | Tema | Caso | Hallazgo | Captura |
  |---|---|---|---|---|
  | 390 px | Claro | `/vistas`: portada, portada tipográfica, sin notas, sin fecha, título largo | Dos columnas de 173 px y seis tarjetas de 441 px de alto; sin desbordamiento; interruptor de 44 px | `vistas-390-light.png` |
  | 390 px | Oscuro | `/pendientes`: portada, portada tipográfica, título largo, fecha de alta | Tres tarjetas de 430 px de alto; sin desbordamiento; el título de 73 caracteres cabe en la portada | `pendientes-390-dark.png` |
  | 1280 px | Claro | `/vistas`: los mismos casos | Cuatro columnas de 166 px y seis tarjetas de 431 px de alto; sin desbordamiento; notas, media y fecha alineadas | `vistas-1280-light.png` |
  | 1280 px | Oscuro | `/vistas`: los mismos casos | Mismo reparto; la media es el único elemento invertido | `vistas-1280-dark.png` |

  - **Interacción, a 390 px.** Las flechas cambian de vista, conservan el foco en el interruptor y dejan la URL intacta. Pulsar la portada abre la ficha. La vista se conserva al recargar.
  - **Límites.** Chromium de escritorio con barra de desplazamiento clásica: a 390 px quedan 375 px útiles. No es un teléfono real, así que la respuesta al toque sigue sin comprobar. Las series no se revisaron a ojo; solo las cubren las pruebas de componentes.
  - **Observaciones sin corregir.** «6,88» ocupa 44 de los 48 px de la caja de la media: cabe, con 2 px por lado, pero queda justo. En desarrollo, Next avisa de que la primera portada con carga perezosa es el LCP; la especificación pide carga perezosa, y cargarla antes sería una mejora aparte.

---

# Registro de desviaciones

| Fecha | Paso | Qué cambió | Por qué |
|---|---|---|---|
| 2026-10-30 | D.1 | D.1 se hizo en la misma sesión que el arranque del paso 1.6, que se pausó tras la exploración | Lo pidió la persona: D.1 y D.2 son el requisito previo del 1.6. D.2 va en su propio cambio SDD `design-system` |
| 2026-10-30 | D.2 | Se añadió un selector de tema (Sistema, Claro, Oscuro) guardado en cookie, cuando D.1 solo pedía seguir al sistema | Decisión del usuario antes de la propuesta; el valor por defecto sigue siendo el del sistema (D-50) |
| 2026-10-30 | D.2 | Componente extra `AddAction` («Añadir»), fuera de los nueve previstos | Lo pidió la revisión final de `impeccable`; su anclaje en escritorio queda para el 1.6 |
| 2026-10-30 | D.2 | Un único PR de unas 4200 líneas añadidas (65 archivos) con excepción de tamaño | Aceptado por el usuario antes de la propuesta; los tests son buena parte del diff |
| 2026-11-01 | D.2 | `ScoreFigure` acepta `number \| null` (antes solo número) | Las listas y la ficha muestran títulos sin nota; se aprobó en el paso 1.6 |
| 2026-11-03 | 1.8 | Entrada propia «Ficha de serie y listas por temporada» fuera de la numeración `D.n`, y la comprobación con el MCP de Playwright queda para el orquestador | Es una ampliación visual de la ficha y las listas de 1.6; el agente de implementación no tiene herramientas de navegador |
| 2026-11-03 | 1.8 | `CriticsTableRow` acepta `number \| null` en las notas (antes `Score`), como ya hacía `ScoreFigure` | La media de las notas de temporada puede salirse de la rejilla de 0,25 (D-82) |
| 2026-11-03 | 1.8 | Las filas de temporada son `<details>` plegables con la última abierta, en lugar de una lista de editores siempre visibles | Una serie de ocho temporadas con seis estados, fecha y panel de nota por temporada serían miles de píxeles de ficha; la línea plegada conserva estado, fecha y notas a la vista |
| 2026-11-04 | 3.1 | Entrada propia «Vista de tarjetas» fuera de la numeración `D.n`, y la comprobación con el MCP de Playwright queda pendiente para el orquestador | Es una vista alternativa de las listas de 1.6; el agente de implementación no tiene herramientas de navegador |
| 2026-11-04 | 3.1 | El interruptor de vista copia el aspecto de chip del selector de tema, no el token `filter-chip-selected` de `DESIGN.md` | Ese token invierte el fondo y rompería la regla de una sola inversión (R4); el selector de tema ya usa Pressed Paper |
