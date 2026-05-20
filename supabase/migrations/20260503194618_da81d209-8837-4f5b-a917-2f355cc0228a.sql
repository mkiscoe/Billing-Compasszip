
-- Roles enum & table
CREATE TYPE public.app_role AS ENUM ('admin','editor','viewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','editor'));
$$;

CREATE OR REPLACE FUNCTION public.is_authed(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id);
$$;

-- Profile policies
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Role policies
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Auto-create profile + bootstrap first user as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Payers
CREATE TABLE public.payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  payer_type TEXT NOT NULL,
  portal_url TEXT,
  portal_notes TEXT,
  timely_filing_days INT,
  appeal_limit_days INT,
  prior_auth_required BOOLEAN NOT NULL DEFAULT false,
  prior_auth_notes TEXT,
  pcs_required BOOLEAN NOT NULL DEFAULT false,
  pcs_notes TEXT,
  documentation_requirements TEXT,
  common_denial_reasons TEXT,
  internal_notes TEXT,
  source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_reviewed_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_text TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(payer_type,'') || ' ' || coalesce(documentation_requirements,'') || ' ' || coalesce(common_denial_reasons,'') || ' ' || coalesce(internal_notes,''))
  ) STORED
);
CREATE INDEX payers_search_idx ON public.payers USING GIN(search_text);
CREATE TRIGGER payers_touch BEFORE UPDATE ON public.payers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.payers ENABLE ROW LEVEL SECURITY;

-- Payer rules
CREATE TABLE public.payer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES public.payers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  body TEXT NOT NULL,
  last_reviewed_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_text TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(category,'') || ' ' || coalesce(body,''))
  ) STORED
);
CREATE INDEX payer_rules_search_idx ON public.payer_rules USING GIN(search_text);
CREATE INDEX payer_rules_payer_idx ON public.payer_rules(payer_id);
CREATE TRIGGER payer_rules_touch BEFORE UPDATE ON public.payer_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.payer_rules ENABLE ROW LEVEL SECURITY;

-- Training
CREATE TABLE public.training_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  body TEXT NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_text TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(category,'') || ' ' || coalesce(body,''))
  ) STORED
);
CREATE INDEX training_search_idx ON public.training_articles USING GIN(search_text);
CREATE TRIGGER training_touch BEFORE UPDATE ON public.training_articles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.training_articles ENABLE ROW LEVEL SECURITY;

-- Denial guides
CREATE TABLE public.denial_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  denial_code TEXT,
  denial_reason TEXT NOT NULL,
  how_to_fix TEXT NOT NULL,
  required_attachments TEXT,
  appeal_template TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_text TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(denial_code,'') || ' ' || coalesce(denial_reason,'') || ' ' || coalesce(how_to_fix,'') || ' ' || coalesce(appeal_template,''))
  ) STORED
);
CREATE INDEX denial_search_idx ON public.denial_guides USING GIN(search_text);
CREATE TRIGGER denial_touch BEFORE UPDATE ON public.denial_guides FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.denial_guides ENABLE ROW LEVEL SECURITY;

-- Change log
CREATE TABLE public.change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_label TEXT,
  summary TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX change_log_created_idx ON public.change_log(created_at DESC);
ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;

-- RLS: any authed reads; staff writes; admin delete
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['payers','payer_rules','training_articles','denial_guides','change_log']) LOOP
    EXECUTE format('CREATE POLICY "authed read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_authed(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "staff insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "staff update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "admin delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.has_role(auth.uid(),''admin''))', t);
  END LOOP;
END$$;
