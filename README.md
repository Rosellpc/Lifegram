// Hola cara de bola
# Suplatzigram

Repositorio del frontend para el Curso de Supabase de Platzi. Aplicación inspirada en Instagram construida con Next.js y Supabase como backend.

## Tecnologías

- Frontend: Next.js
- Backend: Supabase (autenticación, base de datos, storage)

## Requisitos

- Node.js >= 16
- Cuenta y proyecto en Supabase

## Instalación (Windows)

1. Clonar e instalar dependencias:
```bash
git clone <repo-url>
cd c:\Dev\Supabase\supabase-fundamentos
npm install
```

2. Crear archivo de entorno `.env.local` en la raíz con las variables de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Iniciar servidor de desarrollo:
```bash
npm run dev
```

Abrir http://localhost:3000

## Scripts disponibles

- npm run dev — Inicia servidor en modo desarrollo
- npm run build — Compila la app para producción
- npm run start — Inicia la versión compilada

## Estructura principal

- /pages — Rutas de Next.js
- /components — Componentes reutilizables
- /lib — Cliente de Supabase y utilidades
- /public — Assets públicos

## Notas sobre Supabase

- Configurar Auth (providers) y reglas RLS según el curso.
- Configurar Storage para subir imágenes (bucket público o con reglas).

## Contribuir

1. Crear branch feature/xxx
2. Hacer PR con descripción clara

## Recursos

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
```// filepath: c:\Dev\Supabase\supabase-fundamentos\README.md
// ...existing code...
# Suplatzigram

Repositorio del frontend para el Curso de Supabase de Platzi. Aplicación inspirada en Instagram construida con Next.js y Supabase como backend.

## Tecnologías

- Frontend: Next.js
- Backend: Supabase (autenticación, base de datos, storage)

## Requisitos

- Node.js >= 16
- Cuenta y proyecto en Supabase

## Instalación (Windows)

1. Clonar e instalar dependencias:
```bash
git clone <repo-url>
cd c:\Dev\Supabase\supabase-fundamentos
npm install
```

2. Crear archivo de entorno `.env.local` en la raíz con las variables de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Iniciar servidor de desarrollo:
```bash
npm run dev
```

Abrir http://localhost:3000

## Scripts disponibles

- npm run dev — Inicia servidor en modo desarrollo
- npm run build — Compila la app para producción
- npm run start — Inicia la versión compilada

## Estructura principal

- /pages — Rutas de Next.js
- /components — Componentes reutilizables
- /lib — Cliente de Supabase y utilidades
- /public — Assets públicos

## Notas sobre Supabase

- Configurar Auth (providers) y reglas RLS según el curso.
- Configurar Storage para subir imágenes (bucket público o con reglas).

## Contribuir

1. Crear branch feature/xxx
2. Hacer PR con descripción clara

## Recursos

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs