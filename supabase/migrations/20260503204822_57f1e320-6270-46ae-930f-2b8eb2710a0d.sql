ALTER TABLE public.denial_guides ADD COLUMN payer_id UUID REFERENCES public.payers(id) ON DELETE SET NULL;
CREATE INDEX idx_denial_guides_payer ON public.denial_guides(payer_id);