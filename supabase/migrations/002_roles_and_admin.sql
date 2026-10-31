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
