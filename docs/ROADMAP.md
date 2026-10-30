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

## [ ] 1.5 · Integración con TMDB

**Objetivo.** Buscar títulos en TMDB al añadir y guardar póster, año, reparto y tipo.

```text
/gentle-sdd-new tmdb-integration

Integra TMDB en el servidor: búsqueda de películas y series, y obtención de póster, año,
reparto principal y número de temporadas. La clave nunca llega al cliente. Respeta los
límites de la API y cachea las respuestas.
```

**Revisar.** Que funciona con títulos en español y que hay alternativa manual si TMDB no
encuentra el título.

**Notas:**

---

## [ ] 1.6 · Gestión de títulos

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

**Notas:**

---

## [ ] 1.7 · Importador del Excel

**Objetivo.** Script que carga las 276 filas de la hoja *Pelis* limpiando los datos sucios.

```text
/gentle-sdd-new excel-import

Escribe un importador de la hoja Pelis de "Ignacio y María.xlsx": convierte las fechas de
Excel, trata el texto libre como fecha desconocida, deduce el estado del color de la celda
(los colores que no están en la leyenda se asignan al estado de la leyenda más parecido),
separa las series y sus temporadas del nombre, y enlaza con TMDB cuando la coincidencia sea
clara. Debe ser idempotente y generar un informe de filas dudosas para revisarlas a mano.
```

**Decisiones abiertas.**
- Qué hacer con las observaciones que no son notas de la película.

**Revisar.** El informe de filas dudosas, entero, antes de dar el paso por bueno.

**Notas:**

---

# Fase D — Diseño

Va en paralelo a la Fase 1. El detalle de cada paso está en `docs/DESIGN-ROADMAP.md`.

- [ ] **D.1 · Dirección visual.** Personalidad, referencias, tipografía y color con `impeccable`.
- [ ] **D.2 · Sistema de diseño.** Tokens, componentes base, tema claro y oscuro.
- [ ] **D.3 · Pantallas clave.** Listas, ficha, alta y login sobre el sistema de diseño.
- [ ] **D.4 · Movimiento.** Transiciones y microinteracciones con `animate` y `emil-design-eng`.
- [ ] **D.5 · Pulido.** Accesibilidad, rendimiento, móvil (`mobile-native`) y capturas con Playwright.

D.1 y D.2 tienen que estar terminados antes del paso 1.6.

---

# Fase 2 — Despliegue

Al terminar esta fase la web está publicada y sustituye al Excel.

## [ ] 2.1 · Pruebas E2E de humo

```text
/gentle-sdd-new smoke-e2e

Escribe pruebas E2E con Playwright para los recorridos críticos: login, añadir un título,
puntuarlo, marcarlo como pendiente y encontrarlo en la lista. Deben ejecutarse en CI.
```

**Notas:**

---

## [ ] 2.2 · Puesta en producción

```text
/gentle-sdd-new production-deployment

Despliega en Vercel contra un proyecto de Supabase de producción: variables de entorno,
migraciones, dominio y comprobación con Playwright contra la URL pública.
```

**Notas:**

---

## [ ] 2.3 · Importación real y copias de seguridad

**Objetivo.** Cargar el Excel en producción y programar copias de seguridad exportables.

**Revisar.** Que el número de títulos coincide con el Excel y que una copia se puede
restaurar.

**Notas:**

---

# Fase 3 — Funcionalidades divertidas

Lista de candidatas sin orden. Se priorizan después del lanzamiento y cada una pasa por su
propio ciclo SDD.

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
