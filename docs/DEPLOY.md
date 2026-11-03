# Puesta en producción (paso 2.2)

Procedimiento para publicar la aplicación en Vercel contra un proyecto de Supabase alojado. Las decisiones están en `docs/DECISIONS.md` (D-88 y D-89); aquí solo el procedimiento, que se vuelve a ejecutar (por ejemplo, para recapturar la sesión).

Lo que el repositorio ya hace por sí solo:

- `vercel.json`: solo `main` se despliega; ninguna otra rama ni vista previa.
- `.github/workflows/deploy-migrations.yml`: aplica `supabase/migrations` al proyecto alojado en cada `push` a `main` que toque migraciones (o a mano con *Run workflow*). Hace `db push --dry-run` antes del `db push` real, usa el entorno `production` de GitHub y no se cancela a medias.
- `pnpm test:prod` y `pnpm test:prod:login`: comprobación local, de solo lectura, contra la URL pública (nunca en CI).

Lo que no cabe en un archivo (paneles de Supabase, Vercel y GitHub) va en este orden. Nunca se escribe una clave ni un correo real en el repositorio.

## Pasos, en este orden

1. **Supabase y GitHub.** Crear el proyecto de Supabase (región cercana). En GitHub: Settings > Environments > `production`, con «Deployment branches» limitado a `main`, y tres secretos del *entorno* (no del repositorio): `SUPABASE_ACCESS_TOKEN` (token personal de Supabase), `SUPABASE_DB_PASSWORD` (la del proyecto) y `SUPABASE_PROJECT_ID` (el *project ref*).
2. **Fusionar el PR.** El workflow `deploy-migrations` aplica las migraciones al proyecto vacío. `allowed_emails` sigue vacía, así que la migración de `person` no falla. Si el CLI se queda esperando una confirmación en CI, añadir `--yes` al `db push` (hueco conocido, se confirma en la primera ejecución). Comprobar también en la primera rama que no sea `main` que Vercel **no** despliega (la regla `"**": false`).
3. **Hook de acceso.** Justo después de la primera ejecución correcta: Authentication > Hooks > «Before User Created», tipo Postgres, función `public.before_user_created_hook`. Comprobar el permiso en el editor SQL:

   ```sql
   select has_function_privilege('supabase_auth_admin', 'public.before_user_created_hook(jsonb)', 'execute');
   ```

   Debe devolver `true`.
4. **Lista permitida.** Insertar las dos cuentas desde el editor SQL del panel (nunca en un archivo). Correos en minúsculas y cada uno con su `person` (`ignacio` o `maria`, sin repetir):

   ```sql
   insert into public.allowed_emails (email, person)
   values ('name@example.com', 'ignacio'), ('other@example.com', 'maria');
   ```

   Sustituir los marcadores por los correos reales. Para retirar un acceso basta con borrar la fila (efecto inmediato).
5. **Plantillas y URL.** Authentication > Email Templates: pegar `supabase/templates/sign-in.html` en «Magic Link» y en «Confirm signup». Authentication > URL Configuration: `Site URL` con el dominio de producción y, en Redirect URLs, `<dominio>/auth/confirm`.
6. **SMTP (Brevo).** Authentication > SMTP Settings: servidor `smtp-relay.brevo.com`, puerto `587`, usuario y clave SMTP de Brevo, remitente verificado. Authentication > Rate Limits: correos por hora = `30`.
7. **Variables de Vercel (entorno Production).** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SITE_URL` (dominio de producción, sin barra final) y `TMDB_READ_ACCESS_TOKEN` (marcada como sensible). **Nunca** `TMDB_TEST_DOUBLE`. No se usa ninguna clave `service_role`. Volver a desplegar tras definirlas.
8. **Primer acceso.** Las dos personas entran por enlace mágico (comprobar que el correo llega y no cae en spam).
9. **Comprobación local.** En `.env.local` poner `PROD_BASE_URL` (URL pública `https`, sin barra final). Ejecutar `pnpm test:prod:login` (se abre un navegador: pedir el enlace, pegarlo en esa misma ventana) y después `pnpm test:prod`. Luego, **a mano**, Authentication > Users debe mostrar exactamente 2 usuarios: así se confirma que la sonda con un correo no permitido no creó ninguno.
10. **Protección de rama.** Settings > Branches > `main`: exigir PR y los checks `Lint, typecheck, unit tests and build` y `Database tests and E2E`.

## Recapturar la sesión

`pnpm test:prod` guarda de vuelta las cookies renovadas en `playwright/.auth/prod.json` (ignorado por git). Si el mensaje es `Prod session expired or revoked: run pnpm test:prod:login`, la sesión caducó o se revocó (un cierre de sesión es global): ejecutar `pnpm test:prod:login` y repetir. Ese archivo contiene cookies: no se comparte ni se sube.

## Reversión

- Aplicación: en Vercel, promover el despliegue anterior.
- Migraciones: desactivar el workflow `deploy-migrations` (Actions > Disable). La base se corrige hacia delante con una migración nueva; antes del paso 2.3 la producción está vacía, así que también se puede recrear el proyecto.
- Acceso: para cerrar la entrada, deshabilitar el hook o borrar filas de `allowed_emails`.
