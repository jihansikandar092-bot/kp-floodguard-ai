ALTER TABLE public.emergency_requests ADD COLUMN client_request_id uuid;
CREATE UNIQUE INDEX emergency_requests_client_request_id_key ON public.emergency_requests (client_request_id) WHERE client_request_id IS NOT NULL;
COMMENT ON COLUMN public.emergency_requests.client_request_id IS 'Device-generated idempotency key so a queued offline request is stored at most once.';