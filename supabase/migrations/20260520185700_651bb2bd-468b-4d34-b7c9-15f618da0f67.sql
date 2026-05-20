
CREATE TABLE public.payer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number text NOT NULL,
  insurance_name text NOT NULL,
  claims_address text NOT NULL,
  phone text,
  fax text,
  electronic_payer_id text,
  added_to_traumasoft boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  submitter_id uuid NOT NULL,
  submitter_email text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_payer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user insert own payer_request"
  ON public.payer_requests FOR INSERT TO authenticated
  WITH CHECK (submitter_id = auth.uid());

CREATE POLICY "own or admin read payer_request"
  ON public.payer_requests FOR SELECT TO authenticated
  USING (submitter_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin update payer_request"
  ON public.payer_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin delete payer_request"
  ON public.payer_requests FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_payer_requests
  BEFORE UPDATE ON public.payer_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
