CREATE TYPE public.suggestion_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.suggestion_target AS ENUM ('payer', 'payer_rule', 'denial_guide');

CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id uuid NOT NULL,
  submitter_email text,
  target_type public.suggestion_target NOT NULL,
  target_id uuid,
  target_label text,
  body text NOT NULL,
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own suggestion"
  ON public.suggestions FOR INSERT TO authenticated
  WITH CHECK (submitter_id = auth.uid());

CREATE POLICY "users read own suggestion"
  ON public.suggestions FOR SELECT TO authenticated
  USING (submitter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update suggestion"
  ON public.suggestions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete suggestion"
  ON public.suggestions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER suggestions_touch_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_suggestions_status ON public.suggestions(status);
CREATE INDEX idx_suggestions_target ON public.suggestions(target_type, target_id);