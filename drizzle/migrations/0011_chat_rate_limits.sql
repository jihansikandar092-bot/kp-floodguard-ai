CREATE TABLE public.rate_limits(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ip_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.rate_limits TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.rate_limits_id_seq TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX chat_rate_limits_ip_time ON public.rate_limits(ip_hash,created_at);
CREATE FUNCTION public.consume_chat_limit(_ip_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE minute_count integer; hour_count integer;
BEGIN
 IF length(_ip_hash)<>64 THEN RAISE EXCEPTION 'Invalid connection hash'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('chat:'||_ip_hash));
 DELETE FROM public.rate_limits WHERE ip_hash=_ip_hash AND created_at<now()-interval '1 hour';
 SELECT count(*) FILTER(WHERE created_at>now()-interval '1 minute'), count(*) INTO minute_count,hour_count FROM public.rate_limits WHERE ip_hash=_ip_hash;
 IF minute_count>=15 OR hour_count>=100 THEN RETURN false; END IF;
 INSERT INTO public.rate_limits(ip_hash) VALUES(_ip_hash);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.consume_chat_limit(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_chat_limit(text) TO service_role;