
-- IDEAS
CREATE TABLE public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  context text DEFAULT '',
  category text DEFAULT '',
  status text NOT NULL DEFAULT 'idea',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ideas TO anon, authenticated;
GRANT ALL ON public.ideas TO service_role;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ideas open all" ON public.ideas FOR ALL USING (true) WITH CHECK (true);

-- WINS
CREATE TABLE public.wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid REFERENCES public.ideas(id) ON DELETE SET NULL,
  title text NOT NULL,
  summary text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wins TO anon, authenticated;
GRANT ALL ON public.wins TO service_role;
ALTER TABLE public.wins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wins open all" ON public.wins FOR ALL USING (true) WITH CHECK (true);

-- CHANGELOG
CREATE TABLE public.changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT (now()::date),
  title text NOT NULL,
  category text DEFAULT '',
  summary text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.changelog TO anon, authenticated;
GRANT ALL ON public.changelog TO service_role;
ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "changelog open all" ON public.changelog FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER ideas_touch BEFORE UPDATE ON public.ideas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- when idea moves to 'done': create win + changelog
CREATE OR REPLACE FUNCTION public.on_idea_done()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'done') THEN
    INSERT INTO public.wins (idea_id, title, summary)
    VALUES (NEW.id, NEW.title, COALESCE(NULLIF(NEW.context,''), ''));
    INSERT INTO public.changelog (entry_date, title, category, summary)
    VALUES (now()::date, NEW.title, COALESCE(NEW.category,''), COALESCE(NULLIF(NEW.context,''), ''));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER ideas_done_trigger AFTER INSERT OR UPDATE OF status ON public.ideas
FOR EACH ROW EXECUTE FUNCTION public.on_idea_done();
