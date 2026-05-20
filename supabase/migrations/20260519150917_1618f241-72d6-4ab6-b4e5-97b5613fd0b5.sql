ALTER TABLE public.claims_tracking ADD COLUMN run_numbers TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX idx_claims_tracking_run_numbers ON public.claims_tracking USING GIN(run_numbers);