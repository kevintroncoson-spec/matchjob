# 🚀 Guía de publicación de LaborApp

Esta guía te lleva de cero a tener LaborApp publicada y funcionando **gratis**. Sigue los pasos en orden. Tiempo total estimado: ~1 hora.

---

## Resumen de lo que vas a publicar

Un solo proyecto que sirve **tres portales + la app**:

| URL | Para quién | Qué hace |
|-----|-----------|----------|
| `tudominio.cl` | Candidato | App instalable (PWA): feed, postulaciones, alertas, perfil |
| `tudominio.cl/empresa` | Empresa | Registro, publicar ofertas, gestionar candidatos |
| `tudominio.cl/admin` | Tú | Aprobar empresas, moderar, ver métricas |

Todo gratis con: **Supabase** (base de datos) + **Vercel** (hosting) + **PWA** (la app).

---

## Paso 1 — Crear la base de datos en Supabase (~10 min)

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta (puedes usar tu GitHub).
2. Click en **New Project**. Ponle nombre `laborapp-prod`, elige una contraseña fuerte para la base de datos (guárdala), y región **South America (São Paulo)** que es la más cercana a Chile.
3. Espera ~2 min a que se cree el proyecto.
4. En el menú lateral, ve a **SQL Editor** → **New query**.
5. Abre el archivo `supabase/migrations/001_initial_schema.sql` de este proyecto, copia **todo** su contenido, pégalo y click **Run**.
6. Repite con `supabase/migrations/002_roles_and_admin.sql`: nueva query, pega todo, **Run**.
7. Ve a **Project Settings** (engranaje) → **API**. Copia y guarda estos tres valores:
   - `Project URL`
   - `anon public` key
   - `service_role` key (secreta, no la compartas)

---

## Paso 2 — Configurar el login con Google (~15 min)

1. Entra a [console.cloud.google.com](https://console.cloud.google.com).
2. Crea un proyecto nuevo (arriba a la izquierda, "Select a project" → "New Project"). Nómbralo `LaborApp`.
3. Ve a **APIs & Services** → **OAuth consent screen**. Elige **External**, completa nombre de la app (`LaborApp`), tu email de soporte, y guarda.
4. Ve a **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
5. Tipo: **Web application**. En **Authorized redirect URIs** agrega exactamente:
   ```
   https://TU-PROYECTO.supabase.co/auth/v1/callback
   ```
   (reemplaza `TU-PROYECTO` con el de tu Project URL de Supabase)
6. Copia el **Client ID** y el **Client Secret**.
7. Vuelve a Supabase → **Authentication** → **Providers** → **Google**. Pégalos y activa el toggle. **Save**.

### LinkedIn (opcional, similar)
1. Entra a [linkedin.com/developers](https://linkedin.com/developers) → **Create app**.
2. Completa los datos, en **Auth** agrega el mismo redirect URI de arriba.
3. Solicita los scopes `openid`, `profile`, `email`.
4. Copia Client ID y Secret → Supabase → Providers → **LinkedIn (OIDC)** → pega y activa.

---

## Paso 3 — Subir el código a GitHub (~10 min)

1. Crea una cuenta en [github.com](https://github.com) si no tienes.
2. Crea un repositorio nuevo llamado `laborapp` (privado está bien).
3. En tu computador, dentro de la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "LaborApp inicial"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/laborapp.git
   git push -u origin main
   ```

---

## Paso 4 — Publicar en Vercel (~10 min)

1. Entra a [vercel.com](https://vercel.com) y crea cuenta con tu GitHub.
2. Click **Add New** → **Project** → importa tu repo `laborapp`.
3. Antes de hacer deploy, ve a **Environment Variables** y agrega estas (las de los pasos anteriores):

   ```
   NEXT_PUBLIC_SUPABASE_URL       = https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = tu-anon-key
   SUPABASE_SERVICE_ROLE_KEY      = tu-service-role-key
   NEXT_PUBLIC_APP_URL            = https://tu-proyecto.vercel.app
   ANTHROPIC_API_KEY              = sk-ant-... (opcional, para IA)
   RESEND_API_KEY                 = re_... (opcional, para emails)
   RESEND_FROM_EMAIL              = notificaciones@tudominio.cl
   ```
4. Click **Deploy**. En ~2 min tendrás una URL pública tipo `laborapp.vercel.app`.
5. **Importante:** vuelve a Supabase → **Authentication** → **URL Configuration** y pon:
   - Site URL: `https://laborapp.vercel.app`
   - Redirect URLs: `https://laborapp.vercel.app/auth/callback`

---

## Paso 5 — Convertirte en administrador (~2 min)

1. Entra a tu app publicada e inicia sesión con Google (esto crea tu perfil).
2. Ve a Supabase → **Authentication** → **Users**, copia tu `User UID`.
3. Ve a **SQL Editor** y corre (reemplazando el ID):
   ```sql
   UPDATE public.profiles SET type = 'admin' WHERE user_id = 'TU_USER_UID';
   ```
4. Ahora entra a `https://laborapp.vercel.app/admin` — verás tu panel de administrador.

---

## Paso 6 — Dominio propio (opcional, ~5 min + costo del dominio)

1. Compra un dominio (`laborapp.cl` en [nic.cl](https://nic.cl), ~$10.000 CLP/año).
2. En Vercel → tu proyecto → **Settings** → **Domains** → agrega tu dominio.
3. Vercel te dará unos registros DNS que debes poner en tu proveedor del dominio.
4. Actualiza `NEXT_PUBLIC_APP_URL` y las URLs de Supabase con el nuevo dominio.

---

## ✅ Checklist final

- [ ] Base de datos creada y migraciones corridas
- [ ] Login con Google funcionando
- [ ] Código en GitHub
- [ ] Deploy en Vercel con variables de entorno
- [ ] URLs de auth actualizadas en Supabase
- [ ] Tu cuenta convertida en admin
- [ ] (Opcional) Dominio propio conectado

---

## Cómo se instala la app (PWA) en el teléfono

Cuando un candidato entra a tu URL desde el celular:
- **Android/Chrome:** aparece automáticamente "Agregar a pantalla de inicio"
- **iPhone/Safari:** botón compartir → "Agregar a pantalla de inicio"

Queda con ícono propio y abre a pantalla completa, como una app nativa.

---

## Costos (todo en plan gratuito)

| Servicio | Plan gratis incluye | Cuándo pagar |
|----------|--------------------|--------------| 
| Supabase | 500MB BD, 50K usuarios/mes | Al crecer: $25/mes |
| Vercel | 100GB tráfico/mes | Casi nunca al inicio |
| Anthropic (IA) | — | Por uso, ~$0.01/análisis |
| Resend (emails) | 100 emails/día | Al crecer: $20/mes |

Puedes lanzar y validar la idea **sin gastar nada** (salvo el dominio si lo quieres).
