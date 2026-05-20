
CREATE TABLE public.invoicing_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  nature text NOT NULL,
  body text NOT NULL DEFAULT '',
  screenshots jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoicing_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authed read invoicing_guides" ON public.invoicing_guides
  FOR SELECT TO authenticated USING (is_authed(auth.uid()));
CREATE POLICY "staff insert invoicing_guides" ON public.invoicing_guides
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "staff update invoicing_guides" ON public.invoicing_guides
  FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "admin delete invoicing_guides" ON public.invoicing_guides
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_invoicing_guides_updated_at
BEFORE UPDATE ON public.invoicing_guides
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoicing-screenshots', 'invoicing-screenshots', true);

CREATE POLICY "public read invoicing screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'invoicing-screenshots');
CREATE POLICY "staff upload invoicing screenshots" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoicing-screenshots' AND is_staff(auth.uid()));
CREATE POLICY "staff update invoicing screenshots" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'invoicing-screenshots' AND is_staff(auth.uid()));
CREATE POLICY "staff delete invoicing screenshots" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'invoicing-screenshots' AND is_staff(auth.uid()));
