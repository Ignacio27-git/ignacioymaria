# Decisiones

Registro ligero de las decisiones ya tomadas y de las que siguen abiertas. Fuente: `docs/ROADMAP.md` y confirmación del usuario.

**Cómo añadir una decisión.** Añadir una fila a la tabla con el siguiente ID (`D-NN`), la decisión, el motivo y la fecha (AAAA-MM-DD). Si una decisión sustituye a otra, indicarlo en el motivo.

## Tomadas

| ID | Decisión | Motivo | Fecha |
|---|---|---|---|
| D-01 | Alcance: solo películas y series | La web sustituye la hoja *Pelis*; Restaurantes, Juegos de Mesa y Libros quedan fuera (ROADMAP, Contexto) | 2026-10-29 |
| D-02 | Next.js (App Router) con TypeScript estricto | Stack definido en el ROADMAP (Contexto y paso 1.1) | 2026-10-29 |
| D-03 | Supabase (Postgres y Auth), RLS y migraciones en el repositorio | Stack del ROADMAP y pasos 1.3 y 1.4 | 2026-10-29 |
| D-04 | Despliegue en Vercel | Stack del ROADMAP (Contexto y Fase 2) | 2026-10-29 |
| D-05 | TMDB solo desde el servidor, con clave nunca expuesta al cliente y respuestas cacheadas | ROADMAP, paso 1.5 | 2026-10-29 |
| D-06 | Acceso mediante enlace mágico, limitado a dos cuentas | ROADMAP, paso 1.4 | 2026-10-29 |
| D-07 | El navegador usa la clave anon solo para Auth; los datos pasan por el servidor | Regla de acceso externo confirmada por el usuario; ver `docs/ARCHITECTURE.md` | 2026-10-29 |
| D-08 | Un ciclo SDD por paso de código, un paso por sesión | ROADMAP, "Cómo usarlo" | 2026-10-29 |
| D-09 | Herramientas: ESLint, Vitest y Playwright | ROADMAP, paso 1.1 | 2026-10-29 |
| D-10 | Documentación en español | Confirmación del usuario | 2026-10-29 |
| D-11 | pnpm como gestor de paquetes (`packageManager` fijado, solo `pnpm-lock.yaml`) | Instalaciones reproducibles; paso 1.1 | 2026-10-29 |
| D-12 | Node 22 LTS fijado con `.nvmrc` y `engines.node` (`>=22 <23`) | Entorno reproducible; paso 1.1 | 2026-10-29 |
| D-13 | Tailwind instalado desde el paso 1.1 | Viene con la plantilla; el diseño visual sigue en D.1 y D.2 | 2026-10-29 |
| D-14 | Capas finales bajo `src/` (`app`, `domain`, `server`, `lib/supabase`) y `tests/e2e`, con `server-only` como barrera en `src/server` | El build falla si el cliente importa código de servidor; ver `docs/ARCHITECTURE.md` | 2026-10-29 |
| D-15 | "Urgente de ver" es un estado propio; hay seis estados con id en inglés y la etiqueta exacta de la leyenda del Excel | Cierra la decisión abierta del paso 1.2; los ids se guardan y las etiquetas solo se muestran | 2026-10-29 |
| D-16 | El modelo solo tiene los campos del Excel (sin géneros, plataforma ni quién propone) | Cierra la decisión abierta del paso 1.2 | 2026-10-29 |
| D-17 | Solo `name` y `kind` son obligatorios; el resto es opcional con valor por defecto (`pending`, `null`, `[]`, fecha desconocida) | Las filas del Excel son dispersas; un valor presente pero inválido sigue rechazándose | 2026-10-29 |
| D-18 | Nota de 0 a 10 en rejilla de 0,25, con marca de tipo; se rechaza lo que no encaja, nunca se redondea | Evita guardar notas alteradas en silencio | 2026-10-29 |
| D-19 | La media es la media aritmética bruta de las notas existentes, calculada y no almacenada; `null` si no hay notas | Regla del proyecto: la media nunca da error | 2026-10-29 |
| D-20 | `Title` es la unión `Movie \| Series` (solo `Series` lleva `seasonsWatched`); las funciones devuelven `Result` y nunca lanzan; los valores se conservan tal como llegan | Datos no fiables en la importación (paso 1.7); sin normalización implícita | 2026-10-29 |
| D-21 | La lista permitida es la tabla `allowed_emails` (correo en minúsculas y no vacío) consultada con `public.is_allowed()`, función `security definer` con `search_path` vacío que compara con `lower(auth.jwt() ->> 'email')`; solo `authenticated` puede ejecutarla | Cierra el mecanismo de la lista permitida; el cliente nunca lee la tabla (sin privilegios ni políticas) | 2026-10-29 |
| D-22 | Los correos reales no entran en git: sin semilla (`[db.seed] enabled = false`), tests con correos `*.example.test` y carga manual en el proyecto alojado (ver «Carga manual de la lista permitida») | Los correos son datos personales; el acceso local no necesita correos reales | 2026-10-29 |
| D-23 | Una única tabla `titles` compartida, sin propietario; las notas de María e Ignacio son columnas `numeric` sin precisión | `numeric(4,2)` redondearía 7,249 a 7,25 y rompería D-18; las dos cuentas ven todas las filas | 2026-10-29 |
| D-24 | Estado y tipo son `text` con `check` (ids de `WATCH_STATES`), la fecha desconocida es `null` y `seasons_watched` solo admite valor en series | Más fácil de cambiar que un enum; la base de datos es más estricta que `createTitle`, que ignora las temporadas en una película | 2026-10-29 |
| D-25 | `updated_at` lo mantiene un trigger propio con `clock_timestamp()` | `now()` es constante dentro de una transacción; sin dependencia de la extensión `moddatetime` | 2026-10-29 |
| D-26 | Nombre en blanco se rechaza con `name ~ '\S'` | `btrim` solo quita espacios y dejaría pasar tabuladores y saltos de línea | 2026-10-29 |
| D-27 | Los tests de base de datos son pgTAP (`pnpm test:db`) y se ejecutan solo en local; la CI llega en la Fase 2. `anon` no tiene privilegios y las políticas llaman a `(select public.is_allowed())` | No existe `.github/` todavía; defensa en profundidad además de RLS | 2026-10-29 |
| D-28 | Sustituye a D-07: el navegador no crea ningún cliente de Supabase. Login y logout son Server Actions, el enlace mágico aterriza en un Route Handler (`/auth/confirm`) y `src/proxy.ts` refresca la sesión y protege todas las rutas salvo `/login` y `/auth/*` | Con Server Actions no hace falta clave en el cliente; solo existe `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y se usa en el servidor. Cierra la decisión abierta de mecanismo UI a servidor para Auth | 2026-10-30 |
| D-29 | `allowed_emails.person` (`ignacio` o `maria`, `not null`, `unique`, sin inserciones en la migración) y `public.current_person()` (`security definer`, `search_path` vacío, solo `authenticated`) | Misma técnica que D-21; quitar la fila revoca el acceso al instante. La base de datos es la única fuente del mapeo correo-persona | 2026-10-30 |
| D-30 | El filtro de registro es el hook `before_user_created` (`public.before_user_created_hook`, `security invoker`) que devuelve `{}` o un error 403; `supabase_auth_admin` solo tiene `select` en `allowed_emails` mediante la política `allowed_emails_auth_admin_select` | Ningún correo ajeno llega a crear fila en `auth.users` ni a recibir correo; los roles de cliente siguen sin privilegios. Comprobado de extremo a extremo con GoTrue | 2026-10-30 |
| D-31 | Trigger `titles_enforce_score_ownership`: quien inicia sesión como `ignacio` no puede dar valor distinto a `score_maria` y viceversa (error `42501`). Solo actúa con `current_user = 'authenticated'` y persona conocida | RLS no compara columnas por usuario. Las migraciones y el importador del paso 1.7 deben ejecutarse como `postgres`, que no queda restringido | 2026-10-30 |
| D-32 | El formulario de acceso muestra el mismo mensaje para cualquier resultado tras validar el formato; los errores solo se registran por `code`, nunca por texto del proveedor | Evita enumerar qué correos están permitidos. Observado: el rechazo del hook llega como `AuthApiError` 403 con `code: "unknown"` y el mensaje del hook | 2026-10-30 |
| D-33 | `/auth/confirm` acepta solo `type=email` con `token_hash`, llama a `verifyOtp` y redirige a `/` o a `/login` sin parámetros. No existe `next`. Las redirecciones se construyen con `SITE_URL` (variable solo de servidor) | Sin redirección abierta. Next reescribe `127.0.0.1` a `localhost` en `request.url`, lo que enviaba la sesión a otro host de cookies; se descubrió en E2E | 2026-10-30 |
| D-34 | Una sola plantilla (`supabase/templates/sign-in.html`) para `magic_link` y `confirmation`, con enlace `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. `site_url` y Playwright usan `127.0.0.1:3000` y `next.config.ts` declara `allowedDevOrigins: ["127.0.0.1"]` | El primer acceso de una cuenta nueva recibe el correo de confirmación. El host del enlace debe coincidir con el de la cookie. Sin `allowedDevOrigins`, Next bloquea `/_next/hmr` desde `127.0.0.1` (los tests pasan, pero el desarrollo pierde HMR) | 2026-10-30 |
| D-35 | La sesión se valida con `getClaims()` (nunca `getSession()` en el servidor) y `/` resuelve la persona en `PersonGate` dentro de `Suspense`, tras `connection()`. Una sesión sin persona vuelve a `/login`, que no redirige de vuelta | Sin `connection()`, Next avisaba de `Date.now()` durante el prerenderizado en desarrollo. Evita bucles con una cuenta retirada de la lista | 2026-10-30 |
| D-36 | Los datos de E2E (`e2e-ignacio@example.test`, `e2e-maria@example.test`) los inserta `globalSetup` de Playwright con `pg`; el correo se lee de la API de Mailpit | Una semilla rompería D-22 y AC-1.2 | 2026-10-30 |
| D-37 | Los textos de la interfaz del acceso están en español neutro («Si este correo puede entrar, te llegará un enlace.», «Introduce un correo válido», «Sesión iniciada como …», «Salir») | La aplicación es `lang="es"`; el diseño proponía textos en inglés y se sustituyeron por indicación del encargo de aplicación | 2026-10-30 |
| D-38 | Caché de TMDB con la Data Cache de `fetch` (`next: { revalidate }`): 3600 s en búsquedas y 604800 s en detalles. Se descartan `'use cache'`, `unstable_cache` y `use cache: remote` | La Data Cache de `fetch` persiste entre despliegues e instancias y solo guarda respuestas 200, así que un 429, un 5xx o un fallo de red nunca se cachean. `'use cache'` vive en memoria por instancia y `unstable_cache` cachea el valor devuelto, con lo que un `unavailable` se guardaría durante el TTL (evitarlo obligaría a lanzar, contra D-20). Cierra la decisión abierta «Caché de TMDB» | 2026-10-30 |
| D-39 | Cliente `createTmdbClient({ token, fetchImpl? })`; `fetchImpl` por defecto es `(i, n) => fetch(i, n)` resuelto en cada llamada | Siempre llega al `fetch` parcheado por Next. Los tests inyectan un stub: sin llamadas reales ni dependencias nuevas (sin MSW) | 2026-10-30 |
| D-40 | Los fallos de TMDB son `not_found`, `unavailable`, `invalid_input` y `unauthorized`, dentro de `Result` (D-20). **`unauthorized` es una variante nueva**: la especificación asumía un resultado «unauthorized» ya existente, pero `getCurrentPerson` devuelve `null` y las acciones de acceso devuelven `SignInState`. Los registros llevan solo un código, nunca el texto de TMDB | El paso 1.6 ramifica sobre estas variantes para la alternativa manual. Misma regla que D-32 | 2026-10-30 |
| D-41 | Un 429 reintenta una vez tras `Retry-After` (tope y valor por defecto de 1 s) y luego es `unavailable`. 5xx, red, el tiempo máximo de 5 s y un JSON mal formado son `unavailable` sin reintento. 404 es `not_found`. 401 es `unavailable` y se registra como `auth` | Acota la latencia de la Server Action (R-TL-5) | 2026-10-30 |
| D-42 | El token es `TMDB_READ_ACCESS_TOKEN` (Bearer), solo de servidor, y `getTmdbReadAccessToken(): string \| null` en `src/server/tmdb/env.ts` es el único lugar que lo lee. Sin token: `unavailable`, se registra `missing_token` y no hay llamada | Encaja con D-20 y R-TL-6 (no lanzar, no filtrar). El token forma parte de la clave de la caché | 2026-10-30 |
| D-43 | Migración `tmdb_fields`: `tmdb_id` (`> 0`), `poster_path` (`<> ''` y empieza por `/`) y `seasons_total` (`>= 1` y solo en series, estilo D-24), todas nulas y sin valor por defecto. Sin unicidad `(kind, tmdb_id)` ni regla `seasons_watched <= seasons_total` | Las reglas de la base de datos y del dominio son idénticas: lo que acepta `createTitle` se puede insertar en 1.6. Aditiva; RLS, privilegios y `titles_enforce_score_ownership` no cambian | 2026-10-30 |
| D-44 | `posterUrl(path)` en `src/lib/tmdb/poster-url.ts` (pura y segura para el cliente) devuelve `https://image.tmdb.org/t/p/w342` + ruta, o `null` si falta o no es válida. `images.remotePatterns` solo admite `https://image.tmdb.org/t/p/w342/**` | La interfaz solo importa tipos del dominio; un patrón estrecho limita lo que puede pasar por el optimizador de imágenes | 2026-10-30 |
| D-45 | Orden del caso de uso: identidad (`getCurrentPerson()`; `null` es `unauthorized`), validación de entrada, token y, por último, TMDB | Las Server Actions son endpoints POST públicos; sin sesión permitida no hay llamadas externas (R-TL-8). Una consulta en blanco devuelve `not_found` sin llamar, y más de 100 caracteres tras recortar o un valor que no es texto, `invalid_input` | 2026-10-30 |
| D-46 | El campo del DTO es `name`, un cambio deliberado respecto a `title` de la especificación | Coincide con la columna `name` y con `Title.name`: el paso 1.6 puede rellenar sin reasignar campos | 2026-10-30 |
| D-47 | Los colores son variables hexadecimales en `:root`; el tema oscuro va en `[data-theme=dark]` y en `@media (prefers-color-scheme: dark) { :root:not([data-theme=light]) }`, con `color-scheme` por tema. `@theme inline` de Tailwind v4 los expone como `--color-*` y los componentes usan los tokens, nunca `dark:`. La caja invertida de tinta (`inverse-bg`/`inverse-ink`) es exclusiva de `AverageBox`, y un test de `tokens.test.ts` falla si otro archivo usa clases `inverse-` | El hexadecimal se prueba de forma trivial. La media es la única cifra grande (D.1), por eso el botón principal no tiene variante invertida. Se descartan oklch y `light-dark()` | 2026-10-30 |
| D-48 | `src/lib/design/tokens.ts` es la única fuente de los tokens (`TOKENS.light`/`TOKENS.dark` y `CONTRAST_PAIRS`). Un test de sincronización lee `globals.css` y exige que cada variable coincida con el valor de TypeScript en los tres bloques; el test de contraste (AA: 4,5 en texto, 3 en lo demás) y las muestras de `/sistema` leen el mismo módulo | Evita que el CSS y las comprobaciones de contraste diverjan. Se descarta usar el CSS como fuente | 2026-10-30 |
| D-49 | Tipografía Archivo con eje `wdth` mediante `next/font` (`axes: ["wdth"]`, variable `--font-archivo`); se retira Geist. La utilidad `font-condensed` usa `font-stretch: 75%` | Una sola familia (D.1). Comprobado en el build: el `@font-face` generado declara `font-stretch: 62% 125%`, así que no hace falta `font-variation-settings`. Se descarta Archivo Narrow | 2026-10-30 |
| D-50 | El tema (`system`, `light` o `dark`; Sistema, Claro u Oscuro) se guarda en la cookie `theme` (`httpOnly`, un año, `path=/`, `SameSite=Lax`, `secure` en producción); un valor ausente o inválido es `system`. El servidor la lee: `RootLayout` devuelve `<Suspense><ThemedDocument>`, que espera a `cookies()` y pinta `<html data-theme>` (sin atributo para `system`) | Sin parpadeo y con el servidor como fuente de verdad. No es una receta documentada: la documentación de Next 16.4 recomienda un script en línea, que el usuario rechazó; un spike de build lo validó antes de seguir. Coste aceptado: todas las rutas se renderizan en cada petición y `/login` pierde su envoltorio estático | 2026-10-30 |
| D-51 | `setThemeAction(value: unknown)` en `src/app/_actions/theme.ts`, sin comprobación de sesión: solo escribe la cookie del propio visitante con valores de una lista cerrada. `ThemeToggle` usa `useOptimistic` y está en `/` y `/sistema`; en el paso 1.6 pasa a la navegación | El servidor es la fuente de verdad; se descarta escribir la cookie desde el cliente | 2026-10-30 |
| D-52 | Componentes en `src/components/ui/`: archivos en kebab-case y exportaciones en PascalCase, sin librerías de componentes. Solo `ThemeToggle` es `"use client"`; todos aceptan `className` (unido con `cx()`) y los objetivos táctiles miden al menos 44 px (`min-h-11`) | Cero dependencias y alcance cómodo en el móvil | 2026-10-30 |
| D-53 | La interfaz puede importar del dominio **tipos y constantes de datos** (etiquetas como `WATCH_STATE_LABELS`), nunca funciones. Las notas y medias de muestra de `/sistema` se construyen en el servidor (`src/server/specimen/sample.ts`) con `parseScore` y `averageScore` | Amplía la regla «solo tipos» de D-44, a petición del usuario. Se descarta forzar tipos con `as Score`; el flujo es el mismo que tendrá el paso 1.6 | 2026-10-30 |
| D-54 | La tabla de críticos es una rejilla de `div` con `role` de tabla, fila, cabecera de columna y celda; el título es un enlace con área de pulsación extendida, en una línea y truncado (el nombre completo sigue siendo accesible) | Safari pierde la semántica de `<table>` con `display: grid`. Filas de 60 a 64 px a 390 px de ancho | 2026-10-30 |
| D-55 | La media se muestra con hasta dos decimales, sin ceros finales, con coma (`es-ES`) y redondeo hacia arriba en el medio (`roundingMode: "halfExpand"`): 7,25 · 7,5 · 8 · 7,125 → 7,13. `formatScore` vive en `score-figure.tsx` y la comparten los componentes | Decisión del usuario. La rejilla de 0,125 es exacta en binario, así que el redondeo no falla | 2026-10-30 |
| D-56 | Accesibilidad en tests unitarios con `axe-core` como dependencia de desarrollo y el ayudante `expectNoAxeViolations` (`src/test/axe.ts`), con la regla `color-contrast` desactivada | jsdom no calcula el contraste; lo cubren los tests de tokens (D-48). Se descartan `vitest-axe` (sin mantenimiento) y `jest-axe` (tipos de Jest) | 2026-10-30 |
| D-57 | Playwright ejecuta el proyecto `auth` antes que `ui` (`dependencies: ["auth"]`), con los ayudantes de sesión compartidos en `tests/e2e/session.ts` | `signOut()` de Supabase cierra todas las sesiones de la cuenta; en paralelo, los tests de acceso tiraban la sesión de los de interfaz | 2026-10-30 |
| D-58 | La interfaz habla con el servidor mediante Server Actions para escrituras y búsquedas (`src/app/_actions/titles.ts`); las páginas RSC leen llamando a los casos de uso directamente y pasan DTO ya resueltos (media incluida, D-53) a islas de cliente pequeñas | Es el mismo mecanismo que Auth (D-28) y TMDB (D-45). Se descartan los Route Handlers. Cierra la decisión abierta sobre el mecanismo UI a servidor | 2026-10-30 |
| D-59 | La búsqueda por nombre no distingue acentos ni mayúsculas: función SQL inmutable `public.fold_search(text)` (`lower` de `normalize(NFD)` sin marcas combinantes), columna generada almacenada `titles.name_search` y espejo `foldSearch` en el dominio. Se consulta con `ilike '%q%'` escapando `%`, `_` y `\` (`escapeLike`); los mismos casos («Amélie», «Léon») se prueban en Vitest y en pgTAP | Mismo algoritmo en ambos lados, sin extensión. Se descartan `unaccent` (STABLE, exige envoltorio inmutable), las colaciones ICU no deterministas (sin `LIKE` en PG17) y una columna escrita por la aplicación (la importación del paso 1.7 como `postgres` se la saltaría). Reversión: ver «Reversión de title-management» | 2026-10-30 |
| D-60 | Índice único parcial `titles_kind_tmdb_id_key` sobre `(kind, tmdb_id) where tmdb_id is not null`. La búsqueda de añadir marca cada candidato con `existingId` (aviso «Ya está en la lista» con «Abrir ficha») y un 23505 en carrera se convierte en `duplicate{existingId}`. Una película y una serie pueden compartir `tmdb_id`; los títulos manuales (`tmdb_id` nulo) no chocan | Garantía en la base de datos más aviso antes de pulsar; solo una comprobación en la aplicación no resiste una carrera. Resuelve la pregunta abierta de D-43 sobre la unicidad | 2026-10-30 |
| D-61 | Los casos de uso devuelven `Result<_, TitleFailure>` y nunca lanzan (D-20). `TitleFailure.kind`: `unauthorized`, `invalid_input`, `not_found` (PGRST116 o 0 filas), `duplicate{existingId}` (23505), `forbidden` (42501) y `unavailable` (cualquier otro; solo se registra el código, D-32). La fila se convierte con `rowToRecord` mediante `createTitle` (mintea la `Score`) y un `TitleRecord {id, createdAt, title}` propio del servidor; el dominio no cambia | Mapeo explícito y probable con un cliente simulado. Se descarta `supabase gen types` (tabla pequeña, lista de columnas explícita); queda aplazado | 2026-10-30 |
| D-62 | Edición campo a campo: `updateTitleFieldAction(id, patch)` con un parche de un solo campo (`state`, `watchDate`, `observations` o `myScore`). La columna de nota sale siempre de `scoreColumnFor(persona de la sesión)`, nunca del cliente; la acción devuelve la ficha fresca. Cada isla guarda de forma optimista con un borrador propio (`use-field-save.ts`, sin `useOptimistic` porque la cola necesita estado que sobreviva entre guardados), con cola serializada por campo en la que gana el último valor, `aria-busy` y reversión con `role="alert"` («No se pudo guardar. Inténtalo de nuevo.») | Guardado inmediato por campo (decisión del usuario, #823) y orden correcto con toques rápidos de −/+. Se descartan el formulario entero y solo el debounce. Mientras se guarda se mantiene la media anterior con `aria-busy`: calcularla en el cliente rompería D-53 | 2026-10-30 |
| D-63 | Los filtros por estado y por nombre se hacen en SQL; el orden, en el dominio con `sortTitles` (media y fecha vacías al final, empates por nombre con `es`; en Pendientes `prioridad` pone primero lo urgente y luego lo más reciente). El estado de la lista vive en la URL: `parseListParams` (`src/lib/titles/list-params.ts`, pura) recorta `q` a 100, filtra `estado` a los estados de esa lista y cae al orden por defecto si `orden` no es válido. Las listas cargan entera la selección filtrada, sin paginar (#823). El cliente solo hace `router.replace` (con `q` en debounce de 250 ms) | La media no se guarda (D-19), así que no se puede ordenar en SQL. El servidor es la fuente, sin `useSearchParams` ni Suspense extra | 2026-10-30 |
| D-64 | Los pósters usan `next/image` con `unoptimized` | TMDB ya sirve `w342` (D-44); evita gastar la cuota de optimización de imágenes de Vercel. Cierra la decisión abierta | 2026-10-30 |
| D-65 | Rutas bajo el grupo `src/app/(catalog)/`: `/vistas`, `/pendientes`, `/anadir` y `/titulo/[id]` (un id que no es uuid da `notFound()`). Su `layout.tsx` llama a `connection()` y resuelve la persona dentro de `Suspense`, y pinta la cabecera solo con sesión: pestañas Vistas y Pendientes con `aria-current` y un menú `popover` con `ThemeToggle` y «Cerrar sesión» (Escape devuelve el foco). `/` es una página que hace `redirect("/vistas")`; se retiran `PersonGate` y la sección de tema de la portada | Una sola guarda comprobable. Se descarta `redirects` en `next.config`. Actualiza D-51: el tema pasa a la navegación | 2026-10-30 |
| D-66 | `getCurrentPerson` se envuelve en `cache()` de React | El layout y los casos de uso de una misma petición comparten una sola llamada RPC a `current_person()` | 2026-10-30 |
| D-67 | `AddAction` se ancla a la columna de 760 px en escritorio: envoltorio fijo de ancho completo con `pointer-events-none` y, dentro, `max-w-table mx-auto flex justify-end`; el botón lleva `pointer-events-auto` y recibe `href`. Un E2E comprueba a 1440 px que su borde derecho coincide con el de `main` (±1 px) | Se descarta `calc(100vw …)` por el error con la barra de desplazamiento. Cierra lo que D.2 dejó pendiente | 2026-10-30 |
| D-68 | El estado inicial de un título nuevo depende del origen: `/anadir?desde=vistas` crea `Vista` con la fecha de hoy; `desde=pendientes` o sin `desde`, `Pendiente`. `AddAction` de cada lista lleva `desde`, y la creación acepta `state` y `watchDate` opcionales. Además, un cambio de estado a uno visto (`watched`, `watched_rewatch`, `watched_no_rewatch`, `watched_awful`) en un título con fecha desconocida guarda hoy en la misma escritura, en el servidor y con el día de Europe/Madrid (`todayIso`). Si la fecha ya se conoce, o la persona elige luego «No sé cuándo», se respeta; los estados no vistos nunca tocan la fecha | Decisión del usuario (#827): ayuda al objetivo de añadir y puntuar en menos de 30 s. Se descarta solo prerrellenar el selector de fecha | 2026-10-30 |
| D-69 | En Pendientes, el orden «fecha» ordena por `createdAt` descendente (cuándo se añadió); en Vistas, por fecha de visionado descendente | Pendientes no tiene fecha de visionado. Decisión del usuario (#827) | 2026-10-30 |
| D-70 | Doble de TMDB solo de servidor para los E2E (`src/server/tmdb/test-double.ts`): búsqueda y detalles deterministas, con una serie incluida. Solo se activa con `TMDB_TEST_DOUBLE=1` y `NODE_ENV !== "production"`; en producción con el indicador activo falla al arrancar. `playwright.config.ts` lo pone en el entorno del servidor web. Las capturas del MCP de Playwright usan TMDB real | Pruebas deterministas y sin red ni cuota. El indicador no puede llegar a producción | 2026-10-30 |

## Carga manual de la lista permitida

Las migraciones dejan `allowed_emails` vacía. En un proyecto de Supabase alojado, las dos cuentas se insertan una vez a mano desde el editor SQL del panel (nunca en un archivo del repositorio). Los correos van en minúsculas y cada uno lleva su `person` (`ignacio` o `maria`, sin repetir); la base de datos rechaza mayúsculas.

```sql
insert into public.allowed_emails (email, person)
values ('name@example.com', 'ignacio'), ('other@example.com', 'maria');
```

Sustituir los marcadores por los correos reales. En local no hace falta cargar nada a mano: los correos salen por Mailpit (`http://127.0.0.1:54324`) y los tests usan `*.example.test`; para entrar en la aplicación local hay que insertar antes la fila de tu correo con su `person`. Para retirar un acceso basta con borrar la fila (`delete from public.allowed_emails where email = '...'`); el efecto es inmediato.

