CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id text NOT NULL REFERENCES public.districts(id),
  level text NOT NULL CHECK (level IN ('medium', 'high')),
  title text NOT NULL,
  reason_text text NOT NULL,
  risk_assessment_id uuid NOT NULL REFERENCES public.risk_assessments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  source text NOT NULL DEFAULT 'system'
);
GRANT SELECT ON public.alerts TO anon, authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public system alerts" ON public.alerts FOR SELECT TO anon, authenticated USING (source = 'system');
CREATE UNIQUE INDEX alerts_one_active_per_district ON public.alerts(district_id) WHERE resolved_at IS NULL;
CREATE INDEX alerts_recent_resolved ON public.alerts(resolved_at DESC) WHERE resolved_at IS NOT NULL;

CREATE FUNCTION public.sync_risk_alert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE previous_level text; district_name text;
BEGIN
  SELECT name_en INTO district_name FROM public.districts WHERE id = NEW.district_id FOR UPDATE;
  -- Ignore out-of-order historical assessment inserts.
  IF EXISTS (SELECT 1 FROM public.risk_assessments WHERE district_id = NEW.district_id AND computed_at > NEW.computed_at) THEN
    RETURN NEW;
  END IF;
  SELECT level INTO previous_level FROM public.risk_assessments
    WHERE district_id = NEW.district_id AND id <> NEW.id AND computed_at <= NEW.computed_at
    ORDER BY computed_at DESC, id DESC LIMIT 1;
  IF NEW.level = 'low' THEN
    UPDATE public.alerts SET resolved_at = NEW.computed_at
      WHERE district_id = NEW.district_id AND resolved_at IS NULL;
  ELSIF (NEW.level = 'medium' AND COALESCE(previous_level, 'low') = 'low')
     OR (NEW.level = 'high' AND COALESCE(previous_level, 'low') IN ('low', 'medium')) THEN
    -- An escalation supersedes the lower alert; repeated levels do not duplicate it.
    IF NOT EXISTS (SELECT 1 FROM public.alerts WHERE district_id = NEW.district_id AND resolved_at IS NULL AND level = NEW.level) THEN
      UPDATE public.alerts SET resolved_at = NEW.computed_at
        WHERE district_id = NEW.district_id AND resolved_at IS NULL;
      INSERT INTO public.alerts(district_id, level, title, reason_text, risk_assessment_id, created_at)
        VALUES(NEW.district_id, NEW.level, district_name || ': ' || initcap(NEW.level) || ' modelled flood risk', NEW.reason_text, NEW.id, NEW.computed_at);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_risk_alert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER risk_assessment_system_alert AFTER INSERT ON public.risk_assessments FOR EACH ROW EXECUTE FUNCTION public.sync_risk_alert();