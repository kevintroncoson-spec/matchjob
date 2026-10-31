-- ============================================================
-- LaborApp — Esquema completo de base de datos
-- Ejecutar en Supabase SQL Editor o con supabase db push
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLA: profiles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  role                  TEXT,
  location              TEXT,
  avatar_url            TEXT,
  bio                   TEXT,
  type                  TEXT NOT NULL CHECK (type IN ('candidate', 'company')) DEFAULT 'candidate',

  -- Campos onboarding candidato
  salary_min            INTEGER,                      -- CLP mensual
  salary_max            INTEGER,
  modality              TEXT CHECK (modality IN ('remote','hybrid','onsite','flexible')),
  max_commute_minutes   INTEGER DEFAULT 0,
  availability_days     INTEGER DEFAULT 0,
  expected_benefits     TEXT[]  DEFAULT '{}',
  skills                TEXT[]  DEFAULT '{}',

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

-- ─── TABLA: jobs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  tags          TEXT[] DEFAULT '{}',
  benefits      TEXT[] DEFAULT '{}',
  location      TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'Full-time',
  salary_min    INTEGER,
  salary_max    INTEGER,
  active        BOOLEAN DEFAULT TRUE,
  views         INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLA: applications ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.applications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('new','viewed','saved','rejected')) DEFAULT 'new',
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Un candidato solo puede postular una vez a cada oferta
  CONSTRAINT applications_unique UNIQUE (job_id, candidate_id)
);

