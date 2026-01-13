"use client";

// ============================================
// PROVIDERS - Wrap app with all context providers
// ============================================

import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
