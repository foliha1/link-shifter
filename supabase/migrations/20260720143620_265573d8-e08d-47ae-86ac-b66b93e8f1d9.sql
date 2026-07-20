
-- Pin search_path on the remaining functions
ALTER FUNCTION public.generate_short_code() SET search_path = public;
ALTER FUNCTION public.set_qr_short_code() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Revoke public/anon execute on SECURITY DEFINER helpers (still callable by authenticated for RLS)
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_workspace_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
