CREATE TABLE public.historical_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id text NOT NULL REFERENCES public.districts(id),
  year integer NOT NULL,
  annual_max_discharge double precision NOT NULL CHECK (annual_max_discharge >= 0),
  source text NOT NULL,
  UNIQUE (district_id, year)
);
GRANT SELECT ON public.historical_stats TO anon, authenticated;
GRANT ALL ON public.historical_stats TO service_role;
ALTER TABLE public.historical_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public historical discharge stats" ON public.historical_stats
  FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id text NOT NULL REFERENCES public.districts(id),
  snapshot_id uuid,
  score double precision NOT NULL CHECK (score >= 0 AND score <= 100),
  level text NOT NULL CHECK (level IN ('low','medium','high')),
  confidence text NOT NULL CHECK (confidence IN ('Low','Medium')),
  factors jsonb NOT NULL,
  reason_text text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX risk_assessments_latest ON public.risk_assessments (district_id, computed_at DESC);
GRANT SELECT ON public.risk_assessments TO anon, authenticated;
GRANT ALL ON public.risk_assessments TO service_role;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public risk assessments" ON public.risk_assessments
  FOR SELECT TO anon, authenticated USING (true);