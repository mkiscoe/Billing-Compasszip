ALTER TABLE public.payers
  ADD COLUMN IF NOT EXISTS claims_address text,
  ADD COLUMN IF NOT EXISTS electronic_payer_id text,
  ADD COLUMN IF NOT EXISTS appeals_address text;