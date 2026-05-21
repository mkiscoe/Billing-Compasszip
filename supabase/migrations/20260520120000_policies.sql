-- Policies table
CREATE TABLE IF NOT EXISTS public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  pdf_url text,
  training_article_id uuid,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policies_all_authenticated" ON public.policies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policy acknowledgements table
CREATE TABLE IF NOT EXISTS public.policy_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_email text,
  user_display_name text,
  signed_name text NOT NULL,
  signed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(policy_id, user_id)
);

ALTER TABLE public.policy_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acks_all_authenticated" ON public.policy_acknowledgements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add login tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_login_at timestamptz;

-- Storage bucket for policy PDFs (public read, staff write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-pdfs', 'policy-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "policy_pdfs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'policy-pdfs' AND public.is_staff(auth.uid()));

CREATE POLICY "policy_pdfs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'policy-pdfs' AND public.is_staff(auth.uid()));

CREATE POLICY "policy_pdfs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'policy-pdfs' AND public.is_staff(auth.uid()));
