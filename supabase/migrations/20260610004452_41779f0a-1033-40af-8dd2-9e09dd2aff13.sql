CREATE TABLE public.ui_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ui_state TO anon, authenticated;
GRANT ALL ON public.ui_state TO service_role;

ALTER TABLE public.ui_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ui_state open all" ON public.ui_state FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER ui_state_touch BEFORE UPDATE ON public.ui_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();