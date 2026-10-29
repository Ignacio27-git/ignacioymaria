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
