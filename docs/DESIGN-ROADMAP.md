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

# Registro de desviaciones

| Fecha | Paso | Qué cambió | Por qué |
|---|---|---|---|
| 2026-10-30 | D.1 | D.1 se hizo en la misma sesión que el arranque del paso 1.6, que se pausó tras la exploración | Lo pidió la persona: D.1 y D.2 son el requisito previo del 1.6. D.2 va en su propio cambio SDD `design-system` |
| 2026-10-30 | D.2 | Se añadió un selector de tema (Sistema, Claro, Oscuro) guardado en cookie, cuando D.1 solo pedía seguir al sistema | Decisión del usuario antes de la propuesta; el valor por defecto sigue siendo el del sistema (D-50) |
| 2026-10-30 | D.2 | Componente extra `AddAction` («Añadir»), fuera de los nueve previstos | Lo pidió la revisión final de `impeccable`; su anclaje en escritorio queda para el 1.6 |
| 2026-10-30 | D.2 | Un único PR de unas 4200 líneas añadidas (65 archivos) con excepción de tamaño | Aceptado por el usuario antes de la propuesta; los tests son buena parte del diff |
| 2026-11-01 | D.2 | `ScoreFigure` acepta `number \| null` (antes solo número) | Las listas y la ficha muestran títulos sin nota; se aprobó en el paso 1.6 |
