"use client";

// ============================================
// SYNC HOOK - Auto-sync when online
// ============================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  performFullSync,
  syncPendingSessions,
  onOnlineStatusChange,
  SyncResult,
} from "@/lib/sync";

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: number | null;
  lastResult: SyncResult | null;
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

  // Manual sync trigger
  const sync = useCallback(async () => {
    if (!isAuthenticated || !user || state.isSyncing) return;

    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await syncPendingSessions(user.$id);
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: Date.now(),
        lastResult: result,
        pendingCount: result.failed,
      }));
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, isSyncing: false }));
      throw error;
    }
  }, [isAuthenticated, user, state.isSyncing]);

  // Full sync (push + pull)
  const fullSync = useCallback(async () => {
    if (!isAuthenticated || !user || state.isSyncing) return;

    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await performFullSync(user.$id);
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: Date.now(),
        lastResult: result.push,
        pendingCount: result.push.failed,
      }));
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, isSyncing: false }));
      throw error;
    }
  }, [isAuthenticated, user, state.isSyncing]);

  // Track online status
  useEffect(() => {
    const cleanup = onOnlineStatusChange((online) => {
      setState((prev) => ({ ...prev, isOnline: online }));

      // Auto-sync when coming back online
      if (online && isAuthenticated && user) {
        syncPendingSessions(user.$id).catch(console.error);
      }
    });

    return cleanup;
  }, [isAuthenticated, user]);

  // Auto-sync on mount if online and authenticated
  useEffect(() => {
    if (isAuthenticated && state.isOnline && !syncTriggeredRef.current && user) {
      syncTriggeredRef.current = true;
      // Use setTimeout to avoid the cascading setState warning
      const timer = setTimeout(() => {
        syncPendingSessions(user.$id).catch(console.error);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, state.isOnline, user]);

  return {
    ...state,
    sync,
    fullSync,
  };
}
