// ============================================
// OFFLINE → ONLINE SYNC LOGIC
// ============================================

import { getSessions, updateSession, getActivities, createActivity } from "./db";
import {
  syncSessionToRemote,
  fetchActivities,
  AppwriteActivity,
  AppwriteSession,
} from "./appwrite-db";
import { Activity, TimeSession } from "./types";

// ============================================
// SYNC STATUS TRACKING
// ============================================

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

// ============================================
// SYNC PENDING SESSIONS TO REMOTE
// ============================================

export async function syncPendingSessions(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    const allSessions = await getSessions();
    const pendingSessions = allSessions.filter(
      (s) => s.syncStatus === "pending" && s.endTime !== null // Only sync completed sessions
    );

    for (const session of pendingSessions) {
      const syncResult = await syncSessionToRemote(userId, {
        clientId: session.id, // Use local ID as clientId
        activityId: session.activityId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        status: session.endTime ? "stopped" : "running",
      });

      if (syncResult.success) {
        // Update local session as synced
        await updateSession(session.id, { syncStatus: "synced" });
        result.synced++;
      } else {
        result.failed++;
        result.errors.push(`Session ${session.id}: ${syncResult.error}`);
      }
    }

    result.success = result.failed === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : "Sync failed");
  }

  return result;
}

// ============================================
// PULL REMOTE DATA TO LOCAL
// ============================================

export async function pullActivitiesFromRemote(
  userId: string
): Promise<{ added: number; updated: number }> {
  const result = { added: 0, updated: 0 };

  try {
    const remoteActivities = await fetchActivities(userId);
    const localActivities = await getActivities();
    const localMap = new Map(localActivities.map((a) => [a.id, a]));

    for (const remote of remoteActivities) {
      const local = localMap.get(remote.$id);

      if (!local) {
        // New activity from remote - add to local
        await createActivity({
          name: remote.name,
          icon: remote.icon,
          color: remote.color,
        });
        result.added++;
      }
      // Note: We don't update local activities from remote in this simple sync
      // You could add conflict resolution here if needed
    }
  } catch (error) {
    console.error("Failed to pull activities:", error);
  }

  return result;
}

// ============================================
// FULL SYNC (BIDIRECTIONAL)
// ============================================

export async function performFullSync(userId: string): Promise<{
  push: SyncResult;
  pull: { added: number; updated: number };
}> {
  // 1. Push local changes to remote
  const pushResult = await syncPendingSessions(userId);

  // 2. Pull remote changes to local
  const pullResult = await pullActivitiesFromRemote(userId);

  return {
    push: pushResult,
    pull: pullResult,
  };
}

// ============================================
// ONLINE STATUS DETECTION
// ============================================

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

// ============================================
// CONVERT BETWEEN LOCAL AND REMOTE TYPES
// ============================================

export function remoteActivityToLocal(remote: AppwriteActivity): Activity {
  return {
    id: remote.$id,
    name: remote.name,
    icon: remote.icon,
    color: remote.color,
    createdAt: new Date(remote.$createdAt).getTime(),
    updatedAt: new Date(remote.$updatedAt).getTime(),
  };
}

export function remoteSessionToLocal(remote: AppwriteSession): TimeSession {
  return {
    id: remote.$id,
    activityId: remote.activityId,
    startTime: new Date(remote.startTime).getTime(),
    endTime: remote.endTime ? new Date(remote.endTime).getTime() : null,
    duration: remote.duration,
    syncStatus: "synced",
    createdAt: new Date(remote.$createdAt).getTime(),
    updatedAt: new Date(remote.$updatedAt).getTime(),
  };
}
