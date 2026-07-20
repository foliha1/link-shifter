
-- ============ ENUM ============
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- ============ WORKSPACES ============
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role public.app_role NOT NULL DEFAULT 'member',
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS (avoid recursive RLS) ============
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_workspace_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.profiles WHERE id = _user_id
$$;

-- ============ PROFILES POLICIES ============
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Members can view profiles in their workspace"
ON public.profiles FOR SELECT TO authenticated
USING (
  workspace_id IS NOT NULL
  AND workspace_id = public.current_workspace_id(auth.uid())
);

-- Users can update their own profile EXCEPT role/workspace_id
CREATE POLICY "Users can update own profile (non-privileged fields)"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND workspace_id IS NOT DISTINCT FROM (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- ============ WORKSPACES POLICIES ============
CREATE POLICY "Admins manage all workspaces"
ON public.workspaces FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Members can view their own workspace"
ON public.workspaces FOR SELECT TO authenticated
USING (id = public.current_workspace_id(auth.uid()));

-- ============ PROFILE AUTO-CREATE TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CAMPAIGNS ============
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaigns_workspace_id_idx ON public.campaigns(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all campaigns"
ON public.campaigns FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Members manage campaigns in their workspace"
ON public.campaigns FOR ALL TO authenticated
USING (workspace_id = public.current_workspace_id(auth.uid()))
WITH CHECK (workspace_id = public.current_workspace_id(auth.uid()));

-- ============ SHORT CODE GENERATOR ============
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============ QR CODES ============
CREATE TABLE public.qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  short_code text NOT NULL UNIQUE,
  label text NOT NULL,
  destination_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qr_codes_short_code_idx ON public.qr_codes(short_code);
CREATE INDEX qr_codes_workspace_id_idx ON public.qr_codes(workspace_id);
CREATE INDEX qr_codes_campaign_id_idx ON public.qr_codes(campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_codes TO authenticated;
GRANT ALL ON public.qr_codes TO service_role;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-fill short_code on insert (retry on collision)
CREATE OR REPLACE FUNCTION public.set_qr_short_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  attempts int := 0;
BEGIN
  IF NEW.short_code IS NULL OR NEW.short_code = '' THEN
    LOOP
      candidate := public.generate_short_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.qr_codes WHERE short_code = candidate);
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique short_code';
      END IF;
    END LOOP;
    NEW.short_code := candidate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER qr_codes_set_short_code
BEFORE INSERT ON public.qr_codes
FOR EACH ROW EXECUTE FUNCTION public.set_qr_short_code();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER qr_codes_updated_at
BEFORE UPDATE ON public.qr_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Admins manage all qr_codes"
ON public.qr_codes FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Members manage qr_codes in their workspace"
ON public.qr_codes FOR ALL TO authenticated
USING (workspace_id = public.current_workspace_id(auth.uid()))
WITH CHECK (workspace_id = public.current_workspace_id(auth.uid()));

-- ============ SCANS ============
CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  referrer text
);
CREATE INDEX scans_qr_code_id_idx ON public.scans(qr_code_id);
CREATE INDEX scans_scanned_at_idx ON public.scans(scanned_at);
GRANT SELECT ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all scans"
ON public.scans FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Members can view scans for qr_codes in their workspace"
ON public.scans FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.qr_codes q
    WHERE q.id = scans.qr_code_id
      AND q.workspace_id = public.current_workspace_id(auth.uid())
  )
);
