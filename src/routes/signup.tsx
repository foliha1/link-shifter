import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create owner account — Relay" },
      { name: "description", content: "Bootstrap the first Relay admin." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: session } = await supabase.auth.getSession();
    if (session.session) throw redirect({ to: "/" });
    const { data, error } = await supabase.rpc("admin_exists");
    if (error) throw new Error(`Bootstrap check failed: ${error.message}`);
    if (data === true) {
      throw redirect({ to: "/login", search: { notice: "invite-only" } });
    }
  },
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        setLoading(false);
        setError(
          "Account created, but sign-in failed. Disable email confirmation, then sign in.",
        );
        return;
      }
    }
    setLoading(false);
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-[4px] bg-primary">
            <div className="h-2 w-2 rounded-[1px] bg-accent" />
          </div>
          <span className="font-mono text-sm font-medium tracking-tight">
            relay
          </span>
        </div>

        <div className="rounded-[6px] border border-border bg-surface p-6">
          <h1 className="text-sm font-medium text-foreground">
            Create owner account
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            This is the first account, so it becomes the workspace admin.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-11 rounded-[6px] border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent disabled:opacity-40"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                Password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 rounded-[6px] border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent disabled:opacity-40"
              />
            </label>

            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span
                  aria-hidden
                  className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
                />
              ) : null}
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
