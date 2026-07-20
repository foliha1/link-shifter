import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth, type Profile } from "@/lib/auth-context";

export const Route = createFileRoute("/_dashboard")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    return { user: data.session.user };
  },
  component: DashboardLayout,
});

const NAV = [
  { to: "/", label: "Codes", exact: true },
  { to: "/campaigns", label: "Campaigns", exact: false },
  { to: "/analytics", label: "Analytics", exact: false },
  { to: "/settings", label: "Settings", exact: false },
] as const;

function DashboardLayout() {
  const { user } = Route.useRouteContext() as { user: User };
  const router = useRouter();
  const navigate = useNavigate();

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

  // Refresh router on auth changes (e.g. token refresh, external sign-out).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.invalidate();
        navigate({ to: "/login", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, navigate]);

  return (
    <AuthProvider value={{ user, profile: profile ?? null }}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-background md:flex">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="grid h-6 w-6 place-items-center rounded-[4px] bg-primary">
          <div className="h-2 w-2 rounded-[1px] bg-accent" />
        </div>
        <span className="font-mono text-sm font-medium tracking-tight">
          relay
        </span>
      </div>

      <nav className="flex flex-col gap-px px-3 py-2">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "flex h-8 items-center rounded-[4px] px-2 text-sm transition-colors",
                active
                  ? "bg-surface-hover font-medium text-foreground"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border p-3">
        <UserFooter />
      </div>
    </aside>
  );
}

function UserFooter() {
  const { user, profile } = useAuth();
  const email = profile?.email ?? user.email ?? "";
  const role = profile?.role ?? "member";
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="h-6 w-6 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {email || "Signed in"}
          </p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {role}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className="h-8 rounded-[4px] px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

function MobileTopBar() {
  return (
    <div className="flex h-12 items-center justify-between border-b border-border px-4 md:hidden">
      <div className="flex items-center gap-2">
        <div className="grid h-5 w-5 place-items-center rounded-[3px] bg-primary">
          <div className="h-1.5 w-1.5 rounded-[1px] bg-accent" />
        </div>
        <span className="font-mono text-sm font-medium">relay</span>
      </div>
      <nav className="flex gap-3">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="text-xs text-muted-foreground hover:text-foreground"
            activeProps={{ className: "text-xs text-foreground font-medium" }}
            activeOptions={{ exact: n.exact }}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
