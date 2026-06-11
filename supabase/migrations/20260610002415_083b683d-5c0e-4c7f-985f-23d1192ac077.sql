
-- Deduplicate existing wins per idea before adding unique constraint
DELETE FROM public.wins w
USING public.wins w2
WHERE w.idea_id = w2.idea_id
  AND w.idea_id IS NOT NULL
  AND w.created_at > w2.created_at;

ALTER TABLE public.wins
  ADD CONSTRAINT wins_idea_id_unique UNIQUE (idea_id);

ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE OR REPLACE FUNCTION public.on_idea_done()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'done') THEN
    INSERT INTO public.wins (idea_id, title, summary)
    VALUES (NEW.id, NEW.title, COALESCE(NULLIF(NEW.context,''), ''))
    ON CONFLICT (idea_id) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.changelog
      WHERE title = NEW.title AND entry_date = now()::date
    ) THEN
      INSERT INTO public.changelog (entry_date, title, category, summary)
      VALUES (now()::date, NEW.title, COALESCE(NEW.category,''), COALESCE(NULLIF(NEW.context,''), ''));
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- Ensure trigger exists (was referenced but not present)
DROP TRIGGER IF EXISTS trg_on_idea_done ON public.ideas;
CREATE TRIGGER trg_on_idea_done
AFTER INSERT OR UPDATE OF status ON public.ideas
FOR EACH ROW EXECUTE FUNCTION public.on_idea_done();
