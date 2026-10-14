# Aplicación de migraciones

## Mensajes privados

`202610130005_messages.sql` añade `direct_messages`, sus políticas RLS y la publicación Realtime. No toca la tabla `messages` que pueda existir en el proyecto. Ejecutar este archivo para activar el chat y después `pnpm run check:messages` con dos cuentas de prueba. La comprobación prueba entrega en ambas direcciones, lectura del historial, bloqueo de suplantación y acceso anónimo, y limpia únicamente sus mensajes temporales.

Los mensajes solo son visibles para emisor y destinatario. El chat permite enviar texto (hasta 2000 caracteres), conserva el borrador si falla y carga el historial por páginas. Se vuelve a sincronizar al reconectar. No incluye adjuntos, confirmaciones de lectura ni notificaciones push.

Ejecutar los seis archivos SQL en orden en SQL Editor de Supabase, o en un proyecto vinculado mediante `supabase db push`.

1. `202610130001_schema.sql`: esquema para proyectos nuevos, índices, perfiles de usuarios existentes y trigger para nuevos registros.
2. `202610130002_rls.sql`: reemplaza las políticas de las ocho tablas usadas por Lifegram; no modifica filas. Contenido social visible a cuentas autenticadas; guardados y notificaciones privados. Restringe escritura al propietario.
3. `202610130003_counts.sql`: agregación de conteos con RLS del usuario, sin descargar filas.
4. `202610130004_storage_guards.sql`: impide modificar archivos ajenos incluso si hay políticas antiguas permisivas sobre el bucket images. Conserva el acceso público a las imágenes mediante su URL pública.

5. 202610130005_messages.sql: tabla direct_messages, permisos privados y publicación Realtime.
6. 202610130006_notifications.sql: índices, permisos privados y publicación Realtime de notificaciones.

El esquema existente se conserva con `create table if not exists`; esto no certifica que coincida con el esquema base. Para registrar el esquema remoto exacto, usar `supabase db pull` en un proyecto vinculado. Revisar antes de aplicar en producción, especialmente políticas personalizadas o triggers existentes de creación de perfiles.

En Auth → URL Configuration autorizar `http://localhost:3000/account` y la ruta `/account` del dominio de producción. Habilitar confirmación de correo y configurar SMTP. Los enlaces de confirmación y recuperación requieren un correo recibido y abierto; no se verifican solo con pruebas de API.

Después ejecutar `npm run check:supabase:auth` y `npm run check:supabase:security` con dos cuentas dedicadas. La validación de seguridad crea datos temporales propios, intenta modificaciones cruzadas y verifica limpieza. No usar cuentas con datos importantes.

## Notificaciones
Ejecutar después de las migraciones anteriores 202610130006_notifications.sql.
Añade índices para la bandeja y el contador de pendientes, limita la lectura y
actualización al destinatario y publica notifications en supabase_realtime.
La app conserva la generación existente de avisos de likes, comentarios y seguidores.
El cliente consulta el contador con COUNT, carga páginas de 30 avisos y vuelve a
consultar al recibir eventos, recuperar el foco o cada 30 segundos con la pestaña visible.
Validar con dos cuentas que el destinatario recibe el aviso sin recargar y que
la otra cuenta no puede leerlo ni marcarlo. La prueba de interfaz intercepta las
peticiones de notificaciones: no demuestra que la publicación remota esté aplicada.
