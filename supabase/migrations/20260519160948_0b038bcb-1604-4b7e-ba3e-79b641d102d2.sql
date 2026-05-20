ALTER TABLE public.payers
ADD COLUMN wheelchair_claims boolean NOT NULL DEFAULT false,
ADD COLUMN wheelchair_notes text;