# Validación de estabilidad

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
