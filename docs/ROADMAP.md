# Hoja de ruta

Secuencia de pasos para desarrollar la web de Ignacio y María con Claude Code: el prompt de
cada paso, qué revisar antes de continuar y espacio para anotar lo ocurrido.

Es un documento vivo. Los pasos se reordenan, se parten o se descartan según avance el
desarrollo. Cuando eso pase, se anota el motivo en la propia entrada y en el registro de
desviaciones del final.

**Cómo usarlo.** Un paso por sesión de Claude Code, salvo que sean triviales. Cada paso de
código es un ciclo SDD (`/gentle-sdd-new <cambio>`). Revisar el resultado antes de pasar al
siguiente.

**Registro.** El agente actualiza la documentación al terminar cada tarea según la sección de
registro de `CLAUDE.md`. Lo que el agente no puede registrar es lo que hizo mal sin darse
cuenta, así que las anotaciones que salgan de vuestra revisión las añadís vosotros.

**Estados:** `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[-]` descartado

**Diseño de la web.** El plan visual (pasos `D.n`) vive en `docs/DESIGN-ROADMAP.md`, con su
propio registro de desviaciones.

---

# Contexto

**Origen.** Hoy las películas y series se apuntan en `Ignacio y María.xlsx`, hoja *Pelis*
(276 filas). La web sustituye esa hoja. Las demás hojas del Excel (Restaurantes, Juegos de
Mesa, Libros) quedan fuera del producto.

**Campos del Excel.** Nombre, nota de María, nota de Ignacio, nota media, fecha vista, año,
actores y observaciones. El estado se codifica con el color de la celda:

| Color en el Excel | Estado |
|---|---|
| Rojo | Urgente de ver |
| Verde | Vista |
| Amarillo | Vista, repetir |
| Morado claro | Vista, no repetir |
| Azul | Vista y horrible |
| Sin color y sin notas | Pendiente |

**Datos sucios conocidos.** Fechas como número de serie de Excel o como texto libre ("jiji",
"No se acuerda"), media con `#DIV/0!` cuando no hay notas, series mezcladas con películas y
con la temporada en el nombre ("Heartstopper (t1-t3)"), y algunos colores que no son
exactamente los de la leyenda. Esos son errores al pintar la celda: los únicos estados válidos
son los de la leyenda, y cada color raro se asigna al estado de la leyenda más parecido.

**Stack.** Next.js (React, TypeScript) + Supabase (Postgres y autenticación) + Vercel.
Metadatos y pósters desde TMDB.

**Herramientas por defecto.** Skills de diseño (`impeccable`, `animate`, `emil-design-eng`,
`apple-design`, `mobile-native`) en todo lo visual, y el MCP de Playwright para comprobar la
web en el navegador.

---

# Fase 0 — Cimientos

## [x] 0.1 · Documentación base

**Objetivo.** Escribir la documentación que Claude Code leerá antes de cada sesión. Sin código.

```text
Lee docs/ROADMAP.md y redacta la documentación base del proyecto sin escribir código:

1. CLAUDE.md: propósito, stack, reglas no negociables, comandos y la sección de registro
   obligatorio (qué documento actualizar al terminar cada tarea).
2. docs/ARCHITECTURE.md: capas, carpetas de Next.js, acceso a Supabase y a TMDB, y qué
   código puede llamar a servicios externos.
3. docs/DECISIONS.md: decisiones ya tomadas (alcance solo pelis y series, stack, SDD).
4. docs/PROMPTS.md: registro de prompts relevantes, vacío salvo la cabecera.
5. docs/DESIGN-ROADMAP.md: esqueleto con los pasos D.n de la Fase D.

Si algo del roadmap es ambiguo, pregúntame antes de decidirlo.
```

**Revisar.** Que las reglas reflejan cómo queréis trabajar y que no se ha decidido nada que
siga abierto en este roadmap.

**Notas:** 2026-10-29 · cambio `base-docs`. Redactados `CLAUDE.md`, `docs/ARCHITECTURE.md`,
`docs/DECISIONS.md`, `docs/PROMPTS.md` y `docs/DESIGN-ROADMAP.md`. `sdd-init` queda para el
paso 0.2.

---

## [x] 0.2 · Inicializar SDD y verificar el contexto

**Objetivo.** Ejecutar `sdd-init` y confirmar que Claude Code entiende el proyecto.

```text
/gentle-sdd-init

Después, sin escribir ningún fichero, respóndeme:
1. Las reglas no negociables del proyecto.
2. Qué código puede hablar con Supabase y con TMDB.
3. Qué estados puede tener una película o serie y de dónde salen.
```

**Revisar.** Que las respuestas coinciden con la documentación. Si algo falla, se corrige la
documentación antes de seguir.

**Notas:** 2026-10-29 · `sdd-init` en modo Engram (claves `sdd-init/ignacioymaria`,
`sdd/ignacioymaria/testing-capabilities` y `skill-registry`). Se añadió la sección "Project
Conventions" a `.atl/skill-registry.md`. Las tres respuestas coinciden con la documentación.
Strict TDD queda desactivado hasta que el paso 1.1 instale Vitest y Playwright; entonces hay
que repetir `/gentle-sdd-init`.

---

## [x] 0.3 · Cuentas y claves externas

**Objetivo.** Dejar listos los servicios externos. Este paso es manual.

- Proyecto en Supabase (desarrollo; el de producción se crea en la Fase 2).
- Cuenta en Vercel enlazada al repositorio de GitHub.
- Clave de la API de TMDB.
- Fichero `.env.local` (ignorado por git) y `.env.example` con los nombres de las variables.

**Revisar.** Que ninguna clave acaba en el repositorio.

**Notas:** 2026-10-29 · Supabase, Vercel y TMDB configurados a mano. `.env.local` existe y git
lo ignora (`.env*.local`); `.env.example` existe y no está commiteado todavía. El agente no
puede leer los `.env*` (permisos), así que el contenido de `.env.example` (solo nombres) lo
revisan las personas antes del commit.

---

# Fase 1 — MVP: paridad con el Excel

Al final de esta fase la web hace todo lo que hoy hace la hoja *Pelis*, más pósters y
metadatos automáticos.

## [x] 1.1 · Esqueleto de la aplicación

**Objetivo.** Proyecto Next.js con TypeScript estricto, lint, tests unitarios y E2E. Sin
lógica de negocio.

```text
/gentle-sdd-new app-skeleton

Monta el esqueleto descrito en docs/ARCHITECTURE.md: Next.js (App Router) con TypeScript
estricto, ESLint, Vitest y Playwright, con un test de ejemplo de cada tipo en verde.
```

**Revisar.** Que `dev`, `build`, `lint` y los tests pasan en limpio.

**Notas:** 2026-10-29 · Cambio SDD `app-skeleton`. Andamiaje con `pnpm create next-app@latest`
en un directorio temporal fuera del repositorio y copia selectiva (sin tocar `README.md`,
`docs/`, `CLAUDE.md`, `.atl/` ni `.env.example`). Opciones: `--ts --eslint --tailwind --app
--src-dir --import-alias "@/*" --use-pnpm --disable-git --yes`. Versiones resueltas: Node
22.17.0 (`.nvmrc` `22`, `engines.node` `>=22 <23`), pnpm 11.25.0, Next.js 16.4.3, React 19.3.0,
TypeScript 5.9.3 (estricto), ESLint 9.39.5 (flat config con `eslint-config-next`), Tailwind
4.3.3, Vitest 5.0.5, Playwright 1.64.1 (solo chromium). Capas creadas: `src/domain`,
`src/server` (con `server-only`), `src/lib/supabase` (sin cliente) y `tests/e2e`. Comprobado:
`pnpm build`, `pnpm lint` (0 errores, 0 avisos), `pnpm typecheck`, `pnpm test` (1 test) y
`pnpm test:e2e` (1 test, con y sin servidor de desarrollo previo) en verde; `/` responde 200;
un `any` implícito rompe el build; importar `@/server` desde un componente cliente rompe el
build y desde un Server Component no. Aprobación de scripts de build en pnpm
(`pnpm-workspace.yaml`, `allowBuilds`): `sharp` y `unrs-resolver`. Pendiente para las personas:
repetir `/gentle-sdd-init` para activar Strict TDD ahora que existen Vitest y Playwright.

