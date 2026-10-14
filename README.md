# Lifegram

Red social para compartir publicaciones e historias, descubrir personas y conversar.
Interfaz clara y minimalista con superficies Liquid Glass y un logo geométrico.

## Funciones

- Registro, inicio y cierre de sesión; confirmación de correo y recuperación de contraseña.
- Perfil editable con carga de foto y perfiles públicos para usuarios autenticados.
- Seguimiento, búsqueda de personas y publicaciones.
- Feed paginado, publicaciones con imagen, edición, eliminación, likes, comentarios y guardados.
- Historias con caducidad de 24 horas y visor con navegación, pausa y reproducción de video.
- Mensajes privados de texto y notificaciones de likes, comentarios y nuevos seguidores.
- Contador de actividad sin leer, filtros y acciones para marcar notificaciones como leídas.

El chat y las notificaciones usan Supabase Realtime y requieren las migraciones
correspondientes. Su funcionamiento remoto debe validarse en el proyecto de destino.
Consultar [el estado de validación](VALIDACION.md) y [las notas del primer release](RELEASE.md).

## Tecnologías y requisitos

Next.js 16.4, React 19.3, TypeScript, Tailwind CSS 4 y Supabase
(Auth, PostgreSQL, Storage y Realtime).

- Node.js 20.9 o superior; para despliegue, usar una versión LTS compatible.
- pnpm 11.20.0, indicado en package.json.
- Un proyecto de Supabase.

## Instalación local

Desde la raíz del repositorio:

~~~sh
pnpm install --frozen-lockfile
~~~

Crear .env.local:

~~~dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
~~~

Estas variables se incorporan al cliente: utilizar la clave pública, nunca una
clave administrativa o service_role. Los archivos de entorno están ignorados por Git.

Preparar Supabase siguiendo [la guía de migraciones](supabase/migrations/README.md).
Después:

~~~sh
pnpm dev
~~~

Abrir http://localhost:3000. En PowerShell, usar pnpm.cmd si la política de ejecución
bloquea el script pnpm.ps1. npm también puede ejecutar los scripts; pnpm es el gestor
principal y pnpm-workspace.yaml autoriza los scripts de sharp y unrs-resolver.

## Supabase

Aplicar los archivos de supabase/migrations en orden:

| Migración | Propósito |
| --- | --- |
| 202610130001_schema.sql | Esquema base, índices y creación de perfiles |
| 202610130002_rls.sql | Políticas de acceso de las ocho tablas sociales |
| 202610130003_counts.sql | Conteos y clasificación de publicaciones |
| 202610130004_storage_guards.sql | Restricciones para archivos ajenos |
| 202610130005_messages.sql | Mensajes privados y Realtime |
| 202610130006_notifications.sql | Privacidad, índices y Realtime de notificaciones |

Revisar las políticas y triggers existentes antes de aplicar: la segunda migración
reemplaza políticas de las tablas usadas por la app. La primera conserva tablas
existentes; no adapta automáticamente esquemas incompatibles.

Configurar el bucket público images y sus reglas conforme a las migraciones.
Las imágenes son accesibles por URL pública; los mensajes privados tienen permisos
para emisor y destinatario. La migración de chat crea direct_messages y conserva
la tabla messages existente.

En Supabase Auth, configurar Site URL y autorizar las URLs de retorno a /account
en desarrollo y producción. Configurar confirmación de correo y SMTP para los correos
de registro y recuperación.

## Validación

~~~sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check:supabase
~~~

Para las pruebas autenticadas, añadir cuentas dedicadas a .env.local:

~~~dotenv
SUPABASE_TEST_EMAIL=
SUPABASE_TEST_PASSWORD=
SUPABASE_TEST_EMAIL_2=
SUPABASE_TEST_PASSWORD_2=
~~~

~~~sh
pnpm check:supabase:auth
pnpm check:supabase:security
pnpm check:messages
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
~~~

Las pruebas de navegador usan la compilación de producción en el puerto 3112.
Las pruebas autenticadas crean datos temporales y los limpian; no usar cuentas con
datos importantes. Algunas pruebas interceptan respuestas de Supabase y no certifican
las políticas ni Realtime remotos. Los enlaces de correo deben comprobarse con
mensajes reales recibidos. Ver [VALIDACION.md](VALIDACION.md) para los límites conocidos.

## Preparación para producción

1. Revisar y aplicar migraciones al proyecto Supabase de destino.
2. Ejecutar las comprobaciones de seguridad con dos cuentas, incluido Storage.
3. Validar en navegador los flujos y la recepción de mensajes y notificaciones
   entre dos sesiones sin recargar.
4. Configurar las dos variables públicas en el alojamiento antes de compilar.
5. Configurar el dominio final y las URLs de retorno en Supabase Auth.
6. Ejecutar pnpm build y publicar primero un entorno de prueba.

La aplicación puede ejecutarse con pnpm start después de compilar. Para un alojamiento
compatible con Next.js, el comando de instalación es pnpm install --frozen-lockfile
y el de compilación es pnpm build. No incluir las credenciales de prueba en producción.

## Estructura

| Ruta | Contenido |
| --- | --- |
| app/ | Rutas App Router, componentes, estilos y utilidades |
| app/mocks/posts.ts | Tipo Post compartido; no contiene publicaciones de prueba |
| img/ | Imágenes de respaldo y archivos usados por pruebas |
| public/ | Recursos públicos |
| supabase/migrations/ | SQL y guía de aplicación |
| scripts/ | Regresiones y comprobaciones de Supabase |
| e2e/ | Pruebas de navegador |
| RELEASE.md | Notas y requisitos del primer release |

## Alcance actual

No incluye notificaciones push, adjuntos ni confirmaciones de lectura del chat.
La presencia de migraciones y pruebas locales no certifica el estado del backend remoto.
La aprobación para publicar la primera versión depende de las comprobaciones descritas
en RELEASE.md.
