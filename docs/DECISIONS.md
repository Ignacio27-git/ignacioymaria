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

## Carga manual de la lista permitida

Las migraciones dejan `allowed_emails` vacía. En un proyecto de Supabase alojado, las dos cuentas se insertan una vez a mano desde el editor SQL del panel (nunca en un archivo del repositorio). Los correos van en minúsculas; la base de datos rechaza mayúsculas.

```sql
insert into public.allowed_emails (email)
values ('name@example.com'), ('other@example.com');
```

Sustituir los marcadores por los correos reales. En local no hace falta: Inbucket acepta cualquier dirección y los tests usan `*.example.test`. Para retirar un acceso basta con borrar la fila (`delete from public.allowed_emails where email = '...'`); el efecto es inmediato.

## Abiertas

Sin resultado decidido. Cada una se resuelve en el paso indicado.

| Tema | Se decide en |
|---|---|
| Observaciones que no son notas de la película | Paso 1.7 |
| Caché de TMDB | Paso 1.5 |
| Mecanismo UI a servidor | Paso 1.x |
| Detalles de producción y alojamiento | Fase 2 |
| Prioridad y diseño de la Fase 3 | Tras el lanzamiento |
