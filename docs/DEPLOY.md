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
5. **SMTP (Brevo).** En Brevo: verificar el remitente (Senders) y generar una clave SMTP (SMTP & API). En Supabase, Authentication > SMTP Settings: servidor `smtp-relay.brevo.com`, puerto `587`, usuario = *SMTP login* de Brevo, contraseña = clave SMTP, remitente verificado. Authentication > Rate Limits: correos por hora = `30`. Va antes que las plantillas: en el plan gratuito no se pueden editar con el proveedor de correo por defecto.
6. **Plantillas y URL.** Authentication > Emails (Templates): pegar `supabase/templates/sign-in.html` en «Magic Link» y en «Confirm signup», con asunto `Tu enlace para entrar`. Authentication > URL Configuration: `Site URL` con el dominio de producción (sin barra final) y, en Redirect URLs, `<dominio>/auth/confirm`.
7. **Variables de Vercel (entorno Production).** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SITE_URL` (dominio de producción, sin barra final) y `TMDB_READ_ACCESS_TOKEN` (marcada como sensible). **Nunca** `TMDB_TEST_DOUBLE`. No se usa ninguna clave `service_role`. La URL es `https://<ref>.supabase.co` (Project Settings > Data API) y la clave es la *publishable* del proyecto alojado (Project Settings > API Keys), nunca la de `.env.local`. Volver a desplegar tras definirlas. Diagnóstico: `sendMagicLink failed unknown` en los logs de Vercel sin entrada en los logs de Auth apunta a la URL; un `401` en `/auth/v1/otp` (API Gateway) apunta a la clave.
8. **Primer acceso.** Las dos personas entran por enlace mágico (comprobar que el correo llega y no cae en spam).
9. **Comprobación local.** En `.env.local` poner `PROD_BASE_URL` (URL pública `https`, sin barra final). Ejecutar `pnpm test:prod:login` (se abre un navegador: pedir el enlace, pegarlo en esa misma ventana) y después `pnpm test:prod`. Luego, **a mano**, Authentication > Users debe mostrar exactamente 2 usuarios: así se confirma que la sonda con un correo no permitido no creó ninguno.
10. **Protección de rama.** Settings > Branches > `main`: exigir PR y los checks `Lint, typecheck, unit tests and build` y `Database tests and E2E`.

## Recapturar la sesión

`pnpm test:prod` guarda de vuelta las cookies renovadas en `playwright/.auth/prod.json` (ignorado por git). Si el mensaje es `Prod session expired or revoked: run pnpm test:prod:login`, la sesión caducó o se revocó (un cierre de sesión es global): ejecutar `pnpm test:prod:login` y repetir. Ese archivo contiene cookies: no se comparte ni se sube.

## Importación en producción (paso 2.3)

Se hace una sola vez, a mano y desde tu máquina. El workflow de copias (sección siguiente) debe existir antes: la primera copia es el punto de retorno.

> **Aviso: NUNCA hay que volver a ejecutar la importación después del cambio a producción.** Una segunda ejecución duplicaría títulos o resucitaría los que se borraron en la aplicación (no hay lápidas; queda fuera de alcance). Una vez que las personas usan la web, los datos se corrigen en la aplicación o con SQL, no reimportando.

1. **Copia de base.** Con el secreto `BACKUP_AGE_RECIPIENT` ya creado (ver «Copias de seguridad»), lanzar el workflow *Backup database* con *Run workflow* y comprobar que termina en verde. Es el punto de retorno previo a la importación.
2. **Variable.** En `.env.local` definir `IMPORT_DB_URL` con la cadena del *pooler* del proyecto alojado (*Connect* > *Session pooler*), con la forma `postgresql://<usuario>:<contraseña>@<host-del-pooler>:5432/postgres`. En el panel: botón *Connect* > *Method* > **Session pooler**. El host directo (`db.<ref>.supabase.co`) es solo IPv6 y falla con `ENOTFOUND` en redes sin IPv6; el *pooler* de sesión funciona por IPv4. Nunca se escribe en un archivo versionado ni en este documento. El nombre (sin valor) va en `.env.example`.
3. **Ensayo.** `pnpm import:excel --file <ruta-al-xlsx> --dry-run`. No escribe en la base. Revisar el informe de `import-reports/` entero (filas dudosas, sin enlazar con TMDB, omitidas).
4. **Importación real.** `pnpm import:excel --file <ruta-al-xlsx>`. Una sola vez.
5. **Verificar.** Comparar los recuentos del informe con la base (`select kind, count(*) from public.titles group by kind;` y `select count(*) from public.title_seasons;`) y con el Excel. Apuntar fechas y cifras en las notas del paso 2.3 de `docs/ROADMAP.md`.
6. **Copia posterior.** Lanzar de nuevo el workflow de copias: es la copia que se usa en el ensayo de restauración.

