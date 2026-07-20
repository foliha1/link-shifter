import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

type LoginSearch = { notice?: "invite-only" };

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    notice: s.notice === "invite-only" ? "invite-only" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Relay" },
      { name: "description", content: "Sign in to Relay." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});


function LoginPage() {
  const navigate = useNavigate();
  const { notice } = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(
        /invalid/i.test(err.message)
          ? "Wrong email or password."
          : err.message,
      );
      return;
    }
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
          <h1 className="text-sm font-medium text-foreground">Sign in</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Invite-only. Use the credentials your admin gave you.
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 rounded-[6px] border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent disabled:opacity-40"
              />
            </label>

            {error ? (
              <p
                role="alert"
                className="text-xs text-destructive"
              >
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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
