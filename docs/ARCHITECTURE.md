# Arquitectura

Dominio puro en el centro; solo el código de servidor habla con servicios externos. Fuente de verdad del plan: `docs/ROADMAP.md`.

## Capas y reglas de dependencia

Las dependencias apuntan hacia dentro. Estas reglas son vinculantes.

| Capa | Contiene | Puede importar | No puede |
|---|---|---|---|
| Dominio | Tipos y reglas puras (notas, media, estados) | Nada externo | Next.js, React, Supabase, TMDB, E/S |
| Servidor | Casos de uso, acceso a datos, clientes de Supabase y TMDB | Dominio | Código de UI |
| UI | Páginas y componentes | Dominio (solo tipos); Servidor mediante los mecanismos de Next.js | Clientes de servidor, claves secretas |

El dominio se prueba con Vitest sin simular servicios. La regla "nada externo" la vigila `src/domain/purity.test.ts`, que falla si algún módulo del dominio importa una ruta no relativa.

## Quién puede llamar a servicios externos

Regla: solo el código de servidor llama a servicios externos. Ningún código de cliente llama a TMDB ni lee o escribe tablas de Supabase directamente.

| Servicio | Navegador | Código de servidor | Dominio |
|---|---|---|---|
| Supabase Auth (enlace mágico, sesión) | No | Sí, con la clave publicable | No |
| Supabase datos (lecturas y escrituras) | No | Sí, bajo RLS | No |
| TMDB | No | Sí, con la clave solo de servidor y con caché | No |

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

## Secretos

- Las claves secretas solo existen en el entorno del servidor y nunca se exponen al cliente (p. ej., no usar el prefijo `NEXT_PUBLIC_` para ellas).
- `.env.local` se ignora en git y `.env.example` solo contiene nombres de variables (paso 0.3).

## Mapa de carpetas

Estructura creada en el paso 1.1. Las reglas de dependencia de arriba la gobiernan.

| Ruta | Contenido |
|---|---|
| `src/app/` | Rutas y UI (App Router) |
| `src/domain/` | Dominio puro: `result`, `score`, `average`, `watch-state`, `watch-date`, `title` e `index.ts` (barrel, se importa como `@/domain`) |
| `src/server/` | Servidor e integraciones |
| `src/lib/supabase/` | Cliente de servidor, helper del proxy, variables de entorno y rutas públicas (sin cliente de navegador) |
| `src/server/auth/` | Casos de uso de acceso: `sendMagicLink`, `signOut`, `getCurrentPerson` y `scoreColumnFor` |
| `src/app/_actions/` | Server Actions de la interfaz (`requestMagicLinkAction`, `signOutAction`), envoltorios finos |
| `src/proxy.ts` | Proxy de Next.js: refresca la sesión y protege las rutas |
| `supabase/migrations/` | Migraciones versionadas: `allowlist` y `titles` (paso 1.3) y `couple_auth` (paso 1.4: `person`, `current_person()`, hook de registro y trigger de notas) |
| `supabase/templates/` | Plantilla del correo de acceso (`sign-in.html`) |
| `supabase/tests/database/` | Tests pgTAP (`pnpm test:db`): `titles_constraints`, `access_control` y `couple_auth`; solo en local |
| `supabase/config.toml` | Configuración de la CLI de Supabase (proyecto `ignacioymaria`, sin semilla) |
| `tests/e2e/` | Pruebas E2E (Playwright): `auth.spec.ts` con ayudantes de Mailpit y `pg`; `globalSetup` inserta las dos cuentas de prueba |
| `vitest.config.mts` | Configuración de Vitest (jsdom, solo `src/**/*.test.{ts,tsx}`) |
| `playwright.config.ts` | Configuración de Playwright (chromium, arranca `pnpm dev`) |

Los tests unitarios viven junto al código (`*.test.ts(x)`). `src/server/index.ts` importa `server-only`: si un componente cliente importa código de `src/server`, el build falla.

## Abierto

Nada de esto está decidido. No se adelanta en ningún documento.

| Tema | Se decide en |
|---|---|
| Server Actions o Route Handlers como mecanismo UI a servidor para datos (Auth ya usa Server Actions y un Route Handler) | Paso 1.x que lo necesite |
| Mecanismo de caché de TMDB | Paso 1.5 |

Ver también `docs/DECISIONS.md`.
