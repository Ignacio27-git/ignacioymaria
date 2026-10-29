# Arquitectura

Dominio puro en el centro; solo el código de servidor habla con servicios externos. Fuente de verdad del plan: `docs/ROADMAP.md`.

## Capas y reglas de dependencia

Las dependencias apuntan hacia dentro. Estas reglas son vinculantes.

| Capa | Contiene | Puede importar | No puede |
|---|---|---|---|
| Dominio | Tipos y reglas puras (notas, media, estados) | Nada externo | Next.js, React, Supabase, TMDB, E/S |
| Servidor | Casos de uso, acceso a datos, clientes de Supabase y TMDB | Dominio | Código de UI |
| UI | Páginas y componentes | Dominio (solo tipos); Servidor mediante los mecanismos de Next.js | Clientes de servidor, claves secretas |

El dominio se prueba con Vitest sin simular servicios.

## Quién puede llamar a servicios externos

Regla: solo el código de servidor llama a servicios externos. Ningún código de cliente llama a TMDB ni lee o escribe tablas de Supabase directamente.

| Servicio | Navegador | Código de servidor | Dominio |
|---|---|---|---|
| Supabase Auth (enlace mágico, sesión) | Sí, solo con la clave anon | Sí | No |
| Supabase datos (lecturas y escrituras) | No | Sí, bajo RLS | No |
| TMDB | No | Sí, con la clave solo de servidor y con caché | No |

## Supabase

- El navegador usa la clave anon únicamente para Auth y sesión.
- Toda lectura o escritura de datos pasa por el código de servidor.
- RLS limita el acceso a usuarios autenticados de la lista permitida.
- Las migraciones están versionadas en el repositorio (paso 1.3).

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
| `src/domain/` | Dominio puro |
| `src/server/` | Servidor e integraciones |
| `src/lib/supabase/` | Clientes de Supabase (navegador: solo Auth) |
| `supabase/migrations/` | Migraciones versionadas (pendiente, paso 1.3) |
| `tests/e2e/` | Pruebas E2E (Playwright) |
| `vitest.config.mts` | Configuración de Vitest (jsdom, solo `src/**/*.test.{ts,tsx}`) |
| `playwright.config.ts` | Configuración de Playwright (chromium, arranca `pnpm dev`) |

Los tests unitarios viven junto al código (`*.test.ts(x)`). `src/server/index.ts` importa `server-only`: si un componente cliente importa código de `src/server`, el build falla.

## Abierto

Nada de esto está decidido. No se adelanta en ningún documento.

| Tema | Se decide en |
|---|---|
| Server Actions o Route Handlers como mecanismo UI a servidor | Paso 1.x que lo necesite |
| Mecanismo de caché de TMDB | Paso 1.5 |
| Mecanismo de la lista permitida de las dos cuentas | Pasos 1.3 y 1.4 |
| Esquema de base de datos | Paso 1.3 |

Ver también `docs/DECISIONS.md`.
