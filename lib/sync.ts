// ============================================
// BIDIRECTIONAL SYNC LOGIC
// ============================================

import {
  getSessions,
  updateSession,
  getActivities,
  createActivity,
  createSession,
} from "./db";
import {
  syncSessionToRemote,
  fetchActivities,
  fetchSessions,
  createRemoteActivity,
} from "./appwrite-db";
import { Activity } from "./types";

// ============================================
// SYNC STATUS TRACKING
// ============================================

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export interface ActivitySyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}

export interface SessionSyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}

// ============================================
// PUSH ACTIVITIES TO REMOTE
// ============================================

export async function pushActivitiesToRemote(
  userId: string
): Promise<ActivitySyncResult> {
  const result: ActivitySyncResult = { pushed: 0, pulled: 0, errors: [] };

  try {
    const localActivities = await getActivities();
    const remoteActivities = await fetchActivities(userId);
    const remoteNames = new Set(
      remoteActivities.map((a) => a.name.toLowerCase())
    );

    // Push local activities that don't exist remotely (match by name since IDs differ)
    for (const local of localActivities) {
      if (!remoteNames.has(local.name.toLowerCase())) {
        try {
          await createRemoteActivity(userId, {
            name: local.name,
            icon: local.icon,
            color: local.color,
          });
          result.pushed++;
          console.log(`✓ Synced activity: ${local.name}`);
        } catch (error) {
          result.errors.push(
            `Activity ${local.name}: ${
              error instanceof Error ? error.message : "Failed"
            }`
          );
        }
      }
    }
  } catch (error) {
    result.errors.push(
      `Activity sync failed: ${
        error instanceof Error ? error.message : "Unknown"
      }`
    );
  }

  return result;
}

// ============================================
// PULL ACTIVITIES FROM REMOTE TO LOCAL
// ============================================

export async function pullActivitiesFromRemote(
  userId: string
): Promise<{ added: number; updated: number }> {
  const result = { added: 0, updated: 0 };

  try {
    const remoteActivities = await fetchActivities(userId);
    const localActivities = await getActivities();
    const localNames = new Set(
      localActivities.map((a) => a.name.toLowerCase())
    );

    for (const remote of remoteActivities) {
      if (!localNames.has(remote.name.toLowerCase())) {
        // New activity from remote - add to local
        await createActivity({
          name: remote.name,
          icon: remote.icon,
          color: remote.color,
        });
        result.added++;
        console.log(`✓ Pulled activity: ${remote.name}`);
      }
    }
  } catch (error) {
    console.error("Failed to pull activities:", error);
  }

  return result;
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
    // Sync ALL pending sessions (both running and completed)
    const pendingSessions = allSessions.filter(
      (s) => s.syncStatus === "pending"
    );

    console.log(`Found ${pendingSessions.length} pending sessions to sync`);

    for (const session of pendingSessions) {
      try {
        const syncResult = await syncSessionToRemote(userId, {
          clientId: session.id,
          activityId: session.activityId,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.duration,
          status: session.endTime ? "stopped" : "running",
        });

        if (syncResult.success) {
          await updateSession(session.id, { syncStatus: "synced" });
          result.synced++;
          console.log(`✓ Synced session: ${session.id}`);
        } else {
          result.failed++;
          result.errors.push(`Session ${session.id}: ${syncResult.error}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Session ${session.id}: ${
            error instanceof Error ? error.message : "Failed"
          }`
        );
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
// PULL SESSIONS FROM REMOTE TO LOCAL
// ============================================

export async function pullSessionsFromRemote(
  userId: string
): Promise<SessionSyncResult> {
  const result: SessionSyncResult = { pushed: 0, pulled: 0, errors: [] };

  try {
    const remoteSessions = await fetchSessions(userId, { limit: 500 });
    const localSessions = await getSessions();
    const localClientIds = new Set(localSessions.map((s) => s.id));

    for (const remote of remoteSessions) {
      // Skip if we already have this session locally (by clientId)
      if (remote.clientId && localClientIds.has(remote.clientId)) {
        continue;
      }

      // Check if this remote session's $id matches any local id
      if (localClientIds.has(remote.$id)) {
        continue;
      }

      // New session from remote - add to local
      try {
        await createSession({
          activityId: remote.activityId,
          startTime: new Date(remote.startTime).getTime(),
          endTime: remote.endTime ? new Date(remote.endTime).getTime() : null,
          duration: remote.duration,
          syncStatus: "synced",
        });
        result.pulled++;
        console.log(`✓ Pulled session from ${remote.startTime}`);
      } catch (error) {
        result.errors.push(
          `Session ${remote.$id}: ${
            error instanceof Error ? error.message : "Failed"
          }`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `Session pull failed: ${
        error instanceof Error ? error.message : "Unknown"
      }`
    );
  }

  return result;
}

// ============================================
// FULL BIDIRECTIONAL SYNC
// ============================================

export interface FullSyncResult {
  activities: ActivitySyncResult;
  sessions: SyncResult;
  sessionsPulled: SessionSyncResult;
  success: boolean;
}

export async function performFullSync(userId: string): Promise<FullSyncResult> {
  console.log("🔄 Starting full sync...");

  // 1. Push local activities to remote
  const activityResult = await pushActivitiesToRemote(userId);
  console.log(`Activities: pushed ${activityResult.pushed}`);

  // 2. Pull remote activities to local
  const activityPull = await pullActivitiesFromRemote(userId);
  activityResult.pulled = activityPull.added;
  console.log(`Activities: pulled ${activityPull.added}`);

  // 3. Push local sessions to remote
  const sessionResult = await syncPendingSessions(userId);
  console.log(
    `Sessions: synced ${sessionResult.synced}, failed ${sessionResult.failed}`
  );

  // 4. Pull remote sessions to local
  const sessionsPulled = await pullSessionsFromRemote(userId);
  console.log(`Sessions: pulled ${sessionsPulled.pulled}`);

  const success =
    activityResult.errors.length === 0 &&
    sessionResult.success &&
    sessionsPulled.errors.length === 0;

  console.log(`🔄 Sync complete: ${success ? "✓ Success" : "✗ Some errors"}`);

  return {
    activities: activityResult,
    sessions: sessionResult,
    sessionsPulled,
    success,
  };
}

// ============================================
// SYNC SINGLE ACTIVITY TO REMOTE
// ============================================

export async function syncActivityToRemote(
  userId: string,
  activity: Activity
): Promise<{ success: boolean; error?: string }> {
  try {
    await createRemoteActivity(userId, {
      name: activity.name,
      icon: activity.icon,
      color: activity.color,
    });
    console.log(`✓ Synced activity: ${activity.name}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error(`✗ Failed to sync activity ${activity.name}:`, message);
    return { success: false, error: message };
  }
}

// ============================================
// ONLINE STATUS DETECTION
// ============================================

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function onOnlineStatusChange(
  callback: (online: boolean) => void
): () => void {
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