## Configuración manual en Supabase alojado (paso 1.4)

El hook y las plantillas de `supabase/config.toml` solo aplican en local. En el proyecto alojado, en este orden:

1. Si `allowed_emails` ya tiene filas, borrarlas antes de `db push`: la migración añade `person` como `not null` y falla de forma atómica con filas previas.
2. Aplicar las migraciones (`supabase db push`).
3. Insertar las dos cuentas con su persona (ver «Carga manual de la lista permitida»).
4. Panel > Authentication > Hooks: crear el hook «Before User Created» de tipo Postgres con la función `public.before_user_created_hook`.
5. Panel > Authentication > Email Templates: pegar el contenido de `supabase/templates/sign-in.html` en «Magic Link» y en «Confirm signup».
6. Panel > Authentication > URL Configuration: `Site URL` con el dominio de producción y, en Redirect URLs, `<dominio>/auth/confirm`.
7. Vercel: definir `SITE_URL` (dominio de producción, sin barra final), `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No se usa ninguna clave `service_role`.

Local: `SITE_URL=http://127.0.0.1:3000`, `MAILPIT_URL=http://127.0.0.1:54324` y `SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres` (solo E2E) van en `.env.local`, que no se versiona. Los valores salen de `pnpm exec supabase status -o env`.

## Reversión de couple-auth

