ALTER TABLE public.payers
  ADD COLUMN IF NOT EXISTS uses_broker boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS broker_name text,
  ADD COLUMN IF NOT EXISTS broker_notes text;

UPDATE public.payers SET uses_broker = pcs_required WHERE uses_broker = false AND pcs_required = true;
UPDATE public.payers SET broker_notes = pcs_notes WHERE broker_notes IS NULL AND pcs_notes IS NOT NULL;