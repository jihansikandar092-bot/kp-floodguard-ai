ALTER TABLE public.risk_assessments ADD COLUMN horizon_hours integer NOT NULL DEFAULT 0 CHECK (horizon_hours IN (0,24,48,72,168));
ALTER TABLE public.risk_assessments ADD COLUMN snapshot_at timestamptz;
ALTER TABLE public.risk_assessments ADD COLUMN reason_templates jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX risk_assessments_outlook_latest ON public.risk_assessments(district_id,horizon_hours,computed_at DESC);
ALTER TABLE public.alerts ADD COLUMN type text NOT NULL DEFAULT 'active' CHECK (type IN ('expected','active'));
ALTER TABLE public.alerts ADD COLUMN horizon_hours integer NOT NULL DEFAULT 0;
ALTER TABLE public.alerts ADD COLUMN expected_by timestamptz;
ALTER TABLE public.alerts ADD COLUMN escalated_at timestamptz;
ALTER TABLE public.alerts ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.alerts ADD COLUMN reason_templates jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE public.alert_run_state (district_id text PRIMARY KEY REFERENCES public.districts(id), low_runs integer NOT NULL DEFAULT 0, last_snapshot_at timestamptz, last_computed_at timestamptz);
GRANT ALL ON public.alert_run_state TO service_role;
ALTER TABLE public.alert_run_state ENABLE ROW LEVEL SECURITY;
-- Retire the single-assessment trigger: complete outlook batches are handled atomically by the server-only function below.
CREATE OR REPLACE FUNCTION public.sync_risk_alert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN RETURN NEW; END; $$;
CREATE FUNCTION public.sync_predictive_alert(_district_id text, _computed_at timestamptz, _max_horizon integer, _fresh_hours integer, _low_runs integer) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE selected public.risk_assessments%ROWTYPE; current_row public.alerts%ROWTYPE; state public.alert_run_state%ROWTYPE; now_level text; stamp timestamptz; names text; count_rows integer; low_count integer; alert_type text; horizon integer;
BEGIN
 SELECT name_en INTO names FROM public.districts WHERE id=_district_id FOR UPDATE;
 SELECT COUNT(*), MIN(snapshot_at) INTO count_rows, stamp FROM public.risk_assessments WHERE district_id=_district_id AND computed_at=_computed_at AND horizon_hours IN (0,24,48,72,168);
 IF count_rows <> 5 OR stamp IS NULL OR stamp <= now() - make_interval(hours=>_fresh_hours) OR stamp > now() THEN RETURN 'stale_or_incomplete'; END IF;
 SELECT * INTO state FROM public.alert_run_state WHERE district_id=_district_id;
 IF state.last_snapshot_at IS NOT NULL AND stamp <= state.last_snapshot_at THEN RETURN 'already_processed'; END IF;
 SELECT * INTO selected FROM public.risk_assessments WHERE district_id=_district_id AND computed_at=_computed_at AND horizon_hours <= _max_horizon ORDER BY CASE level WHEN 'high' THEN 2 WHEN 'medium' THEN 1 ELSE 0 END DESC, horizon_hours ASC LIMIT 1;
 SELECT level INTO now_level FROM public.risk_assessments WHERE district_id=_district_id AND computed_at=_computed_at AND horizon_hours=0 LIMIT 1;
 SELECT * INTO current_row FROM public.alerts WHERE district_id=_district_id AND resolved_at IS NULL;
 low_count := CASE WHEN selected.level='low' THEN COALESCE(state.low_runs,0)+1 ELSE 0 END;
 INSERT INTO public.alert_run_state(district_id,low_runs,last_snapshot_at,last_computed_at) VALUES(_district_id,low_count,stamp,_computed_at) ON CONFLICT(district_id) DO UPDATE SET low_runs=EXCLUDED.low_runs,last_snapshot_at=EXCLUDED.last_snapshot_at,last_computed_at=EXCLUDED.last_computed_at;
 IF selected.level='low' THEN
   IF low_count >= _low_runs AND current_row.id IS NOT NULL THEN UPDATE public.alerts SET resolved_at=_computed_at, updated_at=_computed_at WHERE id=current_row.id; RETURN 'resolved'; END IF;
   RETURN 'low_pending';
 END IF;
 alert_type := CASE WHEN now_level=selected.level THEN 'active' ELSE 'expected' END;
 horizon := CASE WHEN alert_type='active' THEN 0 ELSE selected.horizon_hours END;
 IF current_row.id IS NULL THEN
   INSERT INTO public.alerts(district_id,level,title,reason_text,risk_assessment_id,created_at,type,horizon_hours,expected_by,updated_at,reason_templates)
   VALUES(_district_id,selected.level,names || ': ' || initcap(selected.level) || ' modelled flood risk',selected.reason_text,selected.id,_computed_at,alert_type,horizon,stamp+make_interval(hours=>horizon),_computed_at,selected.reason_templates);
   RETURN 'created';
 END IF;
 UPDATE public.alerts SET level=selected.level,title=names || ': ' || initcap(selected.level) || ' modelled flood risk',reason_text=selected.reason_text,risk_assessment_id=selected.id,type=alert_type,horizon_hours=horizon,expected_by=stamp+make_interval(hours=>horizon),updated_at=_computed_at,reason_templates=selected.reason_templates,
 escalated_at=CASE WHEN (CASE selected.level WHEN 'high' THEN 2 ELSE 1 END) > (CASE current_row.level WHEN 'high' THEN 2 ELSE 1 END) THEN _computed_at ELSE current_row.escalated_at END WHERE id=current_row.id;
 RETURN CASE WHEN selected.level='high' AND current_row.level='medium' THEN 'escalated' ELSE 'updated' END;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_predictive_alert(text,timestamptz,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_predictive_alert(text,timestamptz,integer,integer,integer) TO service_role;