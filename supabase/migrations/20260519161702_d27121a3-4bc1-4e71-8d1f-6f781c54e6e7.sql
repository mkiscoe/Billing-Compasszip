
ALTER TABLE public.payers ADD COLUMN training_article_id uuid;
ALTER TABLE public.denial_guides ADD COLUMN training_article_id uuid;
ALTER TABLE public.invoicing_call_types ADD COLUMN training_article_id uuid;
