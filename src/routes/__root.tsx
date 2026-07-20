import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 text-lg font-medium text-foreground">
          Nothing at this address.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Back to codes
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Error
        </p>
        <h1 className="mt-3 text-lg font-medium text-foreground">
          This page didn't load.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Relay — Dynamic QR codes" },
      {
        name: "description",
        content:
          "Relay is a dynamic QR code manager. Print once, re-point anytime.",
      },
      { name: "author", content: "Relay" },
      { property: "og:title", content: "Relay — Dynamic QR codes" },
      {
        property: "og:description",
        content:
          "Relay is a dynamic QR code manager. Print once, re-point anytime.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Codes" },
  { to: "/campaigns", label: "Campaigns" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
] as const;

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
          const active =
            item.to === "/"
              ? pathname === "/"
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
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="h-6 w-6 rounded-full bg-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              Studio
            </p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              workspace
            </p>
          </div>
        </div>
      </div>
    </aside>
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
            activeOptions={{ exact: n.to === "/" }}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
