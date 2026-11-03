# Arquitectura

Dominio puro en el centro; solo el código de servidor habla con servicios externos. Fuente de verdad del plan: `docs/ROADMAP.md`.

## Capas y reglas de dependencia

Las dependencias apuntan hacia dentro. Estas reglas son vinculantes.

| Capa | Contiene | Puede importar | No puede |
|---|---|---|---|
| Dominio | Tipos y reglas puras (notas, media, estados) | Nada externo | Next.js, React, Supabase, TMDB, E/S |
| Servidor | Casos de uso, acceso a datos, clientes de Supabase y TMDB | Dominio | Código de UI |
| UI | Páginas y componentes | Dominio (tipos y constantes de datos); Servidor mediante los mecanismos de Next.js | Funciones del dominio, clientes de servidor, claves secretas |

La UI puede importar del dominio tipos y constantes de datos (p. ej., etiquetas como `WATCH_STATE_LABELS`), nunca funciones (D-53). Lo que necesita una función del dominio, como construir una nota con `parseScore` o calcular una media con `averageScore`, se hace en el servidor y llega ya resuelto a la UI.

El dominio se prueba con Vitest sin simular servicios. La regla "nada externo" la vigila `src/domain/purity.test.ts`, que falla si algún módulo del dominio importa una ruta no relativa.

## Quién puede llamar a servicios externos

Regla: solo el código de servidor llama a servicios externos. Ningún código de cliente llama a TMDB ni lee o escribe tablas de Supabase directamente.

| Servicio | Navegador | Código de servidor | Dominio |
|---|---|---|---|
| Supabase Auth (enlace mágico, sesión) | No | Sí, con la clave publicable | No |
| Supabase datos (lecturas y escrituras) | No | Sí, bajo RLS | No |
| TMDB | No | Sí, con la clave solo de servidor y con caché | No |

Excepción: el script local `scripts/import-excel.ts` (paso 1.7, D-71) habla por sí mismo con TMDB y con Postgres. No es código de la aplicación ni se despliega.

## Supabase

- El navegador nunca habla con Supabase: no hay cliente de navegador (D-28). Auth y datos pasan por el código de servidor; la clave publicable solo se lee en el servidor.
- Toda lectura o escritura de datos pasa por el código de servidor.
- RLS limita el acceso a usuarios autenticados de la lista permitida.
- Las migraciones están versionadas en el repositorio (paso 1.3). `pnpm db:start` levanta el stack local con Docker, `pnpm db:reset` reaplica todas las migraciones desde cero y `pnpm test:db` ejecuta los tests pgTAP.
- La lista permitida vive en `allowed_emails`, sin acceso para los roles de cliente; las políticas de `titles` llaman a `public.is_allowed()` (D-21). `anon` no tiene privilegios en ninguna tabla.
- Clientes (paso 1.4): `src/lib/supabase/server.ts` crea el cliente de servidor con las cookies de la petición y `src/lib/supabase/proxy.ts` (`updateSession`) lo usa desde `src/proxy.ts`, que refresca la sesión y redirige a `/login` toda ruta salvo `/login` y `/auth/*`. La sesión se valida con `getClaims()`, nunca con `getSession()`. Con la clave simétrica (HS256) del stack local `getClaims()` consulta al servidor de Auth en vez de verificar en local: solo cambia la latencia, no la seguridad.
- Flujo de acceso: Server Action `requestMagicLinkAction` -> `sendMagicLink` -> hook `before_user_created` (rechaza correos ajenos antes de crear usuario) -> correo -> `GET /auth/confirm` (`verifyOtp`) -> cookies -> `/`. `PersonGate` en `/` resuelve la persona con `current_person()` y manda a `/login` a una sesión sin persona.
- `titles_enforce_score_ownership` impide que una persona escriba la nota de la otra. La importación del Excel (paso 1.7) debe ejecutarse como `postgres`, que el trigger no restringe.
- Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SITE_URL` (solo servidor); en E2E, `MAILPIT_URL` y `SUPABASE_DB_URL`.

## TMDB

- La clave y las llamadas viven solo en el servidor; la clave nunca llega al paquete del cliente.
- Se respetan los límites de la API y se cachean las respuestas.
- Si TMDB no encuentra el título, hay alternativa manual (paso 1.5).
- Módulo `src/server/tmdb/` (paso 1.5, `server-only`): `env.ts` (único lugar que lee `TMDB_READ_ACCESS_TOKEN`, D-42), `client.ts` (cliente inyectable con `fetch`, cabecera Bearer, reintento acotado de 429 y tiempo máximo de 5 s, D-39 y D-41), `mappers.ts` (JSON de TMDB a DTO, puro), `lookup.ts` (casos de uso `searchTmdb` y `getTmdbDetails`: identidad, validación, token y TMDB, en ese orden, D-45) y `types.ts`.
- Flujo: Server Action (`src/app/_actions/tmdb.ts`, envoltorio fino) -> `lookup` -> `client` -> API v3 de TMDB (`es-ES`) -> `mappers` -> `Result<DTO, TmdbFailure>`. Nada lanza (D-20); los fallos son `not_found`, `unavailable`, `invalid_input` y `unauthorized` (D-40).
- Caché: la Data Cache de `fetch` con `next: { revalidate }` (búsquedas 1 h, detalles 7 días, D-38). Persiste entre despliegues, solo guarda respuestas 200 y el token forma parte de la clave.
- Pósters: solo se guarda `poster_path`. `posterUrl` (`src/lib/tmdb/poster-url.ts`, segura para el cliente) construye la URL `w342` al renderizar, y `next.config.ts` solo admite `https://image.tmdb.org/t/p/w342/**` (D-44).

