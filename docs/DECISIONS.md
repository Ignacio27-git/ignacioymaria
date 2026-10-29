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

## Abiertas

Sin resultado decidido. Cada una se resuelve en el paso indicado.

| Tema | Se decide en |
|---|---|
| Modelado de "Urgente" (tal como lo recoge la leyenda del Excel) | Paso 1.2 |
| Campos nuevos para los títulos | Paso 1.2 |
| Observaciones que no son notas de la película | Paso 1.7 |
| Mecanismo de la lista permitida | Pasos 1.3 y 1.4 |
| Esquema de base de datos | Paso 1.3 |
| Caché de TMDB | Paso 1.5 |
| Mecanismo UI a servidor | Paso 1.x |
| Detalles de producción y alojamiento | Fase 2 |
| Prioridad y diseño de la Fase 3 | Tras el lanzamiento |
