# 💼 LaborApp — Documentación Técnica Completa

> Plataforma de búsqueda laboral estilo Instagram. Postula con un ❤️.

---

## Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Server Components, API Routes, middleware integrado |
| **Lenguaje** | TypeScript | Tipado estático, autocompletado, menos bugs en producción |
| **Estilos** | Tailwind CSS | Utilidades atómicas, consistencia, bundle pequeño |
| **Base de datos** | PostgreSQL via Supabase | RLS, Realtime, Auth, Storage en una sola plataforma |
| **Autenticación** | Supabase Auth (OAuth) | Google + LinkedIn sin gestionar credenciales |
| **Realtime** | Supabase Realtime | Notificaciones instantáneas al dashboard de empresa |
| **Motor IA** | Anthropic Claude (Sonnet) | Análisis de match e insights para candidatos |
| **Email** | Resend | Notificaciones a empresas por cada postulación |
| **Data fetching** | TanStack Query v5 | Caché, scroll infinito, estados de carga |
| **Deploy** | Vercel | CI/CD automático desde GitHub, edge functions |

---

## Estructura del proyecto

```
laborapp/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing (login Google/LinkedIn)
│   │   ├── layout.tsx                  # Root layout + fuentes
│   │   ├── providers.tsx               # React Query provider
│   │   ├── globals.css                 # Tailwind + animaciones
│   │   ├── auth/callback/route.ts      # Callback OAuth → crea perfil
│   │   ├── feed/page.tsx               # Feed de ofertas (candidatos)
│   │   ├── dashboard/page.tsx          # Dashboard empresa
│   │   ├── onboarding/page.tsx         # Wizard 5 pasos (a crear)
│   │   └── api/
│   │       ├── jobs/route.ts           # GET feed con paginación cursor
│   │       ├── applications/route.ts   # POST like → postular
│   │       ├── dashboard/route.ts      # GET/PATCH candidatos empresa
│   │       ├── alerts/route.ts         # CRUD alertas por tags
│   │       └── ai/match/route.ts       # POST análisis IA con Claude
│   ├── components/
│   │   ├── ui/
│   │   │   ├── MatchRing.tsx           # SVG anillo de porcentaje
│   │   │   ├── Toast.tsx               # Notificación flotante
│   │   │   └── BenefitBadge.tsx        # Píldora de beneficio con ícono
│   │   ├── feed/
│   │   │   └── JobCard.tsx             # Tarjeta de oferta laboral
│   │   └── dashboard/
│   │       └── CandidateCard.tsx       # Tarjeta de candidato (empresa)
│   ├── hooks/
│   │   ├── useInfiniteJobs.ts          # Scroll infinito con React Query
│   │   ├── useToast.ts                 # Toast con timer persistente
│   │   └── useRealtime.ts              # Suscripción Supabase Realtime
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Cliente browser + helpers OAuth
│   │   │   ├── server.ts               # Clientes server/route/admin
│   │   │   └── database.types.ts       # Tipos TypeScript del esquema
│   │   ├── matching.ts                 # Motor match local + análisis Claude
│   │   ├── email.ts                    # Emails con Resend
│   │   └── utils.ts                    # cn(), timeAgo(), BENEFIT_DATA...
│   ├── types/index.ts                  # Tipos globales de la app
│   └── middleware.ts                   # Protección de rutas
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # Esquema completo + RLS + triggers
├── public/                             # Assets estáticos
├── .env.example                        # Template de variables de entorno
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Instalación y configuración local

### 1. Clonar y dependencias
```bash
git clone https://github.com/TU_USUARIO/laborapp.git
cd laborapp
npm install
cp .env.example .env.local
```

### 2. Configurar Supabase
1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `supabase/migrations/001_initial_schema.sql`
3. Copiar `Project URL` y `anon key` a `.env.local`
4. En **Authentication → Providers**, activar:
   - **Google** → pegar Client ID y Secret de [console.cloud.google.com](https://console.cloud.google.com)
   - **LinkedIn** → pegar Client ID y Secret de [linkedin.com/developers](https://linkedin.com/developers)
5. Redirect URI para ambos: `https://[tu-proyecto].supabase.co/auth/v1/callback`
6. En **Database → Replication**, activar la tabla `applications` para Realtime