## Sistema de diseño y tema

- Tokens (paso D.2): `src/lib/design/tokens.ts` es la única fuente de los colores claros y oscuros y de los pares de contraste; `globals.css` los replica y un test de sincronización exige que coincidan (D-47 y D-48). `contrast.ts` calcula las proporciones de contraste.
- Componentes: `src/components/ui/` contiene componentes de presentación, sin datos ni llamadas al servidor. Archivos en kebab-case y exportaciones en PascalCase (D-52); solo `ThemeToggle` es componente de cliente.
- Tema: `src/lib/theme/preference.ts` define los valores (`system`, `light`, `dark`) y su lectura segura; `src/server/theme/read-preference.ts` lee la cookie `theme` en el servidor y `src/app/_actions/theme.ts` (`setThemeAction`) la escribe. `RootLayout` envuelve `ThemedDocument` en `Suspense` para pintar `data-theme` desde el servidor (D-50 y D-51).
- `/sistema`: muestrario vivo del sistema, protegido por sesión como el resto de rutas. Sus datos de muestra salen de `src/server/specimen/sample.ts` (`server-only`), que construye notas y medias con funciones del dominio (D-53).

## Gestión de títulos (paso 1.6)

- Dominio (puro): `search.ts` (`foldSearch`, `escapeLike`), `title-order.ts` (`sortTitles`) y `today.ts` (`todayIso`, día de Europe/Madrid); todos exportados desde `@/domain`.
- Servidor, `src/server/titles/` (`server-only`): `types`, `row` y `mapper` (fila a `TitleRecord`), `errors` (códigos de PostgREST a `TitleFailure`, D-61), `repository` (cliente de sesión, lista de columnas explícita) y los casos de uso `create`, `update-field`, `get`, `list`, `delete` y `add-candidates`. Orden en cada uno: identidad, validación y base de datos; nada lanza (D-20). `src/server/auth/current-person.ts` va envuelto en `cache()` (D-66).
- Server Actions, `src/app/_actions/titles.ts`: envoltorios finos (`updateTitleFieldAction`, `addFromTmdbAction`, `addManualAction`, `deleteTitleAction`, `searchAddCandidatesAction`). `addFromTmdbAction` vuelve a pedir los detalles a TMDB en el servidor y no confía en los campos del cliente.
- `src/lib/titles/`: funciones puras y seguras para el cliente: `list-params`, `add-origin` y `format-date`.
- Rutas, `src/app/(catalog)/` (D-65): `layout.tsx` (guarda de sesión tras `connection()`), `app-header.tsx`, `vistas/` y `pendientes/` (con `titles-list.tsx` compartido y la isla `list-controls.tsx` para búsqueda, filtros y orden por URL), `anadir/` (`add-form.tsx`) y `titulo/[id]/` (ficha con islas de nota, estado, fecha, observaciones y borrado sobre `use-field-save.ts`).
- Componentes nuevos de `src/components/ui/`: `ScorePanel`, `StatePicker` y `ConfirmDialog`; `FilterChip`, `SortControl` y `AddAction` se amplían (D-67).
- Doble de TMDB: `src/server/tmdb/test-double.ts`, conectado en `client.ts` y `lookup.ts` y activo solo con `TMDB_TEST_DOUBLE=1` fuera de producción (D-70).
- Búsqueda y unicidad en la base de datos (D-59 y D-60): `fold_search`, `name_search` e índice único parcial `(kind, tmdb_id)`.
- Flujo de escritura: isla -> Server Action -> caso de uso (persona, validación) -> repositorio -> Supabase (RLS y trigger de notas) -> `Result<TitleView, TitleFailure>` -> isla (confirma o revierte). Flujo de lectura: página RSC -> `parseListParams` -> `list` -> `sortTitles` -> `CriticsTable`.