-- ─── TABLA: alerts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alerts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tags       TEXT[] DEFAULT '{}',
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ÍNDICES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_company    ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_active     ON public.jobs(active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_job        ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_candidate  ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_apps_status     ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_alerts_user     ON public.alerts(user_id, active);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts       ENABLE ROW LEVEL SECURITY;

-- PROFILES: lectura pública, escritura solo propio perfil
CREATE POLICY "profiles_read_all"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_write_own"  ON public.profiles FOR ALL   USING (auth.uid() = user_id);

-- JOBS: lectura pública activos, escritura solo empresa dueña
CREATE POLICY "jobs_read_active"  ON public.jobs FOR SELECT USING (active = true);
CREATE POLICY "jobs_write_own"    ON public.jobs FOR ALL USING (
  company_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- APPLICATIONS: candidato ve las suyas; empresa ve las de sus ofertas
CREATE POLICY "apps_candidate_own" ON public.applications FOR SELECT USING (
  candidate_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "apps_company_own"   ON public.applications FOR SELECT USING (
  job_id IN (
    SELECT j.id FROM public.jobs j
    JOIN public.profiles p ON p.id = j.company_id
    WHERE p.user_id = auth.uid()
  )
);
CREATE POLICY "apps_insert_candidate" ON public.applications FOR INSERT WITH CHECK (
  candidate_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "apps_update_company" ON public.applications FOR UPDATE USING (
  job_id IN (
    SELECT j.id FROM public.jobs j
    JOIN public.profiles p ON p.id = j.company_id
    WHERE p.user_id = auth.uid()
  )
);

-- ALERTS: solo el propio usuario
CREATE POLICY "alerts_own" ON public.alerts FOR ALL USING (auth.uid() = user_id);

-- ─── REALTIME ────────────────────────────────────────────────
-- Habilitar Realtime en applications para notificaciones instantáneas
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;

-- ─── FUNCIONES ───────────────────────────────────────────────

-- Trigger: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, avatar_url, type, skills, expected_benefits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'candidate',
    '{}',
    '{}'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función: incrementar views de oferta
CREATE OR REPLACE FUNCTION public.increment_job_views(job_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.jobs SET views = views + 1 WHERE id = job_id;
END;
$$;

-- Función: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- LaborApp — Migración 002: Roles, aprobación de empresas y admin
-- Ejecutar DESPUÉS de 001_initial_schema.sql
-- ============================================================

-- ─── 1. AGREGAR ROL 'admin' Y ESTADO DE APROBACIÓN ───────────

-- Ampliar el tipo de perfil para incluir 'admin'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_type_check
  CHECK (type IN ('candidate', 'company', 'admin'));

-- Estado de aprobación (aplica principalmente a empresas)
-- pending  = registrada, esperando tu aprobación
-- approved = puede publicar ofertas
-- rejected = rechazada
-- suspended = suspendida después de aprobar
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Datos adicionales de empresa
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_rut       TEXT,      -- RUT de la empresa (Chile)
  ADD COLUMN IF NOT EXISTS company_website   TEXT,
  ADD COLUMN IF NOT EXISTS company_size      TEXT,      -- '1-10', '11-50', etc.
  ADD COLUMN IF NOT EXISTS company_industry  TEXT,
  ADD COLUMN IF NOT EXISTS contact_email     TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone     TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,      -- si la rechazas, por qué
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by       UUID REFERENCES public.profiles(id);

-- Las empresas nuevas entran como 'pending'. Los candidatos siguen 'approved'.
-- Actualizamos el trigger más abajo.

-- ─── 2. DATOS DE CONTACTO Y EXPERIENCIA DEL CANDIDATO ────────

-- Teléfono del candidato (visible a empresa solo si postuló)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Experiencia laboral (últimas 2, como en el prototipo)
CREATE TABLE IF NOT EXISTS public.work_experience (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name  TEXT NOT NULL,
  role          TEXT NOT NULL,
  start_date    DATE,
  end_date      DATE,           -- NULL = trabajo actual
  is_current    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_exp_profile ON public.work_experience(profile_id);

-- ─── 3. TABLA DE NOTIFICACIONES ──────────────────────────────
-- Para el centro de notificaciones del candidato
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('viewed','saved','rejected','message','new_job','system')),
  title         TEXT NOT NULL,
  body          TEXT,
  company_name  TEXT,
  job_title     TEXT,
  read          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id, read, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─── 4. TABLA DE MENSAJES (empresa → candidato) ──────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_profile  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_profile    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  body          TEXT NOT NULL,
  read          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_to ON public.messages(to_profile, created_at DESC);

-- ─── 5. TABLA DE AUDITORÍA (para el admin) ───────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,       -- 'approve_company','suspend_company','delete_job', etc.
  target_type   TEXT,                -- 'company','job','candidate'
  target_id     UUID,
  detail        JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);

-- ─── 6. HELPER: ¿el usuario actual es admin? ─────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND type = 'admin'
  );
$$;

-- ─── 7. ACTUALIZAR RLS PARA APROBACIÓN Y ADMIN ───────────────

-- JOBS: el feed del candidato SOLO muestra ofertas de empresas aprobadas
DROP POLICY IF EXISTS "jobs_read_active" ON public.jobs;
CREATE POLICY "jobs_read_approved" ON public.jobs FOR SELECT USING (
  active = true
  AND company_id IN (
    SELECT id FROM public.profiles WHERE type = 'company' AND status = 'approved'
  )
);

-- JOBS: una empresa solo puede crear/editar ofertas si está aprobada
DROP POLICY IF EXISTS "jobs_write_own" ON public.jobs;
CREATE POLICY "jobs_write_approved" ON public.jobs FOR ALL USING (
  company_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid() AND type = 'company' AND status = 'approved'
  )
);

-- ADMIN: puede ver y modificar TODOS los perfiles
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (public.is_admin());

-- ADMIN: puede ver y modificar TODAS las ofertas
CREATE POLICY "jobs_admin_all" ON public.jobs FOR ALL USING (public.is_admin());

-- ADMIN: puede ver todas las postulaciones
CREATE POLICY "apps_admin_all" ON public.applications FOR SELECT USING (public.is_admin());

-- NOTIFICATIONS: cada quien ve las suyas; admin ve todas
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own"   ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notif_admin" ON public.notifications FOR SELECT USING (public.is_admin());

-- MESSAGES: emisor y receptor pueden ver; admin también
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_participant" ON public.messages FOR SELECT USING (
  from_profile IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR to_profile IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "msg_send" ON public.messages FOR INSERT WITH CHECK (
  from_profile IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- WORK EXPERIENCE: lectura pública, escritura solo dueño
ALTER TABLE public.work_experience ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workexp_read"  ON public.work_experience FOR SELECT USING (true);
CREATE POLICY "workexp_write" ON public.work_experience FOR ALL USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- AUDIT LOG: solo admin
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin" ON public.audit_log FOR ALL USING (public.is_admin());

-- ─── 8. ACTUALIZAR TRIGGER DE NUEVO USUARIO ──────────────────
-- Los candidatos entran 'approved'; el tipo se define en onboarding.
-- Las empresas se marcan 'pending' cuando eligen tipo 'company'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, avatar_url, type, status, skills, expected_benefits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'candidate',   -- por defecto candidato; cambia a 'company' en registro empresa
    'approved',    -- candidatos aprobados automáticamente
    '{}',
    '{}'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─── 9. FUNCIÓN: aprobar empresa (usada por el admin) ────────
CREATE OR REPLACE FUNCTION public.approve_company(company_profile_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_profile_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede aprobar empresas';
  END IF;

  SELECT id INTO admin_profile_id FROM public.profiles WHERE user_id = auth.uid();

  UPDATE public.profiles
  SET status = 'approved', approved_at = NOW(), approved_by = admin_profile_id
  WHERE id = company_profile_id AND type = 'company';

  INSERT INTO public.audit_log (actor_id, action, target_type, target_id)
  VALUES (admin_profile_id, 'approve_company', 'company', company_profile_id);
END;
$$;

-- ─── 10. FUNCIÓN: rechazar/suspender empresa ─────────────────
CREATE OR REPLACE FUNCTION public.set_company_status(
  company_profile_id UUID,
  new_status TEXT,
  reason TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_profile_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede cambiar el estado';
  END IF;

  SELECT id INTO admin_profile_id FROM public.profiles WHERE user_id = auth.uid();

  UPDATE public.profiles
  SET status = new_status, rejection_reason = reason
  WHERE id = company_profile_id AND type = 'company';

  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, detail)
  VALUES (admin_profile_id, 'set_status_' || new_status, 'company', company_profile_id,
          jsonb_build_object('reason', reason));
END;
$$;

-- ─── 11. VISTA DE MÉTRICAS PARA EL ADMIN ─────────────────────
CREATE OR REPLACE VIEW public.admin_stats AS
SELECT
  (SELECT COUNT(*) FROM public.profiles WHERE type = 'candidate') AS total_candidates,
  (SELECT COUNT(*) FROM public.profiles WHERE type = 'company') AS total_companies,
  (SELECT COUNT(*) FROM public.profiles WHERE type = 'company' AND status = 'pending') AS pending_companies,
  (SELECT COUNT(*) FROM public.profiles WHERE type = 'company' AND status = 'approved') AS approved_companies,
  (SELECT COUNT(*) FROM public.jobs WHERE active = true) AS active_jobs,
  (SELECT COUNT(*) FROM public.applications) AS total_applications,
  (SELECT COUNT(*) FROM public.applications WHERE created_at > NOW() - INTERVAL '7 days') AS applications_last_week,
  (SELECT COUNT(*) FROM public.profiles WHERE type = 'candidate' AND created_at > NOW() - INTERVAL '7 days') AS new_candidates_last_week;

-- ============================================================
-- Para crear TU cuenta de admin manualmente después de registrarte:
--   UPDATE public.profiles SET type = 'admin' WHERE user_id = 'TU_USER_ID';
-- (obtienes tu USER_ID desde Authentication → Users en Supabase)
-- ============================================================


-- ============================================================
-- LaborApp — Datos de ejemplo (seed) para demostración
-- Ejecutar DESPUÉS de 001 y 002, en el SQL Editor de Supabase
-- ============================================================
--
-- ENFOQUE: los perfiles demo no son usuarios reales de login, así que
-- desactivamos temporalmente la validación de clave foránea a auth.users,
-- insertamos los datos, y la reactivamos. Esto NO afecta a los usuarios
-- reales que se registren con Google/LinkedIn después.
--
-- Todo lleva bio con prefijo [DEMO] para poder borrarlo fácil.
-- ============================================================

-- ─── LIMPIAR DATOS DEMO PREVIOS (por si re-ejecutas) ─────────
DELETE FROM public.applications WHERE candidate_id IN (SELECT id FROM public.profiles WHERE bio LIKE '[DEMO]%');
DELETE FROM public.work_experience WHERE profile_id IN (SELECT id FROM public.profiles WHERE bio LIKE '[DEMO]%');
DELETE FROM public.jobs WHERE company_id IN (SELECT id FROM public.profiles WHERE bio LIKE '[DEMO]%');
DELETE FROM public.profiles WHERE bio LIKE '[DEMO]%';

-- ─── DESACTIVAR TEMPORALMENTE LA FK A auth.users ─────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- ─── EMPRESAS (4 aprobadas + 1 pendiente para probar aprobar) ─
INSERT INTO public.profiles (id, user_id, name, type, status, bio, location, company_rut, company_website, company_size, company_industry, contact_email, contact_phone)
VALUES
  ('11111111-0000-0000-0000-000000000001', uuid_generate_v4(), 'Nubank Chile', 'company', 'approved', '[DEMO] Fintech líder en Latam', 'Santiago', '76.111.111-1', 'https://nubank.com.br', '500+', 'Finanzas', 'talento@nubank.cl', '+56 2 2345 6789'),
  ('11111111-0000-0000-0000-000000000002', uuid_generate_v4(), 'Betterfly', 'company', 'approved', '[DEMO] Bienestar corporativo', 'Santiago', '76.222.222-2', 'https://betterfly.com', '201-500', 'Tecnología', 'jobs@betterfly.com', '+56 2 2876 5432'),
  ('11111111-0000-0000-0000-000000000003', uuid_generate_v4(), 'Fintual', 'company', 'approved', '[DEMO] Inversiones simples', 'Santiago', '76.333.333-3', 'https://fintual.cl', '51-200', 'Finanzas', 'work@fintual.com', '+56 2 2111 2222'),
  ('11111111-0000-0000-0000-000000000004', uuid_generate_v4(), 'Xepelin', 'company', 'approved', '[DEMO] Capital para empresas', 'Santiago', '76.444.444-4', 'https://xepelin.com', '201-500', 'Finanzas', 'people@xepelin.com', '+56 2 2333 4444'),
  ('11111111-0000-0000-0000-000000000005', uuid_generate_v4(), 'TechStart SpA', 'company', 'pending', '[DEMO] Startup en revisión — pruébame aprobar', 'Valparaíso', '76.555.555-5', 'https://techstart.cl', '11-50', 'Tecnología', 'hola@techstart.cl', '+56 9 8765 4321');

-- ─── CANDIDATOS (4 con perfil completo) ──────────────────────
INSERT INTO public.profiles (id, user_id, name, role, type, status, bio, location, phone, contact_email, skills, salary_min, salary_max, modality, max_commute_minutes, availability_days, expected_benefits)
VALUES
  ('33333333-0000-0000-0000-000000000001', uuid_generate_v4(), 'Ana Contreras', 'UX Designer', 'candidate', 'approved', '[DEMO] Diseñadora con 5 años de experiencia', 'Santiago', '+56 9 8234 5678', 'ana.contreras@gmail.com', ARRAY['Figma','Research','UX','Design Systems','Prototyping'], 1800000, 2500000, 'remote', 0, 0, ARRAY['Seguro de salud','Bonos de desempeño']),
  ('33333333-0000-0000-0000-000000000002', uuid_generate_v4(), 'Martín Rojas', 'Frontend Dev', 'candidate', 'approved', '[DEMO] Desarrollador frontend React', 'Valparaíso', '+56 9 6543 2109', 'martin.rojas@outlook.com', ARRAY['React','TypeScript','Next.js','TailwindCSS'], 1500000, 2000000, 'hybrid', 30, 15, ARRAY['Casino / Alimentación','Bus de acercamiento']),
  ('33333333-0000-0000-0000-000000000003', uuid_generate_v4(), 'Sofía Méndez', 'Product Designer', 'candidate', 'approved', '[DEMO] Product designer enfocada en research', 'Santiago', '+56 9 7788 9900', 'sofia.mendez@me.com', ARRAY['Figma','UX','Research','UI'], 2000000, 2800000, 'remote', 0, 30, ARRAY['Seguro de salud','Stock options']),
  ('33333333-0000-0000-0000-000000000004', uuid_generate_v4(), 'Diego Fuentes', 'Full Stack', 'candidate', 'approved', '[DEMO] Full stack con foco en backend', 'Santiago', '+56 9 7890 1234', 'd.fuentes@gmail.com', ARRAY['React','Node.js','AWS','PostgreSQL','Docker'], 2500000, 3200000, 'hybrid', 45, 30, ARRAY['Casino / Alimentación','Bonos de desempeño']);

-- ─── OFERTAS (6 activas, de empresas aprobadas) ──────────────
INSERT INTO public.jobs (id, company_id, title, description, tags, benefits, location, type, salary_min, salary_max, active, views)
VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Senior UX Designer', 'Diseñador UX senior para crear experiencias financieras inclusivas en el core product. Trabajarás con equipos de producto en features usadas por millones.', ARRAY['Figma','Design Systems','UX','Research'], ARRAY['remote','health','stock'], 'Remoto', 'Full-time', 1800000, 2500000, true, 170),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Frontend Engineer', 'Construye herramientas de bienestar corporativo con React y TypeScript en un equipo de alto impacto. Stack moderno y cultura de code review.', ARRAY['React','TypeScript','Next.js','Frontend'], ARRAY['hybrid','health','casino','bus'], 'Híbrido', 'Full-time', 1500000, 2000000, true, 110),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Backend Engineer Go', 'Infraestructura de inversiones con Go. Sistemas distribuidos, alta disponibilidad y foco en calidad. Ideal si te gustan los desafíos técnicos.', ARRAY['Go','Kubernetes','PostgreSQL','Backend'], ARRAY['home','stock','health'], 'Presencial', 'Full-time', 2200000, 3000000, true, 145),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Data Scientist ML', 'Modelos de riesgo crediticio con Python y ML para el scoring más avanzado del mercado. Trabajo con datos reales a gran escala.', ARRAY['Python','ML','SQL','MLOps'], ARRAY['hybrid','bonus','health'], 'Híbrido', 'Full-time', 2000000, 2800000, true, 85),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'Product Manager', 'Lidera la estrategia de crecimiento con foco en activación en Latam. Definirás roadmap y trabajarás cross-team.', ARRAY['Product','Analytics','OKRs','Growth'], ARRAY['remote','bonus','home'], 'Remoto', 'Full-time', 2500000, 3500000, true, 200),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000002', 'Diseñador UI Semi-Senior', 'Únete al equipo de diseño para crear interfaces limpias y accesibles. Colaboración cercana con producto e ingeniería.', ARRAY['Figma','UI','Design Systems'], ARRAY['hybrid','casino','health'], 'Híbrido', 'Full-time', 1300000, 1800000, true, 62);

-- ─── EXPERIENCIA LABORAL (últimas 2 por candidato) ───────────
INSERT INTO public.work_experience (profile_id, company_name, role, start_date, end_date, is_current)
VALUES
  ('33333333-0000-0000-0000-000000000001', 'Mercado Libre', 'UX Designer Sr.', '2022-01-01', '2024-01-01', false),
  ('33333333-0000-0000-0000-000000000001', 'Cornershop', 'Product Designer', '2020-01-01', '2022-01-01', false),
  ('33333333-0000-0000-0000-000000000002', 'Betterfly', 'Frontend Dev', '2023-01-01', NULL, true),
  ('33333333-0000-0000-0000-000000000002', 'Fintual', 'Junior Developer', '2021-01-01', '2023-01-01', false),
  ('33333333-0000-0000-0000-000000000003', 'Rappi', 'Product Designer', '2022-01-01', '2024-01-01', false),
  ('33333333-0000-0000-0000-000000000003', 'Clip', 'UX Researcher', '2020-01-01', '2022-01-01', false),
  ('33333333-0000-0000-0000-000000000004', 'Buk', 'Full Stack Engineer', '2021-01-01', NULL, true),
  ('33333333-0000-0000-0000-000000000004', 'NotCo', 'Backend Developer', '2019-01-01', '2021-01-01', false);

-- ─── POSTULACIONES (7 en distintos estados) ──────────────────
INSERT INTO public.applications (job_id, candidate_id, status)
VALUES
  ('22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'new'),
  ('22222222-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000001', 'viewed'),
  ('22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'new'),
  ('22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 'saved'),
  ('22222222-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000003', 'new'),
  ('22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000004', 'viewed'),
  ('22222222-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000004', 'new');

-- ─── REACTIVAR LA FK (solo valida filas nuevas de aquí en adelante) ─
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

-- ============================================================
-- RESUMEN cargado:
--   5 empresas (4 aprobadas + 1 pendiente para probar aprobación)
--   6 ofertas laborales activas
--   4 candidatos con perfil completo y experiencia laboral
--   7 postulaciones en distintos estados (new/viewed/saved)
--
-- Para borrar TODOS los datos demo después:
--   DELETE FROM public.applications WHERE candidate_id IN (SELECT id FROM public.profiles WHERE bio LIKE '[DEMO]%');
--   DELETE FROM public.work_experience WHERE profile_id IN (SELECT id FROM public.profiles WHERE bio LIKE '[DEMO]%');
--   DELETE FROM public.jobs WHERE company_id IN (SELECT id FROM public.profiles WHERE bio LIKE '[DEMO]%');
--   DELETE FROM public.profiles WHERE bio LIKE '[DEMO]%';
-- ============================================================
