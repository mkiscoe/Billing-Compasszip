ALTER TABLE public.payers
ADD COLUMN IF NOT EXISTS prior_auth_hcpcs text,
ADD COLUMN IF NOT EXISTS prior_auth_modifiers text;