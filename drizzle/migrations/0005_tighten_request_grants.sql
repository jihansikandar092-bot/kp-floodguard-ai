REVOKE SELECT, UPDATE, DELETE, TRUNCATE ON public.emergency_requests FROM anon;
REVOKE DELETE, TRUNCATE ON public.emergency_requests FROM authenticated;
REVOKE ALL ON public.submission_rate_limits FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon;