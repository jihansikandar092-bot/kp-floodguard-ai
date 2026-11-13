CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE SEQUENCE public.emergency_request_seq;
GRANT USAGE ON SEQUENCE public.emergency_request_seq TO service_role;

CREATE TABLE public.emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code text NOT NULL UNIQUE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (phone ~ '^03[0-9]{9}$'),
  district_id text REFERENCES public.districts(id),
  tehsil text NOT NULL CHECK (char_length(tehsil) BETWEEN 2 AND 60),
  location text NOT NULL CHECK (char_length(location) BETWEEN 5 AND 300),
  emergency_type text NOT NULL CHECK (emergency_type IN ('rescue','medical','food','water','shelter')),
  people_affected integer NOT NULL CHECK (people_affected BETWEEN 1 AND 10000),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','ur','ps')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','in_progress','resolved')),
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX emergency_requests_created_idx ON public.emergency_requests (created_at DESC);

CREATE OR REPLACE FUNCTION public.emergency_requests_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.request_code := 'KPF-' || to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYYY') || '-' ||
      lpad(nextval('public.emergency_request_seq')::text, 4, '0');
    NEW.status := 'pending';
    NEW.created_at := now();
  ELSE
    NEW.request_code := OLD.request_code;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER emergency_requests_before_write BEFORE INSERT OR UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE FUNCTION public.emergency_requests_before_write();

GRANT INSERT ON public.emergency_requests TO anon;
GRANT INSERT, SELECT, UPDATE ON public.emergency_requests TO authenticated;
GRANT ALL ON public.emergency_requests TO service_role;
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citizens submit requests" ON public.emergency_requests FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND (is_test = false OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Coordinators read requests" ON public.emergency_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Coordinators update requests" ON public.emergency_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.submission_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX submission_rate_limits_ip_idx ON public.submission_rate_limits (ip_hash, created_at DESC);
GRANT ALL ON public.submission_rate_limits TO service_role;
ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;