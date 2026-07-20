import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
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

function formatErrorDebug(error: Error): string {
  const lines: string[] = [];
  lines.push(error.message);

  const anyError = error as unknown as Record<string, unknown>;
  if (anyError.code) lines.push(`code: ${anyError.code}`);
  if (anyError.details) lines.push(`details: ${anyError.details}`);
  if (anyError.hint) lines.push(`hint: ${anyError.hint}`);

  return lines.join("\n");
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
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-md border border-border bg-surface p-3 text-left font-mono text-xs text-muted-foreground">
          {formatErrorDebug(error)}
        </pre>
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
