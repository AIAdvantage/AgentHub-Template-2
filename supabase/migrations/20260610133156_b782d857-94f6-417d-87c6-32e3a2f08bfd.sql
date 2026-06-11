CREATE TABLE public.avatar_soul (
  id text PRIMARY KEY DEFAULT 'main',
  name text,
  user_name text,
  persona text,
  voice text,
  backstory text,
  remember jsonb NOT NULL DEFAULT '[]'::jsonb,
  content text,
  onboarding_done boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avatar_soul TO anon, authenticated;
GRANT ALL ON public.avatar_soul TO service_role;

ALTER TABLE public.avatar_soul ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avatar_soul open all" ON public.avatar_soul FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER avatar_soul_touch_updated_at
  BEFORE UPDATE ON public.avatar_soul
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.avatar_soul (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;