---

## [x] 1.2 · Modelo de dominio

**Objetivo.** Tipos y reglas puras del dominio, sin base de datos ni UI.

```text
/gentle-sdd-new title-domain

Modela el dominio de títulos: película o serie (con temporadas vistas), nota de María y
nota de Ignacio (0-10, admitiendo medios puntos y cuartos), media calculada solo con las
notas que existan, estado, fecha vista (puede ser desconocida), año, actores y
observaciones. Reglas como funciones puras con tests.
```

**Decisiones abiertas.**
- ¿"Urgente" es un estado propio o una marca de prioridad sobre "pendiente"?
- ¿Se pueden poner nuevos campos (géneros, plataforma, quién la propuso)?

**Revisar.** Que la media nunca da error con notas vacías y que los estados cubren los del
Excel.

**Notas:** 2026-10-29 · Cambio SDD `title-domain`, con Strict TDD activo. Módulos puros en
`src/domain/`: `result` (`Result`, `ok`, `err`), `score` (`Score` con marca, rejilla de 0,25 en
[0, 10], se rechaza sin redondear), `average` (media bruta, `null` sin notas), `watch-state` (seis
estados con id en inglés y etiqueta exacta de la leyenda), `watch-date` (fecha real o
desconocida), `title` (`Movie | Series`, `createTitle(input: unknown)` y `titleAverage`) y el
barrel `index.ts` (se importa como `@/domain`). Solo `name` y `kind` son obligatorios; el resto
toma valor por defecto (`pending`, `null`, `[]`, fecha desconocida). Los valores se conservan tal
como llegan y los errores se acumulan sin lanzar excepciones. Un test (`purity.test.ts`) vigila
que el dominio solo importe rutas relativas. Decisiones cerradas: D-15 a D-20.

---

## [x] 1.3 · Base de datos

**Objetivo.** Esquema en Supabase, migraciones versionadas y políticas de acceso (RLS).

```text
/gentle-sdd-new database-schema

Traduce el modelo de dominio a un esquema de Supabase con migraciones en el repositorio
y políticas RLS que solo permitan acceso a usuarios autenticados de la lista permitida.
```

**Revisar.** Que las migraciones se aplican desde cero y que un usuario anónimo no lee nada.

**Notas:** 2026-10-29 · Cambio SDD `database-schema`, con Strict TDD activo (pgTAP primero, SQL después). La CLI de Supabase entra como `devDependency` con `allowBuilds.supabase` en `pnpm-workspace.yaml` y los scripts `db:start`, `db:stop`, `db:reset` y `test:db`. Dos migraciones en `supabase/migrations/`: `allowlist` (tabla `allowed_emails` con el correo en minúsculas y no vacío, RLS sin políticas, sin privilegios para `anon` ni `authenticated`, y la función `public.is_allowed()` con `security definer` y `search_path` vacío) y `titles` (tabla compartida sin propietario, restricciones espejo de `src/domain`, trigger de `updated_at` con `clock_timestamp()` y cuatro políticas RLS para `authenticated` que llaman a `(select public.is_allowed())`). Las notas son `numeric` sin precisión para no redondear (D-18); el estado y el tipo son `text` con `check`. Sin semilla (`[db.seed] enabled = false`): los correos reales no entran en git y en Supabase alojado se cargan a mano (ver `docs/DECISIONS.md`). Tests pgTAP en `supabase/tests/database/` (`titles_constraints` y `access_control`, 131 comprobaciones), solo en local. Pendiente de los pasos siguientes: clientes `supabase-js` (1.4), columnas de TMDB (1.5) y CI (Fase 2). Decisiones cerradas: D-21 a D-27. Escaneo TS-9.2: sin correos reales ni claves en migraciones, `config.toml` ni documentos; el único correo no ficticio es el marcador `admin@email.com` de un comentario de plantilla de `config.toml`. Verificado con `pnpm db:reset` y `pnpm test:db`.

---

## [x] 1.4 · Acceso solo para vosotros dos

**Objetivo.** Login con Supabase Auth limitado a dos cuentas.

```text
/gentle-sdd-new couple-auth

Implementa el acceso con Supabase Auth (enlace mágico por email) limitado a una lista
permitida de dos cuentas. Cualquier otra cuenta se rechaza. Cada nota se asocia a quien
ha iniciado sesión.
```

**Revisar.** Que un tercer email no entra y que la sesión persiste en el móvil.

**Notas:** 2026-10-30 · Cambio SDD `couple-auth`, con Strict TDD activo (pgTAP, Vitest y Playwright primero). Migración `couple_auth`: columna `allowed_emails.person` (`ignacio`/`maria`, `not null`, `unique`, sin filas), `public.current_person()`, hook `public.before_user_created_hook` (`security invoker`, solo `supabase_auth_admin` con `select` mediante una política propia) y trigger `titles_enforce_score_ownership` (cada persona solo escribe su nota, error `42501`). Aplicación: sin cliente de navegador; Server Actions (`requestMagicLinkAction`, `signOutAction`), Route Handler `/auth/confirm`, `src/proxy.ts` con `getClaims()`, `PersonGate` en `/` y plantilla `supabase/templates/sign-in.html` para `magic_link` y `confirmation`. Mensaje idéntico para cualquier resultado (sin enumerar cuentas). Resultados: 64 comprobaciones pgTAP nuevas (195 en total con las anteriores), 210 tests de Vitest y 7 de Playwright con Mailpit y `pg`. Decisiones D-28 a D-37; pasos manuales en Supabase alojado y reversión en `docs/DECISIONS.md`. Observaciones de ejecución: (1) pgTAP corre como `postgres`, que no es superusuario y no puede hacer `set role supabase_auth_admin` (membresías reservadas); el hook se prueba como propietario y sus privilegios desde el catálogo, y el camino real con `supabase_auth_admin` lo cubre E2E. (2) Un correo rechazado por el hook llega a `signInWithOtp` como `AuthApiError` 403 con `code: "unknown"` y el mensaje del hook; la interfaz no depende de él. (3) `[auth.rate_limit] email_sent = 2` no afecta a Mailpit: se enviaron más de dos correos por dirección y hora en varias ejecuciones. (4) `allowedDevOrigins` hace falta para el desarrollo: sin él Next bloquea `/_next/hmr` desde `127.0.0.1`, aunque los tests pasan. (5) `getClaims()` con la clave simétrica local consulta al servidor de Auth (solo latencia). (6) Reversión (TS-10.11) comprobada en local dentro de `begin; ... rollback;` y confirmada en una base descartable: los datos de `allowed_emails` y `titles` quedan intactos. La importación del paso 1.7 debe correr como `postgres`. `.env.example` con los nombres `SITE_URL`, `MAILPIT_URL` y `SUPABASE_DB_URL` lo añadió la persona a mano (commit `5334984`), porque el agente no puede editar archivos `.env*`. Verificación SDD: PASS con avisos y sin críticos; cambio archivado. Entregado en un único PR con excepción de tamaño aceptada (~2100 líneas añadidas). Pendiente de comprobar a mano en el móvil que la sesión persiste.

---

## [x] 1.5 · Integración con TMDB

**Objetivo.** Buscar títulos en TMDB al añadir y guardar póster, año, reparto y tipo.

