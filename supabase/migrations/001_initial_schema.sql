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
