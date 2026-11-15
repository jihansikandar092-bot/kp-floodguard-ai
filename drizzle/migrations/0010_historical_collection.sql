ALTER TABLE public.historical_stats ADD COLUMN max_discharge_m3s double precision, ADD COLUMN max_rain_1d_mm double precision, ADD COLUMN max_rain_3d_mm double precision, ADD COLUMN total_rain_mm double precision, ADD COLUMN fetched_at timestamptz;
UPDATE public.historical_stats SET max_discharge_m3s=annual_max_discharge;
COMMENT ON COLUMN public.historical_stats.annual_max_discharge IS 'Legacy compatibility mirror of max_discharge_m3s; maintained for existing risk reads.';
CREATE TABLE public.historical_job_progress (
 district_id text PRIMARY KEY REFERENCES public.districts(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','paused','error','complete')),
 phase text NOT NULL DEFAULT 'discharge' CHECK(phase IN ('discharge','rainfall')),
 last_error text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 next_request_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.historical_job_progress TO anon, authenticated;
GRANT ALL ON public.historical_job_progress TO service_role;
ALTER TABLE public.historical_job_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public historical collection progress" ON public.historical_job_progress FOR SELECT TO anon,authenticated USING (EXISTS(SELECT 1 FROM public.districts d WHERE d.id=district_id));
CREATE FUNCTION public.claim_historical_district(_last_year integer) RETURNS SETOF public.historical_job_progress LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('historical_collection'));
 INSERT INTO public.historical_job_progress(district_id) SELECT id FROM public.districts ON CONFLICT DO NOTHING;
 IF EXISTS(SELECT 1 FROM public.historical_job_progress WHERE lease_until>now() OR next_request_at>now()) THEN RETURN; END IF;
 RETURN QUERY UPDATE public.historical_job_progress p SET status='running',lease_until=now()+interval '60 seconds',updated_at=now(),last_error=NULL
 WHERE p.district_id=(SELECT q.district_id FROM public.historical_job_progress q
 WHERE (SELECT count(*) FROM public.historical_stats h WHERE h.district_id=q.district_id AND h.year BETWEEN 2010 AND _last_year AND h.max_discharge_m3s IS NOT NULL AND h.max_rain_1d_mm IS NOT NULL AND h.max_rain_3d_mm IS NOT NULL AND h.total_rain_mm IS NOT NULL)<(_last_year-2009)
 ORDER BY CASE q.phase WHEN 'rainfall' THEN 0 ELSE 1 END,CASE q.district_id WHEN 'swat' THEN 0 WHEN 'bannu' THEN 1 ELSE 2 END,q.district_id LIMIT 1)
 RETURNING p.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_historical_district(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_historical_district(integer) TO service_role;