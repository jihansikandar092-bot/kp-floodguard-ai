DROP POLICY IF EXISTS "Public monitoring run status" ON public.monitoring_runs;
REVOKE ALL PRIVILEGES ON TABLE public.monitoring_runs FROM anon, authenticated;
GRANT ALL ON TABLE public.monitoring_runs TO service_role;
ALTER TABLE public.monitoring_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public monitoring readings" ON public.monitoring_snapshots;
REVOKE ALL PRIVILEGES ON TABLE public.monitoring_snapshots FROM anon, authenticated;
GRANT SELECT ON TABLE public.monitoring_snapshots TO anon, authenticated;
GRANT ALL ON TABLE public.monitoring_snapshots TO service_role;
ALTER TABLE public.monitoring_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public validated district readings"
ON public.monitoring_snapshots
FOR SELECT TO anon, authenticated
USING (
  district_id IS NOT NULL
  AND district = district_id
  AND metrics ->> 'id' = district_id
  AND EXISTS (
    SELECT 1 FROM public.districts AS reference
    WHERE reference.id = monitoring_snapshots.district_id
  )
  AND (
    jsonb_typeof(metrics -> 'weather') = 'object'
    OR jsonb_typeof(metrics -> 'flood') = 'object'
  )
);