**Reversión previa al cambio a producción** (nadie ha usado aún la web): como `postgres`, en el editor SQL del panel, `truncate public.title_seasons, public.titles;` y repetir desde el paso 3. **Nunca** se toca `allowed_emails`: borrarla cerraría el acceso de las dos cuentas.

## Copias de seguridad (paso 2.3, D-91)

El workflow `.github/workflows/backup.yml` vuelca la base alojada cada lunes a las 03:17 UTC (o a mano con *Run workflow*), cifra cada volcado con una clave pública de `age` y sube solo ficheros `.age` como artifact con retención de 30 días. El repositorio es público: los artifacts y los logs los puede leer cualquiera con sesión, por eso nunca se sube texto plano. Se vuelcan tres ficheros (roles, esquema y datos con `--use-copy`). El esquema `auth` no se incluye: el volcado de datos se limita al esquema `public` con `-s public` (sin ese filtro, `supabase db dump --data-only` incluye los datos de `auth.*` y `storage.*`; ver D-91). Las copias hechas antes de esta corrección (la del ensayo del 2026-11-03) contienen datos de `auth` y `storage`: solo se restauran en una base local desechable y se aplica únicamente el bloque `public` de `data.sql`.

**Generar el par de claves** (una vez, en tu máquina; en Windows `winget install FiloSottile.age`):

```text
age-keygen -o backup-identity.txt
```

El comando imprime la clave pública (`age1...`) y guarda la identidad privada en `backup-identity.txt`. Hay que guardar **el archivo completo de la identidad, con su línea secreta** (la que empieza por `AGE-SECRET-KEY-1` seguida de la clave), y **no** la clave pública `age1...`: con solo la pública `age -d` falla con «apparent recipient found in identities file».

1. **Secreto.** En GitHub: Settings > Environments > `production` > secreto del *entorno* `BACKUP_AGE_RECIPIENT` con la clave pública (`age1<resto-de-la-clave>`). Solo la pública. Si falta o está mal formada, el workflow falla antes de volcar nada.
2. **Identidad privada.** Se guarda **fuera de línea y en dos copias** en sitios distintos (por ejemplo, un gestor de contraseñas y un disco o llave USB). Nunca va en el repositorio ni en GitHub, ni en este documento. **Si se pierde la identidad privada, todas las copias son irrecuperables**: no existe otra forma de descifrarlas.
3. **Primera ejecución.** *Run workflow* en *Backup database*. Debe subir exactamente tres artifacts `.age` (roles, esquema y datos), con retención de 30 días, y los logs no deben mostrar contenido de los volcados ni secretos. Apuntar la URL de la ejecución y los nombres en las notas del paso 2.3.

**Pausa a los 60 días.** GitHub desactiva los workflows programados cuando el repositorio pasa 60 días sin actividad. Si ocurre, Actions muestra el aviso: se vuelve a activar con *Enable workflow* o lanzando *Run workflow* a mano. Conviene comprobar de vez en cuando que la última copia programada es reciente.

## Restaurar una copia en local (paso 2.3)

Requiere Docker, `pnpm db:start` y la identidad privada (`age`). `psql` no está instalado en local: se usa el del contenedor de la base. Los comandos con redirección `<` se ejecutan en **Git Bash**: PowerShell no admite `<`. En PowerShell el equivalente es `Get-Content -Raw roles.sql | docker exec -i supabase_db_ignacioymaria psql ...` (mismos argumentos de `psql`).

