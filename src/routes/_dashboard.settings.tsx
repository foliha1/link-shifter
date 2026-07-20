import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { PageHeader, PrimaryButton } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Oleeha QR" },
      { name: "description", content: "Workspace and redirect service settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  const newPasswordError =
    touched.newPassword && newPassword.length > 0 && newPassword.length < 8
      ? "Password must be at least 8 characters."
      : null;

  const confirmPasswordError =
    touched.confirmPassword &&
    confirmPassword.length > 0 &&
    confirmPassword !== newPassword
      ? "Passwords do not match."
      : null;

  const isValid =
    newPassword.length >= 8 && confirmPassword === newPassword;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ newPassword: true, confirmPassword: true });
    setSuccess(false);
    setError(null);

    if (!isValid) return;

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setTouched({ newPassword: false, confirmPassword: false });
    setSuccess(true);
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace, redirect domain, and team access."
      />

      <div className="p-6">
        <section className="max-w-md rounded-[6px] border border-border bg-surface p-6">
          <h2 className="text-sm font-medium text-foreground">Password</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a new password for your account.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                New password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setSuccess(false);
                  setError(null);
                }}
                onBlur={() =>
                  setTouched((t) => ({ ...t, newPassword: true }))
                }
                disabled={loading}
                className="h-11 rounded-[6px] border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent disabled:opacity-40"
              />
              {newPasswordError ? (
                <span className="text-xs text-destructive">
                  {newPasswordError}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                Confirm password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setSuccess(false);
                  setError(null);
                }}
                onBlur={() =>
                  setTouched((t) => ({ ...t, confirmPassword: true }))
                }
                disabled={loading}
                className="h-11 rounded-[6px] border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent disabled:opacity-40"
              />
              {confirmPasswordError ? (
                <span className="text-xs text-destructive">
                  {confirmPasswordError}
                </span>
              ) : null}
            </label>

            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}

            {success ? (
              <p role="status" className="text-xs text-foreground">
                Password updated.
              </p>
            ) : null}

            <PrimaryButton
              type="submit"
              loading={loading}
              disabled={!isValid}
            >
              {loading ? "Saving…" : "Update password"}
            </PrimaryButton>
          </form>
        </section>
      </div>
    </>
  );
}
