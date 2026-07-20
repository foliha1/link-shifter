import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-medium text-foreground">{title}</h1>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "inline-flex h-9 min-w-[44px] items-center justify-center gap-1.5 rounded-[6px] px-3 text-sm font-medium transition-colors",
        "bg-accent text-accent-foreground",
        "hover:opacity-90 active:opacity-80",
        "disabled:cursor-not-allowed disabled:opacity-40",
      ].join(" ")}
    >
      {loading ? (
        <span
          aria-hidden
          className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-9 min-w-[44px] items-center justify-center gap-1.5 rounded-[6px] border border-border bg-surface px-3 text-sm text-foreground transition-colors",
        "hover:bg-surface-hover active:bg-muted",
        "disabled:cursor-not-allowed disabled:opacity-40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-[6px] border border-border bg-surface text-muted-foreground">
          {icon ?? <DefaultDot />}
        </div>
        <h2 className="mt-6 text-sm font-medium text-foreground">{title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

function DefaultDot() {
  return <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />;
}
