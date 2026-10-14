# Lifegram — Release 0.1.0

Estado: preparado como borrador del primer release; no publicado.
Estas notas pueden utilizarse como descripción del tag v0.1.0 cuando termine
la validación del entorno de producción. La versión coincide con package.json.

## Incluido

- Interfaz clara con superficies Liquid Glass, logo geométrico y favicon LF.
- Autenticación, recuperación de contraseña y gestión del perfil con carga de avatar.
- Búsqueda de personas, perfiles de otros usuarios y seguimiento.
- Publicaciones, likes, comentarios, guardados, edición y eliminación.
- Feed paginado y conteos en la base de datos cuando están aplicadas las funciones SQL.
- Historias de 24 horas y visor de imágenes y video.
- Chat privado de texto con integración Realtime.
- Bandeja de notificaciones, contador de pendientes y acciones de lectura.
- Migraciones SQL, scripts de validación y pruebas automatizadas.

## Instalación y configuración

Consultar [README.md](README.md) y [la guía de migraciones](supabase/migrations/README.md).
Aplicar las seis migraciones en orden tras revisar el esquema remoto y las políticas
existentes. Configurar el bucket images, las variables públicas de Supabase y las URLs
de autenticación del dominio de destino.

No hay una actualización desde un release anterior. Si se utiliza una base del curso,
revisar sus tablas y triggers: create table if not exists no corrige diferencias de esquema.

## Comprobaciones antes de publicar

- [ ] TypeScript, lint, regresiones y compilación en el commit que se etiquetará.
- [ ] Pruebas de navegador en el entorno de prueba.
- [ ] Seis migraciones confirmadas en el backend de destino.
- [ ] Dos cuentas: bloqueo de escritura ajena y privacidad de guardados, mensajes y notificaciones.
- [ ] Storage: bloqueo de borrado y modificación de archivos ajenos.
- [ ] Registro y confirmación mediante correo real.
- [ ] Recuperación de contraseña y enlace caducado.
- [ ] Login, cierre de sesión y foto correcta al cambiar de cuenta.
- [ ] Publicación, edición, eliminación, likes, comentarios y guardados.
- [ ] Historias: creación, reproducción y caducidad.
- [ ] Seguimiento y búsqueda entre cuentas.
- [ ] Mensajes y notificaciones recibidos sin recargar en dos sesiones.
- [ ] Dominio, URLs de retorno y variables de producción configurados.

Mantener estos puntos pendientes hasta obtener evidencia del entorno de destino.
[VALIDACION.md](VALIDACION.md) registra las comprobaciones anteriores y sus límites;
no equivale a una certificación de producción.

## Limitaciones conocidas

- No hay notificaciones push, adjuntos ni confirmaciones de lectura en el chat.
- Los avisos sociales se generan desde los flujos del cliente.
- Las imágenes del bucket público pueden abrirse mediante su URL.
- Las pruebas con respuestas interceptadas no validan Realtime ni RLS en el servidor.
- Queda pendiente confirmar remotamente las migraciones y los controles que señale
  VALIDACION.md, especialmente Storage y las funciones de conteos.

## Publicación

Después de completar la lista, utilizar v0.1.0 como tag y estas notas como cuerpo
del primer release. Este archivo no crea tags, no publica en GitHub y no despliega
la aplicación.
