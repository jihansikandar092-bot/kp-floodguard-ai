REVOKE EXECUTE ON FUNCTION public.emergency_requests_before_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_request_status_change() FROM PUBLIC, anon, authenticated;