ALTER TABLE public.risk_assessments ADD COLUMN available_factors integer NOT NULL DEFAULT 0;
UPDATE public.risk_assessments r SET available_factors=(SELECT count(*) FROM jsonb_each(r.factors) f WHERE jsonb_typeof(f.value->'score')='number');
ALTER TABLE public.risk_assessments ADD CONSTRAINT risk_available_factors_range CHECK (available_factors BETWEEN 0 AND 4);
CREATE FUNCTION public.partial_score_note(_available integer, _language text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN _available >= 4 THEN '' WHEN _language='ur' THEN 'جزوی: 4 میں سے ' || _available || ' عوامل پر مبنی ہے۔ کسی عامل کی عدم دستیابی کا مطلب ہو سکتا ہے کہ اصل خطرہ زیادہ ہے۔' WHEN _language='ps' THEN 'نیمګړی: له 4 عواملو څخه پر ' || _available || ' ولاړ دی. د یوه عامل نشتوالی ښايي د دې معنا ولري چې اصلي خطر لوړ دی.' ELSE 'Partial: based on ' || _available || ' of 4 factors. A missing factor may mean the real risk is higher.' END; $$;
CREATE FUNCTION public.annotate_partial_assessment() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE lang text; note text; BEGIN
 NEW.available_factors := (SELECT count(*) FROM jsonb_each(NEW.factors) f WHERE jsonb_typeof(f.value->'score')='number');
 IF NEW.available_factors < 4 THEN
 note := public.partial_score_note(NEW.available_factors,'en');
 IF position(note IN NEW.reason_text)=0 THEN NEW.reason_text:=NEW.reason_text || ' ' || note; END IF;
 FOR lang IN SELECT unnest(ARRAY['en','ur','ps']) LOOP
 note:=public.partial_score_note(NEW.available_factors,lang);
 IF position(note IN COALESCE(NEW.reason_templates->>lang,''))=0 THEN NEW.reason_templates:=jsonb_set(NEW.reason_templates,ARRAY[lang],to_jsonb(COALESCE(NEW.reason_templates->>lang,NEW.reason_text) || ' ' || note)); END IF;
 END LOOP;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER annotate_partial_assessment BEFORE INSERT OR UPDATE OF factors ON public.risk_assessments FOR EACH ROW EXECUTE FUNCTION public.annotate_partial_assessment();
UPDATE public.risk_assessments SET factors=factors WHERE available_factors < 4;
UPDATE public.alerts a SET reason_text=r.reason_text, reason_templates=r.reason_templates FROM public.risk_assessments r WHERE a.risk_assessment_id=r.id AND r.available_factors < 4;
-- Reset historical Low counters: prior partial runs must not contribute to future resolution.
UPDATE public.alert_run_state s SET low_runs=0 WHERE EXISTS (SELECT 1 FROM public.risk_assessments r WHERE r.district_id=s.district_id AND r.computed_at=s.last_computed_at AND r.available_factors < 4);
CREATE OR REPLACE FUNCTION public.sync_predictive_alert(_district_id text, _computed_at timestamptz, _max_horizon integer, _fresh_hours integer, _low_runs integer) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE selected public.risk_assessments%ROWTYPE; current_row public.alerts%ROWTYPE; state public.alert_run_state%ROWTYPE; now_level text; stamp timestamptz; names text; count_rows integer; low_count integer; alert_type text; horizon integer; all_complete boolean;
BEGIN
 SELECT name_en INTO names FROM public.districts WHERE id=_district_id FOR UPDATE;
 SELECT COUNT(*), MIN(snapshot_at), bool_and(available_factors=4) INTO count_rows, stamp, all_complete FROM public.risk_assessments WHERE district_id=_district_id AND computed_at=_computed_at AND horizon_hours IN (0,24,48,72,168);
 IF count_rows <> 5 OR stamp IS NULL OR stamp <= now() - make_interval(hours=>_fresh_hours) OR stamp > now() THEN RETURN 'stale_or_incomplete'; END IF;
 SELECT * INTO state FROM public.alert_run_state WHERE district_id=_district_id;
 IF state.last_snapshot_at IS NOT NULL AND stamp <= state.last_snapshot_at THEN RETURN 'already_processed'; END IF;
 SELECT * INTO selected FROM public.risk_assessments WHERE district_id=_district_id AND computed_at=_computed_at AND horizon_hours <= _max_horizon ORDER BY CASE level WHEN 'high' THEN 2 WHEN 'medium' THEN 1 ELSE 0 END DESC, horizon_hours ASC LIMIT 1;
 SELECT level INTO now_level FROM public.risk_assessments WHERE district_id=_district_id AND computed_at=_computed_at AND horizon_hours=0 LIMIT 1;
 SELECT * INTO current_row FROM public.alerts WHERE district_id=_district_id AND resolved_at IS NULL;
 low_count := CASE WHEN selected.level='low' AND all_complete THEN COALESCE(state.low_runs,0)+1 ELSE 0 END;
 INSERT INTO public.alert_run_state(district_id,low_runs,last_snapshot_at,last_computed_at) VALUES(_district_id,low_count,stamp,_computed_at) ON CONFLICT(district_id) DO UPDATE SET low_runs=EXCLUDED.low_runs,last_snapshot_at=EXCLUDED.last_snapshot_at,last_computed_at=EXCLUDED.last_computed_at;
 IF selected.level='low' THEN
   IF NOT all_complete THEN RETURN 'partial_low_kept'; END IF;
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