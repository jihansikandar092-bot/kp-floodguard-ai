CREATE TABLE public.monitoring_snapshots (
 district text PRIMARY KEY,
 metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
 fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.monitoring_snapshots TO anon, authenticated;
GRANT ALL ON public.monitoring_snapshots TO service_role;
ALTER TABLE public.monitoring_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public monitoring readings" ON public.monitoring_snapshots FOR SELECT TO anon, authenticated USING (true);