Revertir el paso 1.4 deja intactos los datos del paso 1.3. Ejecutar como `postgres`, en este orden:

```sql
drop trigger titles_enforce_score_ownership on public.titles;
drop function public.enforce_score_ownership();
drop function public.before_user_created_hook(jsonb);
drop policy allowed_emails_auth_admin_select on public.allowed_emails;
revoke select on public.allowed_emails from supabase_auth_admin;
drop function public.current_person();
alter table public.allowed_emails drop column person;
```

Después:

1. Desactivar el hook: en `supabase/config.toml` poner `enabled = false` en `[auth.hook.before_user_created]` (y reiniciar con `pnpm db:stop && pnpm db:start`), o desactivarlo en Panel > Authentication > Hooks. Sin la función, un hook activo rechazaría todos los accesos.
2. Restaurar las plantillas `magic_link` y `confirmation` (quitar las secciones de `config.toml` y volver a las plantillas por defecto del panel).
3. Revertir el PR de couple-auth.

Verificación (cada consulta debe devolver 0 filas):

```sql
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and proname in ('current_person', 'before_user_created_hook', 'enforce_score_ownership');
select tgname from pg_trigger where tgname = 'titles_enforce_score_ownership' and not tgisinternal;
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'allowed_emails' and column_name = 'person';
select policyname from pg_policies where tablename = 'allowed_emails';
```

Comprobado el 2026-10-30 en local, con una fila en `titles` (notas 7 y 8) y dos filas en `allowed_emails`: primero dentro de `begin; ... rollback;` y después confirmado en una base descartable; en ambos casos los objetos desaparecieron y las filas de `allowed_emails` y `titles` siguieron intactas. Después se restauró con `pnpm db:reset`.

## Reversión de title-management

La migración `20261031090000_title_search_unique.sql` es aditiva y lleva el SQL de reversión en su cabecera. Para deshacerla, como `postgres`:

```sql
drop index titles_kind_tmdb_id_key;
alter table titles drop column name_search;
drop function fold_search(text);
```

Las filas de `titles` no cambian. Después, revertir el PR de title-management.

## Abiertas

Sin resultado decidido. Cada una se resuelve en el paso indicado.

| Tema | Se decide en |
|---|---|
| Observaciones que no son notas de la película | Paso 1.7 |
| Detalles de producción y alojamiento | Fase 2 |
| Prioridad y diseño de la Fase 3 | Tras el lanzamiento |
