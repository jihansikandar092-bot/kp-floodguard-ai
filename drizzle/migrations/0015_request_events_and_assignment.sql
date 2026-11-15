ALTER TABLE public.emergency_requests
  ADD COLUMN assigned_team text,
  ADD COLUMN internal_note text;

CREATE TABLE public.request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.request_events TO authenticated;
GRANT ALL ON public.request_events TO service_role;

ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators read request events"
  ON public.request_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coordinators insert request events"
  ON public.request_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coordinators update request event notes"
  ON public.request_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.request_events (request_id, from_status, to_status, actor_user_id)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER emergency_requests_log_status
  AFTER UPDATE ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_request_status_change();