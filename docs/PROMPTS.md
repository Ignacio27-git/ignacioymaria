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

---

### 2026-11-01 · Paso 1.6 · gestión de títulos (SDD `title-management`)

**Prompt:** `/gentle-sdd-new title-management` — Implementa con el sistema de diseño de docs/DESIGN-ROADMAP.md: Añadir título buscando en TMDB (o a mano). Ficha con las dos notas, la media, el estado, la fecha vista y las observaciones. Listas de vistas y pendientes con búsqueda, filtros por estado y orden por nota o fecha. Comprueba cada pantalla con el MCP de Playwright en escritorio y móvil.

**Resultado:** Un único cambio con migración (`fold_search`, `name_search`, índice único), repositorio y casos de uso, Server Actions, doble de TMDB para los E2E, rutas `(catalog)` con añadir, ficha y listas, y guardado optimista por campo. 893 tests de Vitest, 55 E2E y 244 comprobaciones pgTAP. La comprobación con el MCP de Playwright queda pendiente.

**Lección:** Resolver las preguntas de producto antes de la propuesta (estado inicial, fecha automática, orden de Pendientes) evitó rehacer el diseño. Los E2E con el doble de TMDB destaparon dos carreras del propio test (rellenar antes de hidratar e inicios de sesión en paralelo), no fallos de la aplicación.

---

### 2026-11-01 · Paso 1.7 · importador del Excel (SDD `excel-import`)

**Prompt:** `/gentle-sdd-new excel-import` — Escribe un importador de la hoja Pelis de "Ignacio y María.xlsx": convierte las fechas de Excel, trata el texto libre como fecha desconocida, deduce el estado del color de la celda (los colores que no están en la leyenda se asignan al estado de la leyenda más parecido), separa las series y sus temporadas del nombre, y enlaza con TMDB cuando la coincidencia sea clara. Debe ser idempotente y generar un informe de filas dudosas para revisarlas a mano.

**Resultado:** Migración `import_key`, módulos puros en `src/import/` con tests, y el script `scripts/import-excel.ts` con `--dry-run`, inserción solo-nueva en una transacción e informe en `import-reports/`. Las fases 1 a 4 están hechas; la verificación con el Excel real queda en manos de la persona.

**Lección:** Resolver antes de diseñar las preguntas de producto (tipo sin marca de temporada, rangos de año, token en el script) evitó rehacer el diseño. La identidad del título no debe incluir el tipo cuando este se deduce de TMDB.

---

### 2026-11-02 · Paso 1.7 · seguimiento del importador (SDD `excel-import`, fase 6)

**Prompt:** Tras probar con el Supabase alojado: separar la URL del importador de `SUPABASE_DB_URL`, que `--dry-run` escriba el informe aunque falle la base de datos, y fusionar de forma provisional las temporadas de una misma serie (caso *The last of us*), aplazando la valoración por temporada a un paso propio.

**Resultado:** `IMPORT_DB_URL`, módulos puros `merge`, `env` y `db-error`, sección `season_merge` y línea de omisión en el informe, y decisiones D-77 a D-80. Comprobado en local con un libro sintético.

**Lección:** Las primeras pruebas con la base real destaparon dos riesgos que los datos sintéticos no cubrían: que una variable compartida apunte a otra base y que un fallo de conexión cueste el informe. Fusionar sin perder datos exige dejar las filas descartadas, con sus valores, en el informe.

---

### 2026-11-03 · Paso 1.8 · valoración por temporada (SDD `season-ratings`)

**Prompt:** `/gentle-sdd-new season-ratings` — Permite valorar cada temporada de una serie por separado (estado, nota de cada persona y fecha) y adapta el importador del Excel para cargar una fila por temporada.

**Resultado:** Tabla `title_seasons` con RLS, derivación del resumen de la serie en el dominio, casos de uso y acciones de temporada, importador por temporada sin fusión, y ficha y listas con valores derivados. Pendientes: comprobación visual con el MCP de Playwright, verificación final y la importación real contra la base local.

**Lección:** Cerrar antes de la propuesta las trece decisiones de producto (derivación, filtro por la última temporada, retroceso sin temporadas, filas sin marca dentro de un grupo con marcas) evitó rehacer el diseño. Un único PR de este tamaño se sostiene solo porque cada bloque (datos, importador, UI, documentos) quedó en su propio commit.

---

### 2026-11-03 · Paso 2.1 · pruebas E2E de humo y CI (SDD `smoke-e2e`)

**Prompt:** `/gentle-sdd-new smoke-e2e` — Escribe pruebas E2E con Playwright para los recorridos críticos: login, añadir un título, puntuarlo, marcarlo como pendiente y encontrarlo en la lista. Deben ejecutarse en CI.

**Resultado:** Un recorrido serial `tests/e2e/smoke.spec.ts` con un paso por etapa, el proyecto `smoke` en la cadena `auth -> smoke -> ui -> titles` y el workflow `.github/workflows/ci.yml` con dos jobs (`checks` y `db-e2e`), sin secretos. Decisión D-88.

