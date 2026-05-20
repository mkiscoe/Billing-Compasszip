
DROP TABLE IF EXISTS public.invoicing_guides CASCADE;

CREATE TABLE public.invoicing_call_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  natures text[] NOT NULL DEFAULT '{}',
  billing_tab text NOT NULL DEFAULT '',
  dispatch_tab text NOT NULL DEFAULT '',
  medical_tab text NOT NULL DEFAULT '',
  required_paperwork text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  screenshots jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoicing_call_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authed read invoicing_call_types" ON public.invoicing_call_types
  FOR SELECT TO authenticated USING (is_authed(auth.uid()));
CREATE POLICY "staff insert invoicing_call_types" ON public.invoicing_call_types
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "staff update invoicing_call_types" ON public.invoicing_call_types
  FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "admin delete invoicing_call_types" ON public.invoicing_call_types
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER invoicing_call_types_touch
  BEFORE UPDATE ON public.invoicing_call_types
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.invoicing_call_types (name) VALUES
  ('Discharge'),
  ('Emergency Call'),
  ('Hospital Transfer'),
  ('Psychiatric Transfer'),
  ('Hospice'),
  ('Prescheduled'),
  ('Wheelchair');