## Valoración por temporada (paso 1.8)

- Datos: la tabla `title_seasons` (D-81) cuelga de `titles` (solo series, clave `(title_id, season_number)`, borrado en cascada). `TITLE_SELECT` del repositorio incrusta las temporadas con PostgREST (`title_seasons(SEASON_COLUMNS)`), así que una lectura trae título y temporadas; el repositorio gana `insertSeason` y `updateSeason`.
- Dominio (puro): `season.ts` (`Season`, `createSeason`, `nextSeasonNumber`) y `summary.ts` (`titleSummary`, D-82); `Series.seasons` en `title.ts`; `titleAverage` y `sortTitles` delegan en el resumen. Toda lectura de estado, fecha y notas de una serie pasa por `titleSummary`.
- Servidor: `toView` (`shared.ts`) calcula `TitleView.summary` y `average` en el servidor, de modo que la UI nunca deriva nada (D-53). Casos de uso nuevos `update-season.ts` y `add-season.ts`; `update-field.ts` rechaza (`derived_for_series`) editar a nivel de título lo que se deriva; `create.ts` inserta la temporada 1 de una serie nueva; `list.ts` prefiltra en SQL y filtra las series por estado derivado (D-83); `delete.ts` devuelve el estado derivado para redirigir a la lista correcta.
- Server Actions: `updateSeasonFieldAction(id, número, parche)` y `addSeasonAction(id)`, ambas `Result<TitleView, TitleFailure>`.
- UI, `src/app/(catalog)/titulo/[id]/`: `FichaEditor` recibe `series` solo para series. Con temporadas pinta `SeriesSummary` (resumen de solo lectura), una `SeasonRow` plegable por temporada y `AddSeasonButton`; sin temporadas conserva los editores de título hasta añadir la primera. Las islas de estado, fecha y nota reciben una prop `save`, así que sirven igual para el título y para una temporada. `titles-list.tsx` pinta estado, fecha, notas y media desde `row.summary`.
- Importador: `src/import/season.ts` (marca a lista de temporadas), `group.ts` (agrupa por serie y resuelve duplicados) y `aired.ts` (temporadas emitidas con TMDB); `writeAll` inserta padre e hijas en una transacción (D-85). `merge.ts` ya no existe.
- Flujo de escritura de una temporada: `SeasonRow` -> `useFieldSave` -> `updateSeasonFieldAction` -> `updateSeasonField` (persona, validación) -> repositorio (RLS y disparador de notas de `title_seasons`) -> `findById` -> `toView` -> la fila y el resumen adoptan la respuesta.

## Importador del Excel (paso 1.7)

`scripts/import-excel.ts` es la raíz de composición del importador (adaptador fino; el flujo completo está en `scripts/import-run.ts`, `runImport(argv, deps)`, con las dependencias externas inyectables para los tests): lee el libro con `exceljs`, consulta TMDB con su propio `fetch` y escribe en Postgres con `pg` y `IMPORT_DB_URL` (excepción a D-42 en D-71; la variable de base de datos la sustituye D-77 y `SUPABASE_DB_URL` no se lee). Es un script local, fuera de `src/`; no se despliega ni lo importa la aplicación. Toda la lógica de reglas está en `src/import/`, que son módulos puros: importan solo rutas relativas y pueden usar el dominio, pero nunca `src/server` ni `server-only` (lo vigila `src/import/purity.test.ts`). La única pieza de `src/server/tmdb` que usa el script es `mapDetails` con sus tipos, también puros.

