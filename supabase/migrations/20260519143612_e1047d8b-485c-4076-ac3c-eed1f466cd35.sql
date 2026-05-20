ALTER TABLE public.training_articles
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('training-materials', 'training-materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authed read training-materials"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'training-materials' AND public.is_authed(auth.uid()));

CREATE POLICY "staff upload training-materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'training-materials' AND public.is_staff(auth.uid()));

CREATE POLICY "staff update training-materials"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'training-materials' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'training-materials' AND public.is_staff(auth.uid()));

CREATE POLICY "staff delete training-materials"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'training-materials' AND public.is_staff(auth.uid()));