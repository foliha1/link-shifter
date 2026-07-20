
-- Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions that
-- do not need to be called via the Data API. Trigger functions are invoked
-- by the database, not by clients.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_qr_short_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_short_code() FROM PUBLIC, anon, authenticated;

-- admin_exists is intentionally callable by anon (used on the signup page to
-- decide whether sign-ups are open). Keep anon EXECUTE, revoke the rest.
REVOKE ALL ON FUNCTION public.admin_exists() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon;

-- is_admin and current_workspace_id are invoked from RLS policies during
-- authenticated Data API queries, so authenticated must retain EXECUTE.
-- Revoke from PUBLIC/anon to minimize surface.
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.current_workspace_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_workspace_id(uuid) TO authenticated;