Flujo: hoja `Pelis` -> `RawRow[]` -> `prepareRow` -> `groupSeasons` (una fila por temporada, duplicados, D-85; sustituye a la fusión de D-79) -> `search/multi` -> `decideMatch` -> detalles -> `planSeasons` (temporadas emitidas) -> `buildImportRow` (pasa por `createTitle`) -> una transacción de solo inserción (padre e hijas) -> informe en `import-reports/`.

## Integración continua (paso 2.1)

`.github/workflows/ci.yml` corre en cada `pull_request` y en cada `push` a `main`, sin secretos (D-88). Dos jobs en paralelo: `checks` (lint, typecheck, Vitest y build) y `db-e2e` (Supabase local, `pnpm test:db` y después los E2E con Chromium). El servidor de los E2E usa el doble de TMDB (`TMDB_TEST_DOUBLE=1`), así que no sale ninguna petición a TMDB.

Los proyectos de Playwright se encadenan `auth -> smoke -> ui -> titles`: `smoke` (`tests/e2e/smoke.spec.ts`) es el recorrido crítico y es dueño de la tabla `titles` y del buzón mientras corre. Seleccionar `ui` o `titles` ejecuta también `auth` y `smoke`.

## Despliegue y comprobación en producción (paso 2.2)

Vercel despliega solo `main` (`vercel.json`). `.github/workflows/deploy-migrations.yml` aplica las migraciones al Supabase alojado con el CLI fijado por el lockfile, en el entorno `production` de GitHub (los únicos secretos del repositorio viven ahí; `ci.yml` sigue sin ninguno, D-88 y D-89). Vercel y las migraciones corren en paralelo: las migraciones son aditivas.

`.github/workflows/backup.yml` (paso 2.3, D-91) hace cada semana, o a mano, tres volcados del Supabase alojado con el mismo CLI fijado por el lockfile, los cifra con `age` a una clave pública y sube solo los `.age` como artifact (30 días). Usa el entorno `production`, permisos de solo lectura y su propio grupo de concurrencia. La clave privada nunca está en GitHub. Procedimiento de restauración: `docs/DEPLOY.md`.

La comprobación en producción es una capa local aparte: `playwright.prod.config.ts` (sin `webServer` ni `globalSetup`) ejecuta solo `tests/prod/**` contra `PROD_BASE_URL`, con una sesión guardada en `playwright/.auth/prod.json` y una guarda que aborta cualquier petición que no sea GET fuera de las ventanas permitidas. No entra en `pnpm test` ni en CI. Procedimiento: `docs/DEPLOY.md`.

## Secretos

- Las claves secretas solo existen en el entorno del servidor y nunca se exponen al cliente (p. ej., no usar el prefijo `NEXT_PUBLIC_` para ellas).
- `.env.local` se ignora en git y `.env.example` solo contiene nombres de variables (paso 0.3).

## Mapa de carpetas

Estructura creada en el paso 1.1. Las reglas de dependencia de arriba la gobiernan.

