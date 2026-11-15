DROP POLICY IF EXISTS "Public risk assessments" ON public.risk_assessments;
CREATE POLICY "Public risk assessments for monitored districts" ON public.risk_assessments
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.districts d WHERE d.id = risk_assessments.district_id));

DROP POLICY IF EXISTS "Public environmental service health" ON public.service_health;
CREATE POLICY "Public recorded service health" ON public.service_health
FOR SELECT TO anon, authenticated
USING (char_length(service) BETWEEN 1 AND 64 AND (last_success_at IS NOT NULL OR last_error_at IS NOT NULL));