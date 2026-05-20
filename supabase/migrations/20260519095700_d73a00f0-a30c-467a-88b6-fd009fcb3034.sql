
CREATE TABLE public.claims_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number text NOT NULL,
  payer_id uuid REFERENCES public.payers(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  follow_up_date date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  created_by uuid NOT NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX claims_tracking_created_by_idx ON public.claims_tracking(created_by);
CREATE INDEX claims_tracking_follow_up_idx ON public.claims_tracking(follow_up_date);

ALTER TABLE public.claims_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracker or admin read claims"
  ON public.claims_tracking FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'claims_tracker'::app_role) AND created_by = auth.uid())
  );

CREATE POLICY "tracker insert own claims"
  ON public.claims_tracking FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'claims_tracker'::app_role)
    )
  );

CREATE POLICY "owner or admin update claims"
  ON public.claims_tracking FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'claims_tracker'::app_role) AND created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'claims_tracker'::app_role) AND created_by = auth.uid())
  );

CREATE POLICY "admin delete claims"
  ON public.claims_tracking FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER claims_tracking_touch
  BEFORE UPDATE ON public.claims_tracking
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
