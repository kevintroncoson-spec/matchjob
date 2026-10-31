# 💼 LaborApp

> Plataforma de búsqueda laboral estilo Instagram — postula con un ❤️

LaborApp conecta candidatos con empresas de forma radical. Los candidatos hacen scroll por ofertas que hacen match con su perfil y postulan con un simple like. Las empresas reciben notificaciones en tiempo real y gestionan candidatos desde un dashboard dedicado.

## Stack

**Next.js 14 · TypeScript · Supabase · Tailwind CSS · Claude AI · Resend · Vercel**

## Inicio rápido

```bash
git clone https://github.com/TU_USUARIO/laborapp.git
cd laborapp
npm install
cp .env.example .env.local
# Completar variables en .env.local
npm run dev
```

## Documentación completa

Ver [`docs/TECHNICAL.md`](docs/TECHNICAL.md) para:
- Instalación detallada paso a paso
- Configuración de Supabase, OAuth, APIs
- Arquitectura y flujos de la app
- Endpoints de la API
- Esquema de base de datos
- Deploy en Vercel

## Estructura

```
src/app/          → Páginas y API Routes (Next.js App Router)
src/components/   → Componentes React reutilizables
src/hooks/        → Hooks personalizados
src/lib/          → Supabase, matching IA, emails, utilidades
supabase/         → Migraciones SQL
docs/             → Documentación técnica
```

## Licencia

MIT © 2026 LaborApp