```text
/gentle-sdd-new tmdb-integration

Integra TMDB en el servidor: búsqueda de películas y series, y obtención de póster, año,
reparto principal y número de temporadas. La clave nunca llega al cliente. Respeta los
límites de la API y cachea las respuestas.
```

**Revisar.** Que funciona con títulos en español y que hay alternativa manual si TMDB no
encuentra el título.

**Notas:** 2026-10-30 · Cambio SDD `tmdb-integration`, con Strict TDD activo (pgTAP y Vitest primero). Migración `tmdb_fields`: `tmdb_id`, `poster_path` y `seasons_total`, aditivas y nulas, con las mismas reglas que el dominio (D-43). Dominio: `Title` gana `tmdbId`, `posterPath` y `seasonsTotal` (solo series; en una película se rechaza con `not_allowed_for_kind`). Servidor: `src/server/tmdb/` (`env`, `client`, `mappers`, `lookup`, `types`), `posterUrl` en `src/lib/tmdb/`, Server Actions `searchTmdbAction` y `getTmdbDetailsAction` y `images.remotePatterns` para `image.tmdb.org`. Caché con la Data Cache de `fetch` (búsquedas 1 h, detalles 7 días, D-38); un 429 reintenta una vez y el resto de fallos son `unavailable` (D-41). Decisiones D-38 a D-46. Resultados: 28 comprobaciones pgTAP nuevas (`tmdb_fields`) y 222 en total, 324 tests de Vitest (todos con `fetch` simulado, sin red), `typecheck`, `lint` y `build` en verde. Pendiente de la persona: añadir `TMDB_READ_ACCESS_TOKEN=` (solo el nombre) a `.env.example`, el token real a `.env.local` y la variable en Vercel; el agente no puede editar archivos `.env*`. En Supabase alojado hay que aplicar la migración `tmdb_fields`. La interfaz y la alternativa manual cuando TMDB no encuentra el título (`not_found`, `unavailable`) llegan en 1.6, junto con la atribución a TMDB. Abiertas para 1.6: si `(kind, tmdb_id)` debe ser único y si los pósters van `unoptimized`. Entregado en un único PR con excepción de tamaño aceptada (forecast ~850-950 líneas frente al presupuesto de 800).

---

## [x] 1.6 · Gestión de títulos

**Objetivo.** Las pantallas del MVP: añadir, editar, borrar, puntuar y ver listas.
Requiere D.1 y D.2 terminados.

```text
/gentle-sdd-new title-management

Implementa con el sistema de diseño de docs/DESIGN-ROADMAP.md:
- Añadir título buscando en TMDB (o a mano).
- Ficha con las dos notas, la media, el estado, la fecha vista y las observaciones.
- Listas de vistas y pendientes con búsqueda, filtros por estado y orden por nota o fecha.
Comprueba cada pantalla con el MCP de Playwright en escritorio y móvil.
```

**Revisar.** Que en el móvil se puede añadir y puntuar una película en menos de 30 segundos.

**Notas:** 2026-11-01 · Cambio SDD `title-management`, un único cambio y un único PR con excepción de tamaño (decisión de la persona). Las preguntas de producto están resueltas (Engram #823 y #827). Propuesta, specs, diseño y tareas en Engram (#824 a #828); el progreso de apply está en #829.
- **Construido.** Migración `title_search_unique` (`fold_search`, `name_search`, índice único `(kind, tmdb_id)`); dominio (`foldSearch`, `sortTitles`, `todayIso`); `src/server/titles` con repositorio y casos de uso; Server Actions y doble de TMDB para los E2E; componentes de interfaz nuevos; rutas `(catalog)` (`/vistas`, `/pendientes`, `/anadir`, `/titulo/[id]`) con cabecera, búsqueda, filtros y orden por URL; ficha con guardado optimista por campo; `/` redirige a `/vistas`.
- **Commits.** `87a53fd` a `19608d2` (16 commits: lotes A a I, con el de F y G, `53426db`, de trabajo en curso; documentación; remediación de verify en `d957430` y `19608d2`).
- **Pruebas.** Verify final `pass_with_warnings` (#831): 896 tests de Vitest, 61 E2E de Playwright y 244 comprobaciones pgTAP en verde, con lint, typecheck y build limpios; 41/41 requisitos y 99/99 escenarios.
- **Decisiones.** D-58 a D-70 en `docs/DECISIONS.md`.
- **Comprobación visual (2026-11-01).** Con el MCP de Playwright, TMDB real y el build de producción se revisaron `/vistas`, `/pendientes`, `/anadir` y la ficha a 1280 y 390 px, en claro y oscuro (capturas `.impeccable/review/titles-*.png`). Salieron cuatro defectos, corregidos en `f08a02e` y confirmados con el MCP: «Añadir» desalineado 24 px con la tabla en escritorio (el E2E comparaba con el borde de `main`; ahora compara con la tabla), «Quitar nota» desplazado, barra de desplazamiento visible en la fila de filtros y la «×» nativa del buscador en azul. Tests: 896 unitarios y 61 E2E (cifras finales de verify).
- **Cerrado (2026-11-01).** Verify `pass_with_warnings` (#831, 0 CRÍTICO) y archive en Engram (`sdd/title-management/archive-report`, #833). Seguimiento abierto: documentar el token `--animate-stamp` en `DESIGN.md`; diagnósticos de prerender de `next dev` (`Date.now` y `searchParams` fuera de Suspense); falta la tabla formal de evidencia TDD en apply-progress (#829); aserciones de los tests de interfaz acopladas a clases (add-action, score-panel, filter-chip); añadir un script de cobertura; volver a capturar `/pendientes`, la ficha y `/anadir` tras `f08a02e`; `SITE_URL` debe estar en `.env.local` para ejecutar en local.
---

## [x] 1.7 · Importador del Excel

**Objetivo.** Script que carga las 276 filas de la hoja *Pelis* limpiando los datos sucios.

```text
/gentle-sdd-new excel-import

Escribe un importador de la hoja Pelis de "Ignacio y María.xlsx": convierte las fechas de
Excel, trata el texto libre como fecha desconocida, deduce el estado del color de la celda
(los colores que no están en la leyenda se asignan al estado de la leyenda más parecido),
separa las series y sus temporadas del nombre, y enlaza con TMDB cuando la coincidencia sea
clara. Debe ser idempotente y generar un informe de filas dudosas para revisarlas a mano.
```

**Decisiones abiertas.** Ninguna: las observaciones se copian tal cual (D-75).

**Revisar.** El informe de filas dudosas, entero, antes de dar el paso por bueno.

**Notas:** 2026-11-01 · Cambio SDD `excel-import`, con Strict TDD activo. Hecho (fases 1 a 4 del encargo): migración `titles_import_key` (`import_key` nula y única, con `check` de no vacía) y su pgTAP; módulos puros en `src/import/` (`color`, `sheet-date`, `season`, `score`, `tmdb-search`, `match`, `row`, `report` y `purity.test.ts`) con tests unitarios; y el script `scripts/import-excel.ts` (`pnpm import:excel --file <xlsx> [--dry-run]`) que lee solo la hoja `Pelis`, enlaza con TMDB, inserta en una transacción con `on conflict do nothing` y escribe el informe de filas dudosas en `import-reports/` (ignorado por git, igual que cualquier `.xlsx`). Decisiones D-71 a D-80 y reversión en `docs/DECISIONS.md`. Comprobado de extremo a extremo en local con un libro sintético y un token falso de TMDB (todo queda sin enlazar): la primera ejecución inserta 3 y la segunda 0 con 3 existentes. **Pendiente de la persona (fase 5):** confirmar `IMPORT_DB_URL` (antes `SUPABASE_DB_URL`) y `TMDB_READ_ACCESS_TOKEN` en `.env.local`, ejecutar `--dry-run` con el Excel real (276 filas, informe, base intacta), la importación real y una segunda ejecución que inserte 0, y revisar el informe entero. El paso sigue abierto hasta entonces. Un único PR con excepción de tamaño aceptada (previsto ~1030 líneas; real ~2030 sin contar `pnpm-lock.yaml`, aceptado también). Verificación SDD: PASS con avisos (evidencia RED reproducida después; 15 escenarios del script quedan para la fase 5; una fila pendiente con nota no se informaría). Estado al cerrar la sesión del 2026-11-01: `.env.local` ya conecta con el Supabase alojado de desarrollo (pooler), pero ese proyecto no tiene ninguna migración aplicada (`relation "public.titles" does not exist`) y el repo no está enlazado. Decisión de la persona: verificar primero en local y después, como paso aparte, poner a punto el alojado (procedimiento de `docs/DECISIONS.md`, «Configuración manual en Supabase alojado») e importar allí. Seguimiento del 2026-11-02 (fase 6, hecho): (1) el importador lee `IMPORT_DB_URL` y no `SUPABASE_DB_URL` (D-77); (2) `--dry-run` escribe el informe aunque falle la base de datos, con la línea `Existing-keys check skipped` (D-78); (3) las filas de temporadas de una misma serie se fusionan de forma provisional en una sola serie (D-79), con las filas descartadas en la sección `Merged season rows` del informe, de modo que 276 filas dan 269 títulos distintos. Comprobado en local con un libro sintético y un token falso: importación real sin `IMPORT_DB_URL` (código 1 aunque `SUPABASE_DB_URL` exista), dry-run sin ella (código 0, línea de omisión), dry-run con contraseña errónea y con puerto cerrado (informe escrito, código 1, sin secretos) y dos importaciones reales (3 y luego 0 insertados). **Pendiente de la persona:** añadir `IMPORT_DB_URL` a `.env.local` y su nombre (sin valor) a `.env.example` (el agente no puede editar `.env*`) y después las comprobaciones de la fase 5 solo contra la base local. La importación real en el alojado espera al paso 1.8 (D-80). Cobertura (2026-11-02, remedio de `sdd-verify`): la lógica del script se extrajo a `scripts/import-run.ts` (`runImport(argv, deps)` con `fetch`, filas del libro, cliente de Postgres y escritura del informe inyectables; `scripts/import-excel.ts` queda como adaptador fino). Tests unitarios en `scripts/import-run.test.ts` (sin `--file` sale con código 1 sin tocar la base; un error de TMDB en una fila no aborta y la deja sin enlazar en el informe) y de integración en `tests/import/import.integration.test.ts` con `pnpm test:import` contra la base LOCAL (127.0.0.1:54322, filas sintéticas con prefijo propio que se borran al acabar, TMDB falso): dos nombres con el mismo título de TMDB (el segundo no se inserta y se informa), fila editada en la app intacta tras repetir, título borrado que se reinserta y reversión completa ante un fallo de inserción. `access_control.test.sql` acota sus consultas a sus filas de prueba y ya no depende de que `titles` esté vacía. Cierre (2026-11-02): fase 5 completada contra la base local (276 filas → 269 títulos, 133 enlazados con TMDB; la primera importación inserta 269 y la segunda 0; informe revisado y aprobado por la persona). Verificación SDD: PASS con avisos y sin críticos (16/16 requisitos, 65/65 escenarios; `pnpm test` 1034 pruebas, `pnpm test:import` 4/4, `pnpm test:db` 253 pruebas, typecheck y lint en verde); avisos: la comprobación de los nombres de `.env.example` descansa en la atestación de la persona, y las pruebas de integración necesitan la base local y quedan fuera de `pnpm test`. Cambio archivado. La importación en el Supabase alojado sigue pendiente del paso 1.8.

---

## [x] 1.8 · Valoración por temporada

**Objetivo.** Que cada temporada de una serie tenga su propio estado, notas y fecha, para que el importador pueda cargar una fila por temporada sin la fusión provisional de D-79.

```text
/gentle-sdd-new season-ratings

Permite valorar cada temporada de una serie por separado (estado, nota de cada persona y
fecha) y adapta el importador del Excel para cargar una fila por temporada.
```

**Decisiones abiertas.** Modelo de datos (tabla de temporadas o columnas), cómo se calcula la nota de la serie a partir de las temporadas y cómo se muestra en la ficha y las listas. Se preguntan antes de la propuesta.

**Revisar.** Que *The last of us* conserva sus dos temporadas con sus notas y que el informe del importador ya no tiene filas fusionadas.

**Notas:** Paso nuevo del 2026-11-02 (#853). La importación real en el Supabase alojado (2.3) espera a este paso.

2026-11-03 · Cambio SDD `season-ratings`, con Strict TDD activo y un único PR con excepción de tamaño aceptada. Decisiones D-81 a D-87 (D-79 sustituida; D-72 y D-63 enmendadas) en `docs/DECISIONS.md`. **Hecho** (6 commits sin empujar):
- *Datos* (`63f0ef6`): migración `title_seasons` con RLS y nota solo de su dueño, y su pgTAP; sin migración de datos (D-87).
- *Dominio* (`fabfb27`): `Season`, `createSeason`, `nextSeasonNumber` y `titleSummary`, con retroceso a los valores de título para películas y series sin temporadas.
- *Servidor* (`daa2663`, `52d8835`): el repositorio incrusta las temporadas y la vista lleva `summary`; casos de uso `update-season` y `add-season`; el alta de una serie crea la temporada 1; el filtro de listas usa el estado derivado; las Server Actions `updateSeasonFieldAction` y `addSeasonAction`.
- *Importador* (`b09f45e`): una fila por temporada con rangos, duplicados y temporadas emitidas de TMDB; se elimina la fusión de D-79; padre e hijas en una transacción e idempotente (`pnpm test:import`, 13 pruebas).
- *UI* (`29969ff`): resumen de solo lectura, fila plegable por temporada, «Añadir temporada» y listas con valores derivados; E2E del flujo de serie (6 escenarios) y ficha de serie en el recorrido de axe a tres anchos y dos temas.
- *Documentos:* decisiones, arquitectura, `docs/DESIGN-ROADMAP.md` y este registro.

**Pendiente (el paso sigue abierto):** (1) comprobación visual con el MCP de Playwright (ficha y listas, escritorio y móvil); (2) verificación final de SDD; (3) **de la persona:** ejecutar `pnpm import:excel --file <xlsx>` contra la base LOCAL (el agente no puede leer `.env.local`; confirmar antes que `IMPORT_DB_URL` apunta a 127.0.0.1:54322), comprobar que *The last of us* conserva sus dos temporadas con sus notas, que el informe ya no tiene filas fusionadas y que una segunda ejecución no cambia nada. Los E2E vacían la tabla `titles` de la base local (`clearTitles`), así que tras ejecutarlos hay que reimportar.

Cierre (2026-11-03): verificación SDD con PASS con avisos y sin críticos (33/33 requisitos, 48/48 escenarios; `pnpm test` 1208, `pnpm test:db` 295, `pnpm test:import` 13, `pnpm test:e2e` 67, typecheck y lint en verde). El primer `sdd-verify` dio FAIL por un fallo de entorno (un servidor de desarrollo antiguo en el puerto 3000 que Playwright reutilizó), no por código; tras detenerlo, los E2E pasan. Importación real contra la base LOCAL: 276 filas → 269 títulos (252 películas, 17 series) y 33 temporadas, sin series sin temporadas; *The last of us* conserva sus dos temporadas con sus notas (temporada 1 con 9 y 9,9 redondeado a 10 e informado; temporada 2 con 7,5 y 8); el informe no tiene filas fusionadas; una segunda ejecución inserta 0 títulos y 0 temporadas. Seguimiento de la persona: un fallo de red de TMDB dejó un título sin enlazar, y la reejecución solo inserta, así que no lo enlaza. El registro de intentos de gentle-ai necesitó un reinicio auditado aprobado por la persona, porque reparar un fallo de entorno no tiene un candidato de código cambiado. Engram: `sdd/specs/season-ratings` creado y `sdd/specs/excel-import` actualizado (se elimina la fusión provisional); `title-management` no tiene especificación principal (precedente de 1.6). La importación en el Supabase alojado sigue pendiente del paso 2.3 (D-80).

---

# Fase D — Diseño

Va en paralelo a la Fase 1. El detalle de cada paso está en `docs/DESIGN-ROADMAP.md`.

- [x] **D.1 · Dirección visual.** Personalidad, referencias, tipografía y color con `impeccable`.
- [x] **D.2 · Sistema de diseño.** Tokens, componentes base, tema claro y oscuro.
- [ ] **D.3 · Pantallas clave.** Listas, ficha, alta y login sobre el sistema de diseño.
- [ ] **D.4 · Movimiento.** Transiciones y microinteracciones con `animate` y `emil-design-eng`.
- [ ] **D.5 · Pulido.** Accesibilidad, rendimiento, móvil (`mobile-native`) y capturas con Playwright.

D.1 y D.2 tienen que estar terminados antes del paso 1.6.

---

# Fase 2 — Despliegue

Al terminar esta fase la web está publicada y sustituye al Excel.

## [x] 2.1 · Pruebas E2E de humo

```text
/gentle-sdd-new smoke-e2e

Escribe pruebas E2E con Playwright para los recorridos críticos: login, añadir un título,
puntuarlo, marcarlo como pendiente y encontrarlo en la lista. Deben ejecutarse en CI.
```

**Notas:**

2026-11-03 · Cambio SDD `smoke-e2e`, con Strict TDD activo y un único PR con excepción de tamaño aceptada. Decisión D-88 en `docs/DECISIONS.md` (D-27 sustituida en lo de la CI). **Hecho:**
- *E2E:* `tests/e2e/smoke.spec.ts`, un test serial con un `test.step` por etapa (login por Mailpit, añadir «Dune» con el doble de TMDB, puntuar, marcar Pendiente, buscar en `/pendientes`), con recarga para comprobar la persistencia. Proyecto `smoke` en `playwright.config.ts`.
- *CI:* `.github/workflows/ci.yml` con los jobs `checks` y `db-e2e`, pgTAP antes de los E2E y subida de informe y trazas solo si falla.
- *Comprobado en local:* lint, typecheck, `pnpm test` (1208), build, `pnpm test:db` (295, sobre base recién reiniciada) y `pnpm test:e2e` (68, con la cadena nueva). Una aserción errónea provisional en la etapa de añadir hizo fallar el test y se revirtió.

**Pendiente:** (1) la primera ejecución en GitHub confirma los nombres de `-x` y los valores ficticios de la compilación (si la CLI rechaza un nombre, quitarlo); no se pudo validar con `actionlint` (Docker de terceros denegado); (2) **de la persona:** los E2E vacían la tabla `titles` de la base local, así que hay que reimportar; (3) activar la protección de rama exigiendo estos checks queda fuera de alcance.

---

## [x] 2.2 · Puesta en producción

```text
/gentle-sdd-new production-deployment

Despliega en Vercel contra un proyecto de Supabase de producción: variables de entorno,
migraciones, dominio y comprobación con Playwright contra la URL pública.
```

**Notas:**

2026-11-03 · Cambio SDD `production-deployment`, con Strict TDD activo y un único PR con excepción de tamaño aceptada. Decisión D-89 en `docs/DECISIONS.md`; procedimiento en `docs/DEPLOY.md`. **Hecho (repositorio):**
- *Despliegue:* `vercel.json` (solo `main`) y `.github/workflows/deploy-migrations.yml` (entorno `production`, `--dry-run` antes del `db push`, CLI fijado por el lockfile). Test de contrato `scripts/deploy-config.test.ts` (también vigila que `ci.yml` siga sin secretos).
- *Comprobación en producción:* `playwright.prod.config.ts`, `tests/prod/**` (humo, token fuera del bundle, sonda no permitida, guarda de solo lectura), `scripts/prod-login.ts` y `scripts/prod/env.ts`; `pnpm test:prod` y `pnpm test:prod:login`, solo en local.
- *Comprobado:* lint, typecheck, `pnpm test` y `playwright test -c playwright.prod.config.ts --list`. No se ejecutó contra una URL real.

2026-11-03 · **Hecho (persona, runbook de `docs/DEPLOY.md`):** la persona ejecutó los diez pasos y da el paso por cerrado. Publicado en `https://ignacioymaria.vercel.app`. Ignacio entró por enlace mágico (Brevo); Authentication > Users muestra solo su usuario, así que la sonda con un correo no permitido no creó ninguno.
- *Incidencias resueltas:* en el plan gratuito las plantillas de correo no se pueden editar hasta configurar el SMTP propio (el runbook se reordenó); `NEXT_PUBLIC_SUPABASE_URL` con `.com` en vez de `.co` (registro `sendMagicLink failed unknown`, sin entrada en los logs de Auth) y después una clave *publishable* que no era la del proyecto alojado (`401` en `/auth/v1/otp`, visible en API Gateway); Vercel avisa de que una variable `NEXT_PUBLIC_` marcada como sensible debería ser de tipo Config, lo que no afecta porque se leen en el servidor.

**Pendiente (aceptado por la persona):** el primer acceso de María (Authentication > Users = 2) se hará cuando la web esté terminada; si falla, se resolverá entonces.

---

## [x] 2.3 · Importación real y copias de seguridad

**Objetivo.** Cargar el Excel en producción y programar copias de seguridad exportables.

```text
/gentle-sdd-new production-import-and-backups

Carga el Excel en el Supabase de producción con el importador existente (`pnpm import:excel`,
primero con --dry-run) y programa copias de seguridad exportables con GitHub Actions (D-90):
un workflow con `schedule` y `workflow_dispatch`, en el entorno `production`, que ejecuta
`pnpm exec supabase db dump` (roles, esquema y datos con --use-copy) y sube los ficheros como
artifact con retención limitada. Documenta en docs/DEPLOY.md cómo restaurar una copia con
psql en una base local y compruébalo. Antes de decidir la frecuencia, la retención o si el
dump va cifrado, pregunta; confirma también que el repositorio es privado.
```

**Revisar.** Que el número de títulos coincide con el Excel y que una copia se puede
restaurar.

**Notas:** Espera al paso 1.8 (valoración por temporada): el importador se adaptará allí a una fila por temporada antes de cargar el alojado (D-80).

2026-11-03 · El paso nació sin prompt (commit `d6ec5f9`), sin motivo registrado; la decisión pendiente era cómo hacer las copias. Supabase no hace copias en el plan gratuito y recomienda `supabase db dump` guardado fuera; la persona elige un workflow programado de GitHub Actions (D-90). Prompt añadido.

2026-11-03 · Cambio SDD `production-import-and-backups`, con Strict TDD. Hecho (agente): `.github/workflows/backup.yml` (semanal + manual, `production`, volcados de roles, esquema y datos cifrados con `age` a un destinatario público, solo `*.age` subidos, 30 días), tests de contrato en `scripts/deploy-config.test.ts` (guardas probadas contra variantes inseguras) y, en `docs/DEPLOY.md`, el runbook de importación, de copias y de restauración (D-91). **Estado: pendiente de ensayo; el paso sigue abierto.** Pendiente de la persona: U1 confirmar que `.env.example` lista `IMPORT_DB_URL`; U2 tras fusionar, generar el par `age` y guardar la clave pública como `BACKUP_AGE_RECIPIENT` en `production` (la privada, fuera de línea en dos copias); U3 lanzar la copia de base antes de importar; U4 importar en producción una sola vez (`--dry-run`, informe, importación real, recuentos); U5 lanzar la copia posterior y comprobar tres `.age`, 30 días y logs limpios; U6 ensayar la restauración local y responder las tres preguntas abiertas de `docs/DEPLOY.md`; U7 anotar aquí fechas, recuentos y URL de la ejecución. El paso no se cierra sin U6 y U7.

Cierre (2026-11-03): importación real en producción hecha por la persona. El ensayo con `--dry-run` por el *pooler* de sesión dio 269 títulos distintos (6 duplicados omitidos), 133 enlazados con TMDB y 136 sin enlazar (71 con varios candidatos, 54 sin candidato de nombre exacto, 11 con año distinto) y 33 temporadas; la persona aceptó importarlos sin enlazar. La importación real insertó 269 títulos y 33 temporadas. Ensayo de restauración: ejecución de GitHub Actions 41698960287, artifact `db-backup-20261103T185938Z-41698960287` con tres ficheros `.age` (roles 570 B, esquema 14640 B, datos 92482 B); el descifrado con la identidad privada fuera de línea funcionó. Roles: único error `permission denied for parameter log_min_messages`, esperado. Esquema con `ON_ERROR_STOP=1`: sin errores. Datos (bloques `public`, con `session_replication_role = replica`): sin errores y recuentos iguales a producción (269 títulos: 252 películas y 17 series; 33 temporadas; 2 correos permitidos). `pnpm test:db` falla sobre una restauración con datos y pasa 295/295 sobre una sin datos; `data.sql` no incluye `supabase_migrations`; los permisos y privilegios por defecto sobreviven a `drop schema public` (D-92). Descifrados y copia de la identidad borrados; base local restablecida con `pnpm db:reset`. Defecto hallado y corregido: el volcado de datos incluía `auth` y `storage` (`-s public`, D-92, con test de contrato). La persona guardó al principio solo la clave pública `age1...` en vez de la identidad con la línea secreta; documentado en `docs/DEPLOY.md`. Seguimiento pendiente: lanzar una copia nueva ya con `-s public` tras fusionar.

---

# Fase 3 — Funcionalidades divertidas

Cada funcionalidad pasa por su propio ciclo SDD. Al priorizarla, la candidata se convierte en
un paso numerado.

## [~] 3.1 · Vista de tarjetas

**Objetivo.** En la lista, poder alternar entre el listado actual y una cuadrícula de tarjetas.

```text
/gentle-sdd-new card-view

En la lista, permite alternar entre el listado actual y una cuadrícula de tarjetas con la
portada, el título, las notas y la fecha de visualización. Usa las skills de diseño y
compruébalo con el MCP de Playwright, también en móvil. Antes de decidir en qué listas está
disponible, si se recuerda la vista elegida o qué muestra una tarjeta sin portada o sin notas,
pregunta.
```

**Revisar.** Que el cambio de vista no altera la búsqueda ni el orden, que los títulos sin
portada, nota o fecha se ven bien y que la cuadrícula funciona en móvil.

**Notas:** 2026-11-04 · Implementado en el cambio SDD `card-view` (un solo PR con excepción de tamaño). Decisiones de la persona antes de la propuesta: el interruptor está en ambas listas; la vista se recuerda por dispositivo en una sola cookie compartida, sin parámetro de URL; sin portada se escribe el título en tipografía condensada grande dentro de la caja 2:3; sin notas se ve una raya por persona con «Sin nota» solo para lectores de pantalla y la media vacía, como la fila; las observaciones no salen en la tarjeta; el estado va compacto; el año va junto al título; la fecha es la de la tabla (añadida en Pendientes, de visionado o raya en Vistas); la tabla sigue por defecto; las series usan el resumen derivado, sin indicador de temporada.
- **Hecho.** Cookie `list_view` y su lectura y acción (D-93), `ListViewToggle` (D-94), `Poster` con `fallback="title"` (D-95), `TitleCard` y `TitleCardGrid` (D-96), integración en `TitlesList`, E2E (83/83 en `pnpm test:e2e`) y enmienda de `DESIGN.md` (D-99). Sin migraciones y sin cambios en la consulta de la lista.
- **Comprobación visual.** Hecha con el MCP de Playwright a 390 y 1280 px en claro y oscuro, sin correcciones (evidencia y límites en `docs/DESIGN-ROADMAP.md`). Verificación SDD: PASS con avisos y sin críticos; `pnpm test` 1323 pruebas y `pnpm test:e2e` 83 de 83. Avisos: la tecla espacio del interruptor sin prueba propia y la ausencia de parpadeo probada sobre el HTML inicial. **Strict TDD:** U1 (preferencia, lectura y acción), U2 (interruptor) y U4 (tarjeta y cuadrícula) escribieron tests y código juntos, así que no hubo un RED original y el orden real no se puede recuperar; U3 y U5 tampoco conservan un RED verificado. El RED se reprodujo después por mutación (82 mutaciones puntuales de la implementación, una a una, sin tocar tests ni confirmar ninguna): 76 hicieron fallar al menos un test y 6 sobrevivieron. Esto prueba que los tests detectan el comportamiento roto, no el orden en que se escribieron. **Tests débiles, cerrados después:** 5 de los 6 supervivientes se corrigieron solo con tests, sin tocar la aplicación (notas de María e Ignacio por separado en la tarjeta de la lista, con valores distintos para que un intercambio falle; `aria-hidden` en las etiquetas de persona y de Media; cuadrícula sin sombra ni radio; clase `sr-only` en los radios), y cada mutación original ahora hace fallar su test nuevo (`pnpm test`: 1323 pruebas). Queda un único superviviente, la guarda `next === selected` de `ListViewToggle`, que se deja como equivalente: un radio ya marcado no emite `onChange`, así que quitarla no cambia nada observable. Resultado final: 81 de 82 mutaciones detectadas.
- **Pendiente de la persona.** Revisar el paso, que pasa a `[x]` tras esa revisión, y probarlo con carteles reales y en un teléfono. Los E2E vacían la tabla `titles` de la base local, así que hay que reimportar.

---

## Candidatas

Lista sin orden. Se priorizan después del lanzamiento.

- [ ] **¿Qué vemos esta noche?** Ruleta animada entre los pendientes, con filtros por duración o género.
- [ ] **Estadísticas de pareja.** Quién puntúa más duro, en qué películas discrepáis más, géneros favoritos.
- [ ] **Resumen anual.** Un *Wrapped* con lo visto en el año.
- [ ] **Dónde verla.** Plataformas disponibles en España según TMDB.
- [ ] **Cronología.** Vuestra historia en películas, desde *El exorcista*.

---

# Registro de desviaciones

| Fecha | Paso | Qué cambió | Por qué |
|---|---|---|---|
| 2026-10-29 | 0.2 | Strict TDD desactivado temporalmente (la configuración global lo activa) | Aún no hay proyecto ni comando de tests; se repite `sdd-init` tras el paso 1.1 |
| 2026-10-29 | 1.1 | La plantilla de `create-next-app` 16.4 no tiene opción `--turbopack` y activa por defecto `cacheComponents`, `partialPrefetching` y el cargador `@tailwindcss/turbopack` (no genera `postcss.config.mjs`) | Se conservan los valores por defecto de la plantilla oficial |
| 2026-10-29 | 1.1 | Se omite `vite-tsconfig-paths`; Vitest usa `resolve.tsconfigPaths: true` | Vite lo soporta de forma nativa y el plugin avisa de que ya no hace falta |
| 2026-10-29 | 1.1 | `@types/node` subido a `^22` y `typecheck` ejecuta `next typegen` antes de `tsc --noEmit` | La plantilla traía `@types/node` 20; sin `typegen` el tipo global `LayoutProps` no existe en un clon limpio |
| 2026-10-29 | 1.1 | `next dev` regenera `AGENTS.md` en la raíz | Lo escribe Next.js 16.4; no se adopta porque el repositorio usa `CLAUDE.md`. Se ignora en `.gitignore` (`/AGENTS.md`) |
| 2026-10-29 | 1.2 | Strict TDD activado tras repetir `sdd-init` (existe `pnpm test`) | Resuelve la desviación del paso 0.2 |
| 2026-10-29 | 1.3 | El diseño asumía el comportamiento de la CLI sin poder consultarlo: `supabase test db` descubre `supabase/tests/**/*.test.sql` y la clave `[db.seed] enabled` existe, tal como asumía el diseño (Context7 no estaba disponible, se comprobó contra la CLI 2.122.0 y la configuración generada) | Resuelve la pregunta abierta del diseño |
| 2026-10-29 | 1.3 | La comprobación de nombre en blanco usa `name ~ '\S'` en lugar de `btrim(name) <> ''` | `btrim` solo quita espacios y dejaría pasar tabuladores y saltos de línea |
| 2026-10-29 | 1.3 | `seasons_watched` en una película lo rechaza la base de datos, aunque `createTitle` lo ignora | La base de datos es más estricta que el dominio a propósito |
| 2026-10-30 | 1.4 | La especificación «title-storage» del encargo se aplicó sobre `titles-schema` (TS-10) y `access-control` (AC-1 y AC-3), que son las especificaciones principales de 1.3 | No existe una especificación principal con ese nombre |
| 2026-10-30 | 1.4 | No hay cliente de navegador de Supabase (sustituye a D-07) y no existe el parámetro `next` en `/auth/confirm` | Server Actions cubren el login; sin `next` no hay redirección abierta |
| 2026-10-30 | 1.4 | Los textos de la interfaz están en español (el diseño los proponía en inglés) y «Salir» y «Sesión iniciada como …» sustituyen a los textos ingleses de las tareas | La aplicación es `lang="es"`; indicación del encargo de aplicación |
| 2026-10-30 | 1.4 | pgTAP no puede hacer `set role supabase_auth_admin` (`postgres` no es superusuario); el hook se prueba como propietario y los privilegios desde el catálogo | Resuelve la pregunta abierta del diseño; el camino real lo cubre E2E |
| 2026-10-30 | 1.4 | Las redirecciones de `/auth/confirm` y del proxy usan `SITE_URL` en lugar de `request.url`, y `PersonGate` llama a `connection()` antes de leer la sesión | E2E mostró que Next reescribe `127.0.0.1` a `localhost` y que `Date.now()` rompía el prerenderizado en desarrollo; se corrigió en un commit aparte |
| 2026-10-30 | 1.4 | `.env.example` no se actualizó con `SITE_URL`, `MAILPIT_URL` y `SUPABASE_DB_URL`, ni se creó `.env.local` | Los permisos del agente bloquean los archivos `.env*`; los nombres quedan documentados en `docs/DECISIONS.md` y la persona los añadió a mano en el commit `5334984` |
| 2026-10-30 | 1.5 | `unauthorized` es una variante nueva de fallo (`not_found`, `unavailable`, `invalid_input`, `unauthorized`) | La especificación asumía un resultado «unauthorized» existente, pero `getCurrentPerson` devuelve `null` y las acciones de acceso devuelven `SignInState` (D-40) |
| 2026-10-30 | 1.5 | El campo del DTO es `name`, no `title` como decía la especificación | Coincide con la columna y con `Title.name`; 1.6 prerrellena sin reasignar (D-46) |
| 2026-10-30 | 1.5 | Una consulta en blanco devuelve `not_found` sin llamar a TMDB; solo más de 100 caracteres o un valor que no es texto es `invalid_input` | Cumple R-TL-9 y S-TL-17 (D-45) |
| 2026-10-30 | 1.5 | Fase 0 (variable `TMDB_READ_ACCESS_TOKEN` en `.env.example` y `.env.local`) queda a cargo de la persona | Los permisos del agente bloquean los archivos `.env*` |
| 2026-10-30 | 1.5 | Un único PR con excepción de tamaño aceptada; el diff real supera el forecast | Los tests son cerca de la mitad del diff; el usuario aceptó no dividir |
| 2026-10-30 | 1.6 | Se pausó tras la exploración para hacer D.1 y D.2 en la misma sesión; D.2 va como cambio SDD propio `design-system` | La regla 9 exige D.1 y D.2 antes del 1.6; la persona pidió hacerlos ya |
| 2026-10-30 | D.2 | Un único PR con excepción de tamaño para `design-system` | El usuario aceptó no dividir el cambio |
| 2026-10-30 | D.2 | Para `pnpm start` y los E2E, las variables de Supabase se exportan en la shell desde `pnpm exec supabase status -o env` (más `SITE_URL`) | Los agentes no pueden leer `.env.local` y no traía `NEXT_PUBLIC_SUPABASE_*` |
| 2026-11-01 | 1.6 | Un único cambio SDD en lugar de la división en cuatro que se exploró | Decisión de la persona; un único PR con excepción de tamaño |
| 2026-11-01 | 1.6 | Dos reinicios del presupuesto nativo de revisión aprobados por la persona (lotes C a E con 2739 líneas y lote H con 2617) | Los lotes superaban el presupuesto previsto |
| 2026-11-01 | 1.6 | Las capturas de revisión de los E2E son opcionales: solo se escriben en `.impeccable/review` con `REVIEW_CAPTURE=1`; si no, van a `test-results/review` | Evita modificar capturas versionadas en cada ejecución |
| 2026-11-01 | 1.6 | Hay que ejecutar `pnpm db:reset` antes de `pnpm test:db` si se acaban de ejecutar los E2E | Los E2E dejan filas en la lista permitida y la comprobación AC-1.2 de pgTAP espera que esté vacía |
| 2026-11-01 | 1.6 | Una caché `.next` obsoleta provocó un fallo de build (`0xc0000142`) | Se resolvió borrando `.next` y volviendo a compilar; no hay cambio de código |
| 2026-11-01 | 1.6 | `ScoreFigure` acepta `number \| null` | La ficha y las listas muestran títulos sin nota; evita convertir a mano la ausencia |
| 2026-11-01 | 1.6 | TD-6 S3: con fecha desconocida el selector queda vacío y el botón «Hoy» pone la fecha de hoy, en lugar de abrirse con hoy | Decisión del usuario tras verify; la spec se enmendó. Un selector nativo prerrellenado no distingue «sin fecha» de «hoy» |
| 2026-11-01 | 1.6 | Estado inicial según el origen, guardado automático de hoy al pasar a un estado visto y orden «fecha» de Pendientes por `createdAt` | Enmiendas A1 a A3 de la persona (#827); D-68 y D-69 |
| 2026-11-01 | 1.6 | Los E2E usan un doble de TMDB en el servidor; las capturas del MCP usan TMDB real | Enmienda A4; D-70 |
| 2026-11-01 | 1.7 | Un único PR con excepción de tamaño aceptada para `excel-import` | El usuario aceptó no dividir el cambio (~1030 líneas previstas; ~2030 reales, aceptadas al ver el tamaño) |
| 2026-11-01 | 1.7 | `.env.example` ya traía `SUPABASE_DB_URL` y `TMDB_READ_ACCESS_TOKEN` (los añadió la persona en 1.4 y 1.5); no se tocó | Los permisos del agente bloquean los archivos `.env*` |
| 2026-11-01 | 1.7 | Nueva razón de informe `invalid` (filas que `createTitle` rechaza tras limpiar) y `pnpm-workspace.yaml` marca `esbuild: true` en `allowBuilds` | Ninguna fila se pierde sin aparecer en el informe; `tsx` depende de `esbuild` y pnpm exige decidirlo |
| 2026-11-01 | 1.7 | La evidencia RED de Strict TDD del paso 1.7 no se registró en su momento y se reprodujo después en un worktree aislado (implementación sustituida por stubs) | `sdd-verify` la marcó como crítica; evidencia en `sdd/excel-import/apply-progress` |
| 2026-11-02 | 1.7 | Seguimiento de `excel-import` (fase 6): `IMPORT_DB_URL` sustituye a `SUPABASE_DB_URL` en el importador, `--dry-run` resiste fallos de base de datos y las temporadas de una misma serie se fusionan de forma provisional | Hallazgos de la persona al probar con el alojado (#853); D-77 a D-80 |
| 2026-11-02 | 1.7 | Nuevo paso 1.8 «Valoración por temporada» antes de la importación real (2.3), que espera a este paso | La base solo guarda una nota por persona y título (D-80). La numeración 1.8 es del agente: la persona puede reubicarlo |
| 2026-11-02 | 1.7 | (Sustituida por la fila siguiente.) No se extrajo un helper de resultado de ejecución del script: la lógica testeable nueva está en `env.ts` y `db-error.ts`, y el pegamento del script se comprobó con ejecuciones locales (libro sintético, token falso) | Lo que queda son unas diez líneas de try/catch sin reglas propias |
| 2026-11-02 | 1.7 | Se extrajo la costura `runImport(argv, deps)` a `scripts/import-run.ts` y se añadió `pnpm test:import` (integración contra la base local, fuera de `pnpm test`); `vitest.config.mts` incluye también `scripts/**/*.test.ts` | `sdd-verify` dejó 7 escenarios sin test automático; el fallo de inserción se simula con un envoltorio del cliente que ejecuta un `insert` real con `null` en un campo obligatorio dentro de la misma transacción |
| 2026-11-03 | 1.8 | Un único PR con excepción de tamaño aceptada para `season-ratings` (previsto ~1600 a 2150 líneas; real unas 4400 añadidas y 520 borradas en 74 archivos, tests y documentos incluidos), entregado en cuatro bloques de trabajo con commits propios | El usuario aceptó no dividir el cambio (`delivery_strategy` `exception-ok`, presupuesto de revisión de 800 líneas superado) |
| 2026-11-03 | 1.8 | Cambios de comportamiento hallados por los bloques: la marca `t2` sola ya no emite aviso; `deleteTitle` y `updateTitleField` hacen una lectura previa extra (`findById`) para devolver el estado derivado y rechazar los campos derivados de una serie con temporadas | Consecuencia de D-82 y D-84; los tests que afirmaban «sin lectura previa» se ajustaron |
| 2026-11-03 | 1.8 | La prueba de integración del importador (2.5) se escribió antes que su implementación (2.6) pero no se ejecutó en rojo, y los tests de informe y de fila se editaron junto al código | La cadena de typecheck estaba rota entre medias; la cobertura quedó completa (13 pruebas de integración) pero la evidencia RED de ese par no es estricta |
| 2026-11-03 | 1.8 | Los E2E de la serie se escribieron después de los componentes (no en rojo) | Los componentes ya tenían pruebas unitarias en rojo primero; los E2E validan el flujo completo y se añadieron al cerrar el bloque de UI |
| 2026-11-03 | 1.8 | Ficheros nuevos de UI en kebab-case (`series-summary.tsx`, `season-row.tsx`, `add-season-button.tsx`) en lugar de los PascalCase del diseño | Convención de archivos del repositorio (D-52) |
| 2026-11-03 | 1.8 | Un primer `sdd-verify` dio FAIL en `pnpm test:e2e` por un servidor de desarrollo antiguo en el puerto 3000 que Playwright reutilizó | Fallo de entorno, no de código: tras detener ese proceso, `pnpm test:e2e` pasa 67/67 y el veredicto final es PASS con avisos |
| 2026-11-03 | 1.8 | Reinicio auditado del registro de intentos de gentle-ai para la compuerta de archivo | Aprobado por la persona: la reparación de un fallo de entorno no tiene un candidato de código cambiado |
| 2026-11-03 | 2.1 | La cadena de proyectos de Playwright cambia a `auth -> smoke -> ui -> titles` (`ui` depende ahora de `smoke`); `--project=ui` y `--project=titles` también ejecutan `smoke` | Con `fullyParallel`, `smoke` en paralelo chocaría con `titles` y con el buzón de Mailpit (D-88) |
| 2026-11-03 | 2.2 | El CLI de Supabase en `deploy-migrations.yml` se fija con el lockfile (`pnpm exec supabase`) en vez de `supabase/setup-cli` con `version:`, como proponía la propuesta | Una sola fijación y el mismo CLI que en local y en `ci.yml` (D-89) |
| 2026-11-03 | 2.2 | En `docs/DEPLOY.md`, el SMTP (Brevo) pasa a configurarse antes que las plantillas de correo | En el plan gratuito, Supabase no deja editar las plantillas con el proveedor de correo por defecto; con SMTP propio sí |
| 2026-11-03 | 2.2 | El paso se cierra sin el primer acceso de María (Authentication > Users = 1 en lugar de 2) | Decisión de la persona: María no usará la web hasta que esté terminada |
| 2026-11-03 | 2.3 | Se añade el prompt que faltaba; las copias de seguridad serán un `supabase db dump` programado en GitHub Actions (D-90) | El plan gratuito de Supabase no tiene copias; era la decisión abierta que dejaba el paso sin prompt |
| 2026-11-03 | 2.3 | La restauración usa tres ejecuciones de `psql` vía `docker exec` en lugar de `--single-transaction` (D-90); los volcados van cifrados con `age` porque el repositorio es público (D-91) | El paso de roles debe tolerar roles ya existentes y no puede ser atómico; los artifacts de un repositorio público son legibles |
| 2026-11-03 | 2.3 | El volcado de datos se limita al esquema `public` (`-s public`); D-91 decía que `auth` quedaba fuera y no era cierto | El ensayo de restauración mostró que `supabase db dump --data-only` (CLI 2.122.0) incluía los datos de `auth.*` y `storage.*`; cifrados, sin exposición (D-92) |
| 2026-11-03 | 2.3 | Los comandos de restauración de `docs/DEPLOY.md` se ejecutan en Git Bash; `pnpm test:db` corre sobre una restauración sin datos | PowerShell no admite la redirección `<`; los tests de pgTAP suponen `allowed_emails` vacía (D-92) |
| 2026-11-04 | 3.1 | La candidata «Vista de tarjetas» pasa a ser el paso 3.1 y la lista de candidatas queda en su propia sección | La persona la prioriza como primera funcionalidad de la fase 3 |
| 2026-11-04 | 3.1 | El interruptor de vista usa radios nativos con el aspecto del selector de tema y no `FilterChip` ni el token `filter-chip-selected` | `aria-pressed` describe mal una elección excluyente y el token invierte el fondo, contra la regla de una sola inversión (D-94) |
| 2026-11-04 | 3.1 | `DESIGN.md` se enmienda para permitir la vista de tarjetas como alternativa a la tabla | El documento la prohibía expresamente; la persona decidió permitirla antes de la propuesta (D-99) |
| 2026-11-04 | 3.1 | La ausencia de parpadeo se comprueba sobre la respuesta HTTP cruda y no con JavaScript desactivado | Con Partial Prerender el contenido de la lista llega en streaming y, sin JavaScript, el navegador no lo muestra; el HTML ya trae la cuadrícula y no una tabla |
| 2026-11-04 | 3.1 | Un solo PR de unas 1550 líneas (+1521, -26 al verificar) con excepción de tamaño | Aceptado por la persona (`size:exception`); más de la mitad son tests y documentación |
