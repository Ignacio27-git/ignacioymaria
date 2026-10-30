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

## [ ] D.2 · Sistema de diseño

**Objetivo.** Tokens, componentes base, tema claro y oscuro.

**Notas:**

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
