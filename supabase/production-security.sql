-- KIVO production security hardening
-- Run this in Supabase SQL Editor after creating the five KIVO tables.
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
CREATE POLICY "Public can read settings" ON public.settings
  FOR SELECT TO anon, authenticated
  USING (key IN (
    'brandName','tagline','heroTitle','heroDescription','heroButton',
    'aboutTitle','aboutDescription','email','instagram','linkedin',
    'accent','announcement','language'
  ));

DROP POLICY IF EXISTS "Public can read active services" ON public.services;
CREATE POLICY "Public can read active services" ON public.services
  FOR SELECT TO anon, authenticated USING (active = 1);

-- Leads, projects, and transactions intentionally have no public policies.
-- Server-side API access uses SUPABASE_SERVICE_ROLE_KEY. Never expose it in
-- client-side code, VITE_ variables, GitHub, or public messages.
