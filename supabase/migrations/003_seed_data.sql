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
