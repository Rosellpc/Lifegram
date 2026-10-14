# Validación de estabilidad

## Perfiles y chat

Desde el feed se puede abrir un perfil pulsando el nombre o la foto de su autor. Los comentarios también enlazan al perfil. En perfiles ajenos se muestran Seguir/Dejar de seguir y Mensaje; el apartado Chat de la navegación abre la bandeja de conversaciones.

Aplicar `supabase/migrations/202610130005_messages.sql` para activar mensajes privados de texto y Realtime. La tabla nueva `direct_messages` evita modificar el esquema `messages` existente. Después ejecutar `pnpm run check:messages` con las dos cuentas de prueba: comprueba entrega en ambas direcciones, persistencia, bloqueo de suplantación y acceso sin sesión. El test de navegador `e2e/messages.spec.ts` simula las respuestas de mensajería para comprobar borradores y reintentos; no certifica entrega Realtime en el backend.

## Versión actual

Se añadieron `/account` (recuperación de contraseña, reenvío de confirmación, cambio de correo y contraseña), edición y eliminación de publicaciones propias, paginación de feed/perfil/guardados, tamaños de imagen adaptados y límites de espera con reintento. Los likes y guardados deshabilitan acciones repetidas mientras se guarda; los comentarios conservan el texto si falla la operación.

Next.js y React se actualizaron dentro de sus versiones principales. El gestor definido para instalaciones reproducibles es pnpm; instalar con `pnpm install --frozen-lockfile`.

Las migraciones están en [supabase/migrations](supabase/migrations/README.md). Deben aplicarse al backend antes de certificar los conteos, el ranking y las políticas nuevas. La función de conteos usa `security invoker`: conserva los permisos del usuario que consulta.

## Pruebas adicionales

```sh
pnpm run check:supabase:security
pnpm run build
pnpm exec playwright install chromium
pnpm run test:e2e
pnpm audit --prod
```

Las pruebas de navegador arrancan una compilación de producción en el puerto 3112. Usan la cuenta de prueba para publicar, dar like, guardar, comentar, recargar para comprobar persistencia, editar, eliminar y cerrar sesión. Limpian los datos creados. Las pruebas de registro, confirmación y recuperación interceptan las respuestas de correo; no certifican SMTP ni la recepción real del enlace. Los tokens y contraseñas no se guardan en trazas.

Para certificar correo real, registrar una cuenta dedicada con confirmación activada, abrir el enlace recibido, cerrar sesión, solicitar recuperación y abrir el segundo enlace antes de actualizar la contraseña. Probar además un enlace caducado. En Supabase hay que autorizar `/account` para los dominios de desarrollo y producción y configurar SMTP.

## Límites de la validación

Las pruebas RLS comprueban modificaciones cruzadas, suplantación al insertar, privacidad de guardados/notificaciones, acceso sin sesión y eliminación ajena en Storage. No sustituyen una auditoría completa de seguridad. El esquema base crea proyectos nuevos; `create table if not exists` conserva tablas existentes y no corrige por sí solo diferencias de esquema. Consultar la guía de migraciones antes de aplicarlas.

La última comprobación previa a aplicar las migraciones confirmó las restricciones de las tablas, pero detectó que una cuenta podía borrar un archivo de otra en Storage. Aplicar `202610130004_storage_guards.sql` y repetir la comprobación. También faltaban `post_counts` y `ranked_post_ids` en el backend.

`pnpm audit --prod` no encontró vulnerabilidades conocidas en las dependencias de producción actualizadas. La auditoría completa identificó un aviso en `braces@3.0.3`, dependencia de desarrollo de ESLint; el registro consultado todavía no publicaba la versión corregida indicada por el aviso. Debe seguirse antes de procesar patrones no confiables en herramientas de desarrollo.

Ejecutar desde la raíz del proyecto. En PowerShell puede usarse `npm.cmd` si la política local bloquea `npm.ps1`.

```sh
npm run typecheck
npm test
npm run lint
npm run build
npm run check:supabase
```

La comprobación de Supabase usa la clave pública configurada y consultas con límite cero. Comprueba Auth, columnas y relaciones sin obtener registros. No certifica las políticas RLS ni los flujos autenticados.

Para validar operaciones autenticadas, configurar cuentas dedicadas de prueba en `.env.local` (archivo ignorado por Git):

```dotenv
SUPABASE_TEST_EMAIL=
SUPABASE_TEST_PASSWORD=
SUPABASE_TEST_EMAIL_2=
SUPABASE_TEST_PASSWORD_2=
```

Ejecutar `npm run check:supabase:auth`. El script prueba login, perfil, imagen pública en Storage, publicación, likes, guardados, comentarios e historias. Con una segunda cuenta prueba seguimiento. Crea datos identificados con UUID y elimina únicamente esos datos al finalizar; conserva seguimientos preexistentes. Si falla la limpieza, informa el identificador para revisión. No comprueba registro por correo, notificaciones, permisos entre usuarios ni interacción visual en navegador.

Antes del despliegue, comprobar en navegador: registro y confirmación de correo, login, cierre de sesión, búsqueda, seguir/dejar de seguir en ambos sentidos, publicaciones, comentarios, guardados, historias y notificaciones. Revisar RLS y reglas de Storage con dos usuarios para confirmar que cada uno solo puede modificar sus propios datos.
