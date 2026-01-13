"use client";

// ============================================
// SYNC HOOK - Auto-sync when online
// ============================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  performFullSync,
  onOnlineStatusChange,
  FullSyncResult,
} from "@/lib/sync";

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: number | null;
  lastResult: FullSyncResult | null;
  isOnline: boolean;
  pendingCount: number;
}

export function useSync() {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<SyncState>(() => ({
    isSyncing: false,
    lastSyncAt: null,
    lastResult: null,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingCount: 0,
  }));
  const syncTriggeredRef = useRef(false);

  // Full sync (push activities + sessions, pull activities + sessions)
  const fullSync = useCallback(async () => {
    if (!isAuthenticated || !user || state.isSyncing) return;

    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await performFullSync(user.$id);
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: Date.now(),
        lastResult: result,
        pendingCount: result.sessions.failed,
      }));
      return result;
    } catch (error) {
      console.error("Sync failed:", error);
      setState((prev) => ({ ...prev, isSyncing: false }));
      throw error;
    }
  }, [isAuthenticated, user, state.isSyncing]);

  // Track online status
  useEffect(() => {
    const cleanup = onOnlineStatusChange((online: boolean) => {
      setState((prev) => ({ ...prev, isOnline: online }));

      // Auto-sync when coming back online
      if (online && isAuthenticated && user) {
        performFullSync(user.$id).catch(console.error);
      }
    });

    return cleanup;
  }, [isAuthenticated, user]);

  // Auto full sync on mount if online and authenticated
  useEffect(() => {
    if (
      isAuthenticated &&
      state.isOnline &&
      !syncTriggeredRef.current &&
      user
    ) {
      syncTriggeredRef.current = true;
      // Use setTimeout to avoid the cascading setState warning
      const timer = setTimeout(() => {
        console.log("🚀 Triggering initial full sync...");
        performFullSync(user.$id).catch(console.error);
      }, 500); // Small delay to ensure auth is settled
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, state.isOnline, user]);

  return {
    ...state,
    sync: fullSync, // sync now does full bidirectional sync
    fullSync,
  };
}
