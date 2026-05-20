
ALTER TABLE public.payers
  ADD COLUMN IF NOT EXISTS wc_denial_training_id uuid,
  ADD COLUMN IF NOT EXISTS wc_claim_training_id uuid,
  ADD COLUMN IF NOT EXISTS prior_auth_training_id uuid,
  ADD COLUMN IF NOT EXISTS medical_records_training_id uuid,
  ADD COLUMN IF NOT EXISTS secondary_claims_training_id uuid;
