// Public edge function: redeems an invite token and provisions the auth user.
// Called by a logged-out visitor from the invite acceptance page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_INVALID = "This invite link is invalid, already used, or expired.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload: { token?: unknown; password?: unknown; full_name?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const fullName =
    typeof payload.full_name === "string" && payload.full_name.trim().length > 0
      ? payload.full_name.trim()
      : null;

  if (!token) {
    return json({ error: GENERIC_INVALID }, 400);
  }
  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters." }, 400);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[accept-invite] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "Server misconfigured." }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Look up invite.
  const { data: invite, error: inviteErr } = await admin
    .from("invites")
    .select("id, email, workspace_id, role, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteErr) {
    console.error("[accept-invite] invite lookup failed", inviteErr);
    return json({ error: "Could not verify invite." }, 500);
  }

  if (
    !invite ||
    invite.status !== "pending" ||
    new Date(invite.expires_at).getTime() < Date.now()
  ) {
    return json({ error: GENERIC_INVALID }, 400);
  }

  // 2. Create auth user with the invite's own email.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (createErr || !created?.user) {
    const msg = (createErr?.message || "").toLowerCase();
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("already exists") ||
      msg.includes("duplicate")
    ) {
      return json(
        { error: "An account with this email already exists — please sign in instead." },
        400,
      );
    }
    console.error("[accept-invite] createUser failed", createErr);
    return json({ error: "Could not create account." }, 500);
  }

  const userId = created.user.id;

  // 3. Update profile with workspace + role from invite.
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      workspace_id: invite.workspace_id,
      role: invite.role,
      ...(fullName ? { full_name: fullName } : {}),
    })
    .eq("id", userId);

  if (profileErr) {
    console.error("[accept-invite] profile update failed", profileErr);
    return json({ error: "Account created but profile setup failed. Contact an admin." }, 500);
  }

  // 4. Mark invite accepted.
  const { error: acceptErr } = await admin
    .from("invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (acceptErr) {
    console.error("[accept-invite] invite accept update failed", acceptErr);
    // Non-fatal to the user; account is usable.
  }

  return json({ success: true });
});