**Lección:** Un único test serial con pasos nombrados da un fallo claro y barato, y como la tabla `titles` y el buzón de Mailpit son compartidos, hay que fijar el orden de los proyectos en vez de confiar en `fullyParallel`. Los nombres de servicios de la CLI y el comportamiento de la compilación sin base solo se confirman en la primera ejecución en GitHub.

### 2026-11-03 · Paso 2.2 · puesta en producción (SDD `production-deployment`)

**Prompt:** `/gentle-sdd-new production-deployment` — Despliega en Vercel contra un proyecto de Supabase de producción: variables de entorno, migraciones, dominio y comprobación con Playwright contra la URL pública.

**Resultado:** `vercel.json` (solo `main`), el workflow `deploy-migrations.yml`, la comprobación local de solo lectura `tests/prod/**` con `pnpm test:prod` y `pnpm test:prod:login`, tests de contrato y el runbook `docs/DEPLOY.md`. Decisión D-89. Los pasos de paneles (Supabase, Vercel, GitHub) quedan para la persona.

**Lección:** Lo que una plataforma no acepta como código se documenta como runbook ordenado y se vigila con tests de contrato lo que sí es un archivo (sin `pull_request`, `--dry-run` antes del push real, `ci.yml` sin secretos). Una guarda en ejecución es más fiable que prometer que la prueba no escribe.

### 2026-11-03 · Paso 2.3 · importación real y copias de seguridad (SDD `production-import-and-backups`)

**Prompt:** `/gentle-sdd-new production-import-and-backups` — Carga el Excel en el Supabase de producción con el importador existente (primero con `--dry-run`) y programa copias de seguridad exportables con GitHub Actions; documenta cómo restaurar una copia en una base local y compruébalo. Antes de decidir la frecuencia, la retención o el cifrado, pregunta.

**Resultado:** Workflow `backup.yml` con volcados cifrados con `age` (clave pública), tests de contrato con guardas probadas contra variantes inseguras y runbook de importación, copias y restauración en `docs/DEPLOY.md`. Decisión D-91. Los pasos con secretos, la importación real y el ensayo de restauración quedan para la persona; el paso sigue abierto.

**Lección:** En un repositorio público los artifacts son legibles, así que el cifrado con clave pública es la única opción que no deja un secreto de descifrado en GitHub; y una guarda de contrato solo vale si se prueba contra una variante insegura que debe fallar.

### 2026-11-03 · Paso 2.3 · cierre tras el ensayo de restauración (SDD `production-import-and-backups`, seguimiento)

**Prompt:** Seguimiento de `/gentle-sdd-new production-import-and-backups` — Limita el volcado de datos del workflow de copias al esquema `public` con un test de contrato escrito antes; corrige `docs/DEPLOY.md` (restauración en Git Bash, error de roles esperado, verificación por recuentos y `pnpm test:db` sobre una restauración sin datos, cadena del *pooler* de sesión, aviso de guardar la identidad `age` completa); enmienda D-91 y cierra el paso 2.3 con la evidencia del ensayo.

**Resultado:** `-s public` en el volcado de datos con su test de contrato (rojo, luego verde), D-92, runbook corregido y paso 2.3 cerrado en `docs/ROADMAP.md`.

**Lección:** Un ensayo de restauración real encuentra lo que la revisión no ve: el volcado de datos arrastraba `auth` y `storage` pese a la decisión escrita. Una decisión de exclusión se vigila con un test sobre la línea de comando que la implementa.

### 2026-11-04 · Paso 3.1 · vista de tarjetas (SDD `card-view`)

**Prompt:** `/gentle-sdd-new card-view` — En la lista, permite alternar entre el listado actual y una cuadrícula de tarjetas con la portada, el título, las notas y la fecha de visualización. Usa las skills de diseño y compruébalo con el MCP de Playwright, también en móvil. Antes de decidir en qué listas está disponible, si se recuerda la vista elegida o qué muestra una tarjeta sin portada o sin notas, pregunta.

**Resultado:** Interruptor `Tabla` / `Tarjetas` en `/vistas` y `/pendientes` con cookie `list_view` compartida (D-93 a D-98), `TitleCard` y `TitleCardGrid`, `Poster` con portada tipográfica, tests unitarios y E2E, y `DESIGN.md` enmendado (D-99). La comprobación visual con el MCP de Playwright queda pendiente para el orquestador.

**Lección:** Cuando un documento de diseño prohíbe lo que el producto necesita, se enmienda en el mismo cambio y con su decisión registrada. Con Partial Prerender, el HTML inicial de la lista llega en streaming: la ausencia de parpadeo se comprueba sobre la respuesta cruda (`context.request`), no con JavaScript desactivado, que deja el contenido sin mostrar.
