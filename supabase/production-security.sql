-- KIVO production security hardening
-- Run this in Supabase SQL Editor after creating the five KIVO tables.
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Public visitors may only read active services and public site settings.
DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
CREATE POLICY "Public can read settings" ON public.settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read active services" ON public.services;
CREATE POLICY "Public can read active services" ON public.services
  FOR SELECT TO anon, authenticated USING (active = 1);

-- No public policies are created for leads, projects, or transactions.
-- All writes and private reads go through the authenticated server using
-- SUPABASE_SERVICE_ROLE_KEY, which must never be exposed to the browser.
