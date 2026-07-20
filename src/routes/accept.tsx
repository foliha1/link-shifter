import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

type AcceptSearch = { token?: string };

export const Route = createFileRoute("/accept")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): AcceptSearch => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Accept invite — Relay" },
      { name: "description", content: "Accept your Relay workspace invite." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/accept" });
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      navigate({ to: "/login" });
    }, 2000);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke(
      "accept-invite",
      {
        method: "POST",
        body: {
          token,
          password,
          full_name: fullName.trim() || undefined,
        },
      },
    );
    setLoading(false);

    if (fnError) {
      let message = fnError.message || "Something went wrong.";
      try {
        const parsed = JSON.parse(message);
        if (parsed.error) message = parsed.error;
      } catch {
        // leave message as-is
      }
      setError(message);
      return;
    }

    if (data && data.error) {
      setError(data.error);
      return;
    }

    setSuccess(true);
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
          {!token ? (
            <>
              <h1 className="text-sm font-medium text-foreground">
                Invite link invalid
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                This invite link is missing or malformed. Ask your admin for a
                new one.
              </p>
            </>
          ) : success ? (
            <>
              <h1 className="text-sm font-medium text-foreground">
                Account created
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Your account is ready. Redirecting you to sign in…
              </p>
            </>
          ) : (
            <>
              <h1 className="text-sm font-medium text-foreground">
                Set up your account
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Accept your invite and create a password.
              </p>

              <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Full name
                    <span className="ml-1 font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Confirm password
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