| Ruta | Contenido |
|---|---|
| `src/app/` | Rutas y UI (App Router) |
| `src/domain/` | Dominio puro: `result`, `score`, `average`, `watch-state`, `watch-date`, `title`, `season`, `summary` e `index.ts` (barrel, se importa como `@/domain`) |
| `src/server/` | Servidor e integraciones |
| `src/lib/supabase/` | Cliente de servidor, helper del proxy, variables de entorno y rutas públicas (sin cliente de navegador) |
| `src/server/auth/` | Casos de uso de acceso: `sendMagicLink`, `signOut`, `getCurrentPerson` y `scoreColumnFor` |
| `src/server/tmdb/` | Integración con TMDB: `env`, `client`, `mappers`, `lookup` y `types` (paso 1.5) |
| `src/lib/tmdb/` | `posterUrl`: construye la URL del póster; pura y segura para el cliente |
| `src/app/_actions/` | Server Actions de la interfaz (`requestMagicLinkAction`, `signOutAction`, `searchTmdbAction`, `getTmdbDetailsAction`, `setThemeAction`) y `titles.ts` (paso 1.6), envoltorios finos |
| `src/server/titles/` | Repositorio y casos de uso de títulos (paso 1.6) |
| `src/lib/titles/` | Parámetros de lista, origen de «Añadir» y formato de fecha; puro y seguro para el cliente |
| `src/app/(catalog)/` | Rutas con sesión: `/vistas`, `/pendientes`, `/anadir`, `/titulo/[id]` y su cabecera |
| `src/app/sistema/` | Muestrario del sistema de diseño (`/sistema`, paso D.2) |
| `src/components/ui/` | Componentes de presentación del sistema de diseño (paso D.2): `Button`, `TextField`, `StateCell`, `ScoreFigure`, `AverageBox`, `FilterChip`, `SortControl`, `CriticsTable`, `Masthead`, `ThemeToggle` y `AddAction`, más `cx` e `icons` |
| `src/lib/design/` | Tokens de color (`tokens.ts`, fuente única) y cálculo de contraste (`contrast.ts`) |
| `src/lib/theme/` | Preferencia de tema: valores admitidos y lectura segura |
| `src/server/theme/` | Lectura de la cookie `theme` en el servidor |
| `src/server/specimen/` | Datos de muestra de `/sistema` (`server-only`) |
| `src/test/` | Ayudantes de tests unitarios (`axe.ts` con `expectNoAxeViolations`, `score.ts`) |
| `src/import/` | Reglas puras del importador del Excel (paso 1.7): `color`, `sheet-date`, `season`, `group`, `aired`, `score`, `tmdb-search`, `match`, `row`, `env`, `db-error`, `report` y `types` |
| `scripts/` | Scripts locales: `import-excel.ts` (`pnpm import:excel`), con acceso a TMDB y a Postgres; fuera de la aplicación |
| `src/proxy.ts` | Proxy de Next.js: refresca la sesión y protege las rutas |
| `supabase/migrations/` | Migraciones versionadas: `allowlist` y `titles` (paso 1.3) y `couple_auth` (paso 1.4: `person`, `current_person()`, hook de registro y trigger de notas) y `tmdb_fields` (paso 1.5: `tmdb_id`, `poster_path` y `seasons_total`), `title_search_unique` (paso 1.6: `fold_search`, `name_search` e índice único) `titles_import_key` (paso 1.7: `import_key`) y `title_seasons` (paso 1.8: tabla de temporadas) |
| `supabase/templates/` | Plantilla del correo de acceso (`sign-in.html`) |
| `supabase/tests/database/` | Tests pgTAP (`pnpm test:db`): `titles_constraints`, `access_control`, `couple_auth`, `tmdb_fields`, `title_search_unique`, `titles_import_key` y `title_seasons`; solo en local |
| `supabase/config.toml` | Configuración de la CLI de Supabase (proyecto `ignacioymaria`, sin semilla) |
| `tests/e2e/` | Pruebas E2E (Playwright): `auth.spec.ts` con ayudantes de Mailpit y `pg`, `design-system.spec.ts` (`/sistema` en ambos temas y anchos) `titles.spec.ts` con `titles-db.ts` (gestión de títulos con el doble de TMDB) y `session.ts` (ayudantes de sesión compartidos); `globalSetup` inserta las dos cuentas de prueba |
| `vitest.config.mts` | Configuración de Vitest (jsdom, solo `src/**/*.test.{ts,tsx}`) |
| `playwright.config.ts` | Configuración de Playwright (chromium, arranca `pnpm dev`; proyecto `auth` antes que `ui`, D-57) |

Los tests unitarios viven junto al código (`*.test.ts(x)`). `src/server/index.ts` importa `server-only`: si un componente cliente importa código de `src/server`, el build falla.

## Abierto

Nada de esto está decidido. No se adelanta en ningún documento.

| Tema | Se decide en |
|---|---|
| Mecanismo de caché de TMDB | Paso 1.5 |

Ver también `docs/DECISIONS.md`.