1. **Descargar** los tres ficheros `.age` del artifact (Actions > ejecución > Artifacts) en una carpeta temporal fuera del repositorio.
2. **Descifrar** con la identidad privada (los descifrados son texto plano: se borran al terminar; la copia temporal de la identidad también):

   ```text
   age -d -i <ruta-a-la-identidad> -o roles.sql <fichero-roles>.sql.age
   age -d -i <ruta-a-la-identidad> -o schema.sql <fichero-schema>.sql.age
   age -d -i <ruta-a-la-identidad> -o data.sql <fichero-data>.sql.age
   ```

3. **Base limpia.** `pnpm db:start` y `pnpm db:reset` (reaplica las migraciones desde cero). Después, vaciar el esquema `public` para que el volcado de esquema se aplique sin choques:

   ```text
   docker exec -i supabase_db_ignacioymaria psql -U postgres -d postgres -c "drop schema public cascade; create schema public;"
   ```

4. **Aplicar en este orden**, en Git Bash, con el `psql` del contenedor:

   ```text
   docker exec -i supabase_db_ignacioymaria psql -U postgres -d postgres -v ON_ERROR_STOP=0 < roles.sql
   docker exec -i supabase_db_ignacioymaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < schema.sql
   ```

   El volcado de roles solo contiene `ALTER ROLE ... SET statement_timeout` y un `GRANT SET ON PARAMETER ... TO supabase_realtime_admin`. El único error esperado (y inofensivo) es `permission denied for parameter log_min_messages`, porque el `postgres` local no es superusuario. No aparecen errores «role already exists»; cualquier otro error se revisa. El esquema se aplica sin errores. Los datos se cargan con las restricciones de claves desactivadas para la sesión:

   ```text
   (echo "set session_replication_role = replica;"; cat data.sql) | docker exec -i supabase_db_ignacioymaria psql -U postgres -d postgres -v ON_ERROR_STOP=1
   ```

   No se usa `--single-transaction`: el paso de roles debe tolerar errores (D-91). Con una copia anterior a la corrección de `-s public`, `data.sql` trae también bloques `COPY` de `auth` y `storage`: restaurar solo en una base desechable.
5. **Borrar** `roles.sql`, `schema.sql` y `data.sql` descifrados.
6. **Verificar.** Dos comprobaciones distintas:
   - **Con datos:** comparar los recuentos por tabla con producción (`select count(*)` de `public.titles`, `public.title_seasons` y `public.allowed_emails`). En el ensayo del 2026-11-03 coincidieron: 269 títulos (252 películas y 17 series), 33 temporadas y 2 correos permitidos.
   - **`pnpm test:db` solo sobre una restauración sin datos** (roles y esquema, sin `data.sql`): los tests de pgTAP suponen `allowed_emails` vacía (AC-1.2) e insertan filas de prueba que chocan con `allowed_emails_person_key`, así que sobre datos restaurados fallan. Sobre roles y esquema pasan 295/295.
7. **Limpiar.** `pnpm db:reset` deja la base local como antes del ensayo.

**Respuestas del ensayo (2026-11-03):**

- `pnpm test:db` falla sobre una restauración con datos (ver arriba) y pasa sobre una sin datos.
- `data.sql` no incluye el esquema `supabase_migrations` (solo `COPY` de `auth`, `public` y `storage` en la copia previa a la corrección).
- Tras `drop schema public`, no se pierde nada: el volcado de esquema contiene `GRANT USAGE ON SCHEMA public` y `ALTER DEFAULT PRIVILEGES`, y los permisos y políticas se restauran.

## Reversión

- Importación y copias: ver «Importación en producción» (reversión previa al cambio a producción) y «Copias de seguridad»; para pausar las copias, desactivar el workflow `backup` (Actions > Disable).
- Aplicación: en Vercel, promover el despliegue anterior.
- Migraciones: desactivar el workflow `deploy-migrations` (Actions > Disable). La base se corrige hacia delante con una migración nueva; antes del paso 2.3 la producción está vacía, así que también se puede recrear el proyecto.
- Acceso: para cerrar la entrada, deshabilitar el hook o borrar filas de `allowed_emails`.