### 3. Configurar APIs externas
```bash
# Anthropic (para análisis de match con IA)
# Obtener en: console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# Resend (para emails de notificación)
# Obtener en: resend.com — plan gratuito 100 emails/día
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notificaciones@tudominio.cl
```

### 4. Correr en desarrollo
```bash
npm run dev
# Abrir http://localhost:3000
```

---

## Flujo de la aplicación

### Candidato
```
Landing → Login Google/LinkedIn
       → Auth Callback → Crear perfil en Supabase
       → Onboarding 5 pasos (renta, modalidad, traslado, disponibilidad, beneficios)
       → Feed de ofertas con scroll infinito
       → Click ❤️ → POST /api/applications → Email a empresa → Toast confirmación
       → Click 🤖 → POST /api/ai/match → Análisis Claude → Mostrar insights
       → Gestionar alertas por tags
```

### Empresa
```
Landing → Login Google/LinkedIn → Tipo: company
       → Dashboard candidatos
       → Realtime: nueva postulación → Notificación badge + toast
       → Ver perfil candidato (preferencias del onboarding)
       → Cambiar estado: visto / guardado / descartado / contactar
       → Activar recordatorio por candidato
       → Gestionar alertas por skills
       → Analytics de sus ofertas
```

---

## API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/jobs` | Feed paginado por cursor | Opcional |
| `POST` | `/api/applications` | Like = postular (toggle) | Candidato |
| `DELETE` | `/api/applications` | Retirar postulación | Candidato |
| `GET` | `/api/dashboard` | Candidatos de la empresa | Empresa |
| `PATCH` | `/api/dashboard` | Cambiar estado candidato | Empresa |
| `GET` | `/api/alerts` | Listar alertas del usuario | Usuario |
| `POST` | `/api/alerts` | Crear/actualizar alertas | Usuario |
| `DELETE` | `/api/alerts?tag=` | Eliminar tag de alertas | Usuario |
| `POST` | `/api/ai/match` | Análisis IA con Claude | Candidato |

---

## Base de datos (Supabase PostgreSQL)

### Tablas principales
- **profiles** — Candidatos y empresas (tipo diferenciado)
- **jobs** — Ofertas publicadas por empresas
- **applications** — Postulaciones (like candidato → oferta)
- **alerts** — Alertas por tags (candidatos y empresas)

### Seguridad (Row Level Security)
- Candidatos solo ven y modifican sus propias postulaciones
- Empresas solo ven postulaciones a sus propias ofertas
- Trigger automático crea perfil al registrarse

---

## Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Variables de entorno en producción:
# vercel env add NEXT_PUBLIC_SUPABASE_URL
# vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# (agregar todas las del .env.example)
```

### Configuración OAuth en producción
Actualizar en Supabase → Authentication → URL Configuration:
- **Site URL:** `https://laborapp.cl`
- **Redirect URLs:** `https://laborapp.cl/auth/callback`

---

## Próximas funcionalidades

- [ ] Página de onboarding completa (`/onboarding/page.tsx`)
- [ ] Perfil del candidato editable (`/perfil/page.tsx`)
- [ ] Creación de ofertas por empresa (`/dashboard/nueva-oferta`)
- [ ] Sistema de mensajería interno
- [ ] PWA: manifest.json + service worker
- [ ] App móvil nativa con React Native / Expo
- [ ] Registro de empresa en INAPI (clase 35)
- [ ] Política de privacidad (Ley 19.628 Chile)

---

## Registro de decisiones técnicas

**¿Por qué Next.js en lugar de React + Express separados?**
Un solo repo, deploy en un click en Vercel, API Routes colocadas con el frontend, Server Components para SEO.

**¿Por qué Supabase en lugar de Firebase?**
PostgreSQL es más maduro para queries complejas, RLS es más granular que Firestore rules, y Realtime nativo elimina la necesidad de WebSockets custom.

**¿Por qué TanStack Query para el feed?**
El scroll infinito con `useInfiniteQuery` + `getNextPageParam` es trivial de implementar. El caché automático evita re-fetches innecesarios al cambiar de tab.

**¿Por qué Resend en lugar de SES/SendGrid?**
API minimalista, plan gratuito generoso (100 emails/día), excelente DX con TypeScript nativo.
