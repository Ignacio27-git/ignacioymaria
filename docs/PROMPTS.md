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
