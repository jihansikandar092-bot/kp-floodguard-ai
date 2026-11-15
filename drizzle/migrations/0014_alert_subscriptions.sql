CREATE TABLE public.alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('email','webpush')),
  contact text NOT NULL CHECK (length(contact) BETWEEN 3 AND 4000),
  contact_hash text NOT NULL,
  district_ids text[] NOT NULL CHECK (cardinality(district_ids) BETWEEN 1 AND 40),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','ur','ps')),
  min_level text NOT NULL DEFAULT 'medium' CHECK (min_level IN ('medium','high')),
  verified_at timestamptz,
  verify_token text UNIQUE,
  verify_expires_at timestamptz,
  unsubscribe_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alert_subscriptions_active_idx ON public.alert_subscriptions (channel) WHERE verified_at IS NOT NULL AND unsubscribed_at IS NULL;
CREATE INDEX alert_subscriptions_contact_idx ON public.alert_subscriptions (contact_hash);
REVOKE ALL ON public.alert_subscriptions FROM anon, authenticated;
GRANT ALL ON public.alert_subscriptions TO service_role;
ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.alert_subscriptions IS 'Citizen alert subscriptions. No browser policies: only server code (service role) reads or writes.';

CREATE TABLE public.alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.alert_subscriptions(id) ON DELETE SET NULL,
  district_id text,
  channel text NOT NULL CHECK (channel IN ('email','webpush')),
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  error text,
  event_key text,
  attempt integer NOT NULL DEFAULT 1,
  is_test boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alert_deliveries_sub_idx ON public.alert_deliveries (subscription_id, district_id, sent_at DESC);
CREATE INDEX alert_deliveries_event_idx ON public.alert_deliveries (event_key, subscription_id);
REVOKE ALL ON public.alert_deliveries FROM anon;
GRANT SELECT ON public.alert_deliveries TO authenticated;
GRANT ALL ON public.alert_deliveries TO service_role;
ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coordinators read deliveries" ON public.alert_deliveries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.subscription_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscription_rate_limits_idx ON public.subscription_rate_limits (ip_hash, created_at);
REVOKE ALL ON public.subscription_rate_limits FROM anon, authenticated;
GRANT ALL ON public.subscription_rate_limits TO service_role;
ALTER TABLE public.subscription_rate_limits ENABLE ROW LEVEL SECURITY;