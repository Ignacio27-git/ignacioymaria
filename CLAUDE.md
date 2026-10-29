# Ignacio y María — guía para Claude Code

Web para Ignacio y María que sustituye la hoja *Pelis* del Excel `Ignacio y María.xlsx`. Solo películas y series; Restaurantes, Juegos de Mesa y Libros quedan fuera.

## Antes de empezar

1. Leer `docs/ROADMAP.md` (paso actual), `docs/ARCHITECTURE.md` y `docs/DECISIONS.md`.
2. Un paso por sesión, salvo que sean triviales.

## Stack

Next.js (App Router) + React + TypeScript estricto · Supabase (Postgres y Auth, RLS, migraciones en el repositorio) · Vercel · TMDB para metadatos y pósters. Herramientas: ESLint, Vitest, Playwright (y su MCP) y las skills de diseño.

## Reglas no negociables

1. Cada paso de código es un ciclo SDD: `/gentle-sdd-new <cambio>`.
2. Ante una ambigüedad o decisión abierta del ROADMAP, preguntar antes de decidir.
3. Solo el código de servidor habla con servicios externos (ver `docs/ARCHITECTURE.md`). Todos los datos pasan por el servidor.
4. La clave de TMDB nunca llega al cliente. Ninguna clave va en el repositorio: `.env.local` se ignora y `.env.example` solo lleva nombres.
5. Acceso limitado a las dos cuentas de la lista permitida. RLS y migraciones versionadas en el repositorio.
6. Alcance: solo películas y series.
7. Estados válidos: solo los de la leyenda de colores del Excel (ver `docs/ROADMAP.md`, Contexto).
8. La media se calcula solo con las notas existentes y nunca da error.
9. D.1 y D.2 terminados antes del paso 1.6. Lo visual usa las skills de diseño y se comprueba con el MCP de Playwright.

## Comandos

| Comando | Estado |
|---|---|
| `pnpm dev` | disponible |
| `pnpm build` | disponible |
| `pnpm start` | disponible |
| `pnpm lint` | disponible |
| `pnpm typecheck` | disponible |
| `pnpm test` | disponible |
| `pnpm test:e2e` | disponible |

## Registro obligatorio

Al terminar cada tarea, actualizar el documento que corresponda:

| Tipo de trabajo | Documento a actualizar |
|---|---|
| Progreso del paso, notas, desviaciones del plan | `docs/ROADMAP.md` (campo Notas del paso y registro de desviaciones) |
| Decisión de arquitectura o de stack | `docs/DECISIONS.md` |
| Prompt relevante | `docs/PROMPTS.md` |
| Cambio visual o de diseño | `docs/DESIGN-ROADMAP.md` (y su registro de desviaciones) |
| Cambio estructural (capas, carpetas, acceso a servicios) | `docs/ARCHITECTURE.md` |

Lo que el agente hizo mal sin darse cuenta lo anotan las personas tras la revisión.

## Documentos

- [`docs/ROADMAP.md`](docs/ROADMAP.md): pasos, prompts y registro de desviaciones.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): capas, acceso a Supabase y TMDB.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): decisiones tomadas y abiertas.
- [`docs/PROMPTS.md`](docs/PROMPTS.md): registro de prompts.
- [`docs/DESIGN-ROADMAP.md`](docs/DESIGN-ROADMAP.md): plan de diseño (pasos `D.n`).
