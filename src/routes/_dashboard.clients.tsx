import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/page-header";
import type { Database } from "@/integrations/supabase/types";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Invite = Database["public"]["Tables"]["invites"]["Row"];

export const Route = createFileRoute("/_dashboard/clients")({
  ssr: false,
  beforeLoad: async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw redirect({ to: "/login" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.session.user.id)
      .maybeSingle();
    if (profile?.role !== "admin") throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Clients — Relay" },
      { name: "description", content: "Manage client workspaces." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: workspaces, isLoading } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async (workspaceName: string) => {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({ name: workspaceName })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setCreating(false);
      setName("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every workspace isolates one client's codes, campaigns, and members."
        actions={
          <PrimaryButton onClick={() => setCreating((v) => !v)}>
            New workspace
          </PrimaryButton>
        }
      />

      {creating ? (
        <div className="border-b border-border bg-surface px-6 py-4">
          <form
            className="flex items-start gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createMut.mutate(name.trim());
            }}
          >
            <div className="flex-1">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name"
                className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {error ? (
                <p className="mt-1.5 text-xs text-destructive">{error}</p>
              ) : null}
            </div>
            <PrimaryButton type="submit" loading={createMut.isPending}>
              Create
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setCreating(false);
                setName("");
                setError(null);
              }}
            >
              Cancel
            </SecondaryButton>
          </form>
        </div>
      ) : null}

      {isLoading ? (
        <div className="p-6 text-xs text-muted-foreground">Loading…</div>
      ) : !workspaces || workspaces.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          description="Create a workspace for each client. Members you invite will be scoped to their workspace."
          action={
            <PrimaryButton onClick={() => setCreating(true)}>
              New workspace
            </PrimaryButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <ul className="divide-y divide-border border-b border-border lg:border-b-0 lg:border-r">
            {workspaces.map((w) => {
              const active = w.id === selectedId;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    className={[
                      "flex w-full items-center justify-between px-6 py-3 text-left transition-colors",
                      active
                        ? "bg-surface-hover"
                        : "hover:bg-surface-hover",
                    ].join(" ")}
                  >
                    <span className="truncate text-sm font-medium text-foreground">
                      {w.name}
                    </span>
                    <span className="ml-3 shrink-0 font-mono text-[10px] text-muted-foreground">
                      {new Date(w.created_at).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="min-w-0">
            {selectedId ? (
              <WorkspaceDetail workspaceId={selectedId} />
            ) : (
              <div className="p-6 text-xs text-muted-foreground">
                Select a workspace to view its members and invites.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function inviteUrl(token: string) {
  if (typeof window === "undefined") return `/accept?token=${token}`;
  return `${window.location.origin}/accept?token=${token}`;
}

function WorkspaceDetail({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: members } = useQuery<Pick<Profile, "id" | "email" | "role">[]>({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("workspace_id", workspaceId)
        .order("email");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: invites } = useQuery<
    Pick<Invite, "id" | "email" | "status" | "expires_at" | "token">[]
  >({
    queryKey: ["workspace-invites", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("id,email,status,expires_at,token")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createInvite = useMutation({
    mutationFn: async (rawEmail: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("invites")
        .insert({
          email: rawEmail,
          workspace_id: workspaceId,
          invited_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      setCreatedToken(row.token);
      setEmail("");
      setInviteError(null);
      qc.invalidateQueries({ queryKey: ["workspace-invites", workspaceId] });
    },
    onError: (e: { code?: string; message: string }) => {
      if (e.code === "23505") {
        setInviteError(
          "There's already a pending invite for this email in this workspace.",
        );
      } else {
        setInviteError(e.message);
      }
    },
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invites")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-invites", workspaceId] });
    },
  });

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <section>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Invite someone
        </h3>
        <form
          className="flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = email.trim();
            if (!trimmed) return;
            setCreatedToken(null);
            createInvite.mutate(trimmed);
          }}
        >
          <div className="flex-1">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@client.com"
              className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {inviteError ? (
              <p className="mt-1.5 text-xs text-destructive">{inviteError}</p>
            ) : null}
          </div>
          <PrimaryButton type="submit" loading={createInvite.isPending}>
            Generate link
          </PrimaryButton>
        </form>

        {createdToken ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl(createdToken)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-9 flex-1 rounded-[6px] border border-border bg-surface px-3 font-mono text-xs text-foreground focus:outline-none"
            />
            <SecondaryButton
              onClick={() => copy("new", inviteUrl(createdToken))}
            >
              {copiedKey === "new" ? "Copied" : "Copy link"}
            </SecondaryButton>
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Members
        </h3>
        {!members || members.length === 0 ? (
          <p className="text-xs text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-[6px] border border-border">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-3 py-2"
              >
                <span className="truncate text-sm text-foreground">
                  {m.email ?? "—"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Invites
        </h3>
        {!invites || invites.length === 0 ? (
          <p className="text-xs text-muted-foreground">No invites yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-[6px] border border-border">
            {invites.map((i) => {
              const pending = i.status === "pending";
              return (
                <li
                  key={i.id}
                  className={[
                    "flex items-center justify-between gap-3 px-3 py-2",
                    pending ? "" : "opacity-60",
                  ].join(" ")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {i.email}
                    </p>
                    <p className="mt-0.5 flex gap-3 font-mono text-[10px] text-muted-foreground">
                      <span>{i.status}</span>
                      <span>
                        exp {new Date(i.expires_at).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                  {pending ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <SecondaryButton
                        onClick={() =>
                          copy(`inv-${i.id}`, inviteUrl(i.token))
                        }
                      >
                        {copiedKey === `inv-${i.id}` ? "Copied" : "Copy link"}
                      </SecondaryButton>
                      <SecondaryButton
                        onClick={() => revokeInvite.mutate(i.id)}
                        disabled={revokeInvite.isPending}
                      >
                        Revoke
                      </SecondaryButton>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

