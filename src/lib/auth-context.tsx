import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthValue = {
  user: User;
  profile: Profile | null;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({
  value,
  children,
}: {
  value: AuthValue;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
