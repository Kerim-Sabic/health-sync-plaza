-- Two-way coach and client messages on the existing notes thread.
-- Existing notes are untouched: they keep from_client = false (written by the coach).
ALTER TABLE public.trainer_notes ADD COLUMN IF NOT EXISTS from_client boolean NOT NULL DEFAULT false;
CREATE POLICY "client replies" ON public.trainer_notes FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND from_client
    AND shared
    AND EXISTS (SELECT 1 FROM public.trainer_clients t WHERE t.client_id = auth.uid() AND t.trainer_id = trainer_notes.trainer_id)
  );

-- Weekly check-ins: one per client per week. Clients write answers; their coach can only add a reply.
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL DEFAULT auth.uid(),
  week_start date NOT NULL,
  weight numeric,
  adherence smallint CHECK (adherence BETWEEN 1 AND 10),
  energy smallint CHECK (energy BETWEEN 1 AND 5),
  sleep smallint CHECK (sleep BETWEEN 1 AND 5),
  stress smallint CHECK (stress BETWEEN 1 AND 5),
  wins text,
  struggles text,
  questions text,
  coach_reply text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, week_start)
);
GRANT SELECT, INSERT, UPDATE ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client reads own check-ins" ON public.check_ins FOR SELECT TO authenticated USING (client_id = auth.uid());
CREATE POLICY "client submits check-ins" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "trainer reads check-ins" ON public.check_ins FOR SELECT TO authenticated USING (public.is_trainer_of(client_id));
CREATE POLICY "trainer replies to check-ins" ON public.check_ins FOR UPDATE TO authenticated USING (public.is_trainer_of(client_id)) WITH CHECK (public.is_trainer_of(client_id));

-- A coach's update can only set the reply; the client's answers are restored if touched.
CREATE OR REPLACE FUNCTION public.check_in_reply_only() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM OLD.client_id THEN
    NEW.client_id := OLD.client_id;
    NEW.week_start := OLD.week_start;
    NEW.weight := OLD.weight;
    NEW.adherence := OLD.adherence;
    NEW.energy := OLD.energy;
    NEW.sleep := OLD.sleep;
    NEW.stress := OLD.stress;
    NEW.wins := OLD.wins;
    NEW.struggles := OLD.struggles;
    NEW.questions := OLD.questions;
    NEW.created_at := OLD.created_at;
    NEW.replied_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS check_in_reply_only ON public.check_ins;
CREATE TRIGGER check_in_reply_only BEFORE UPDATE ON public.check_ins FOR EACH ROW EXECUTE FUNCTION public.check_in_reply_only();

-- Live updates for the notes thread (RLS still decides who receives each row).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_notes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
