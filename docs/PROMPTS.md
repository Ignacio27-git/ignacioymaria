# Registro de prompts

Prompts que funcionaron o enseñaron algo y que merece la pena reutilizar. Se actualiza según la sección de registro obligatorio de `CLAUDE.md`.

## Formato de entrada

```markdown
### AAAA-MM-DD · Paso X.Y · título breve

**Prompt:** texto del prompt.

**Resultado:** qué produjo.

**Lección:** qué se aprendió o qué ajustar la próxima vez.
```

## Entradas

### 2026-10-29 · Paso 1.1 · esqueleto de la aplicación

**Prompt:** `/gentle-sdd-new app-skeleton` — Monta el esqueleto descrito en docs/ARCHITECTURE.md: Next.js (App Router) con TypeScript estricto, ESLint, Vitest y Playwright, con un test de ejemplo de cada tipo en verde.

**Resultado:** Proyecto Next.js con pnpm y Node 22, Tailwind, capas vacías con barrera `server-only`, un test de Vitest y uno de Playwright en verde.

**Lección:** Andamiar en un directorio temporal y copiar de forma selectiva evita pisar `README.md`, `docs/` y `.env.example`. Conviene contrastar las configuraciones con la documentación instalada, porque las versiones actuales cambian opciones (p. ej. Vite ya resuelve `tsconfig paths` sin plugin).

### 2026-10-29 · Paso 1.2 · modelo de dominio

**Prompt:** `/gentle-sdd-new title-domain` — Modela el dominio de títulos: película o serie (con temporadas vistas), nota de María y nota de Ignacio (0-10, admitiendo medios puntos y cuartos), media calculada solo con las notas que existan, estado, fecha vista (puede ser desconocida), año, actores y observaciones. Reglas como funciones puras con tests.

**Resultado:** Dominio puro en `src/domain/` (resultado, nota, media, estado, fecha vista, título y barril) con 129 tests en verde y un test que impide importaciones externas. Solo el nombre y el tipo son obligatorios; el resto de campos toma valores por defecto.

**Lección:** Conviene decidir desde el principio qué campos son obligatorios: la regla «solo nombre y tipo» apareció tarde y obligó a rehacer specs y diseño. Las tablas de tests hacen crecer el diff más de lo previsto (834 líneas frente a 800).

### 2026-10-29 · Paso 1.3 · esquema de base de datos

**Prompt:** `/gentle-sdd-new database-schema` — Traduce el modelo de dominio a un esquema de Supabase con migraciones en el repositorio y políticas RLS que solo permitan acceso a usuarios autenticados de la lista permitida.

**Resultado:** Dos migraciones (`allowlist` y `titles`), RLS con `is_allowed()` y 131 comprobaciones pgTAP en local. Los correos reales quedan fuera de git.

**Lección:** Un `order by` sobre una columna con el mismo nombre que un alias de salida (`score_maria::text`) ordena por el alias, no por la columna; conviene cualificarla. Los esquemas de seguridad se prueban mejor simulando roles (`set local role` y `request.jwt.claims`) que mirando solo el catálogo.

### 2026-10-30 · Paso 1.4 · acceso solo para vosotros dos

**Prompt:** `/gentle-sdd-new couple-auth` — Implementa el acceso con Supabase Auth (enlace mágico por email) limitado a una lista permitida de dos cuentas. Cualquier otra cuenta se rechaza. Cada nota se asocia a quien ha iniciado sesión.

**Resultado:** Hook `before_user_created` que rechaza correos ajenos antes de crear usuario, mapeo correo-persona en la base de datos, trigger que impide escribir la nota de la otra persona, login por Server Action, ruta `/auth/confirm`, proxy con `getClaims()` y pruebas E2E con Mailpit. 195 comprobaciones pgTAP, 210 tests de Vitest y 7 de Playwright.

**Lección:** Probar el flujo real con E2E destapó dos fallos que los tests unitarios no veían: Next reescribe `127.0.0.1` a `localhost` en `request.url` (las redirecciones deben usar una URL de sitio fija) y el prerenderizado en desarrollo rechaza `Date.now()` salvo tras `connection()`. Conviene decidir pronto los textos en español de la interfaz y no depender de los de los artefactos de diseño. El usuario de pruebas de pgTAP no es superusuario, así que no puede asumir roles reservados de Supabase.

### 2026-10-30 · Paso 1.5 · integración con TMDB

**Prompt:** `/gentle-sdd-new tmdb-integration` — Integra TMDB en el servidor: búsqueda de películas y series, y obtención de póster, año, reparto principal y número de temporadas. La clave nunca llega al cliente. Respeta los límites de la API y cachea las respuestas.

**Resultado:** Migración `tmdb_fields`, tres campos opcionales en el dominio, módulo `src/server/tmdb/` (cliente inyectable, mapeadores puros y casos de uso con comprobación de identidad), dos Server Actions finas y ayudante de URL de póster. 324 tests de Vitest y 222 comprobaciones pgTAP, sin llamadas reales a TMDB.

**Lección:** La especificación asumía un resultado «unauthorized» que no existía y el diseño tuvo que crearlo; conviene contrastar con el código las suposiciones sobre contratos existentes antes de cerrar la especificación. La caché de `fetch` de Next evita cachear fallos sin lanzar excepciones, a diferencia de `use cache` y `unstable_cache`.

---

### 2026-10-30 · 1.6 (pausado) y D.1

**Prompt:** `/gentle-sdd-new title-management` (el del paso 1.6), y después «hazlos ahora, son parte del 1.6».

**Resultado:** La exploración de `title-management` encontró el bloqueo de la regla 9 (D.1 y D.2 sin hacer) y el cambio quedó en pausa. D.1 se hizo con `impeccable`: `PRODUCT.md` y la dirección «Tabla de críticos», con su contrato en `.impeccable/surfaces/`. D.2 se hará como cambio SDD `design-system`.

**Lección:** Antes de lanzar un paso con requisitos previos, comprobar que están hechos. La exploración lo detectó, pero el prompt del paso no lo recordaba.

### 2026-10-30 · D.2 · sistema de diseño (SDD `design-system`)

**Prompt:** El ciclo SDD `design-system`, lanzado a partir de «hazlos ahora, son parte del 1.6»: tokens, componentes base y tema claro y oscuro sobre la dirección «Tabla de críticos» de D.1.

**Resultado:** Tokens con fuente única y tests de contraste y sincronización, Archivo con eje `wdth`, tema Sistema/Claro/Oscuro en cookie leída por el servidor, nueve componentes más `ThemeToggle` y `AddAction`, y el muestrario `/sistema`. Tras la revisión final, 524 tests de Vitest y 34 de Playwright; `DESIGN.md` y `.impeccable/design.json` escritos a partir de lo construido.

**Lección:** La revisión final con capturas encontró problemas que los tests no podían ver: la acción principal, lo seleccionado y el error compartían el mismo aspecto. Las capturas con barras de desplazamiento clásicas recortaban 15 px; hay que ocultarlas antes de capturar. Una decisión que contradice la documentación del framework (tema leído en el servidor en lugar de un script en línea) conviene validarla con un spike de build antes de construir encima.
