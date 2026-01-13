// ============================================
// APPWRITE DATABASE OPERATIONS
// ============================================

import {
  getDatabases,
  APPWRITE_CONFIG,
  ID,
  Query,
  AppwriteDocument,
} from "./appwrite";
import { Permission, Role } from "appwrite";

// ============================================
// TYPES - Appwrite Document Types
// ============================================

export interface AppwriteActivity extends AppwriteDocument {
  name: string;
  icon: string;
  color: string;
  category: string;
  isArchived: boolean;
  sortOrder: number;
}

export interface AppwriteSession extends AppwriteDocument {
  activityId: string;
  startTime: string; // ISO datetime
  endTime: string | null;
  duration: number | null;
  status: "running" | "stopped";
  syncStatus: "pending" | "synced" | "conflict";
  clientId: string;
}

// ============================================
// PERMISSION HELPERS
// ============================================

function getUserPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

// ============================================
// ACTIVITIES - Remote Operations
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchActivities(_userId: string): Promise<AppwriteActivity[]> {
  const db = getDatabases();
  const response = await db.listDocuments(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.activitiesCollectionId,
    [
      Query.equal("isArchived", false),
      Query.orderAsc("sortOrder"),
      Query.limit(100),
    ]
  );
  return response.documents as unknown as AppwriteActivity[];
}

export async function createRemoteActivity(
  userId: string,
  data: {
    name: string;
    icon: string;
    color: string;
    category?: string;
    sortOrder?: number;
  }
): Promise<AppwriteActivity> {
  const db = getDatabases();
  const doc = await db.createDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.activitiesCollectionId,
    ID.unique(),
    {
      name: data.name,
      icon: data.icon,
      color: data.color,
      category: data.category || "general",
      isArchived: false,
      sortOrder: data.sortOrder || 0,
    },
    getUserPermissions(userId)
  );
  return doc as unknown as AppwriteActivity;
}

export async function updateRemoteActivity(
  activityId: string,
  data: Partial<{
    name: string;
    icon: string;
    color: string;
    category: string;
    isArchived: boolean;
    sortOrder: number;
  }>
): Promise<AppwriteActivity> {
  const db = getDatabases();
  const doc = await db.updateDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.activitiesCollectionId,
    activityId,
    data
  );
  return doc as unknown as AppwriteActivity;
}

export async function deleteRemoteActivity(activityId: string): Promise<void> {
  const db = getDatabases();
  // Soft delete - mark as archived
  await db.updateDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.activitiesCollectionId,
    activityId,
    { isArchived: true }
  );
}

// ============================================
// SESSIONS - Remote Operations
// ============================================

export async function fetchSessions(
  userId: string,
  options?: {
    activityId?: string;
    startDate?: string;
    endDate?: string;
    status?: "running" | "stopped";
    limit?: number;
  }
): Promise<AppwriteSession[]> {
  const db = getDatabases();
  const queries: string[] = [Query.orderDesc("startTime")];

  if (options?.activityId) {
    queries.push(Query.equal("activityId", options.activityId));
  }
  if (options?.startDate) {
    queries.push(Query.greaterThanEqual("startTime", options.startDate));
  }
  if (options?.endDate) {
    queries.push(Query.lessThanEqual("startTime", options.endDate));
  }
  if (options?.status) {
    queries.push(Query.equal("status", options.status));
  }
  queries.push(Query.limit(options?.limit || 100));

  const response = await db.listDocuments(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.sessionsCollectionId,
    queries
  );
  return response.documents as unknown as AppwriteSession[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getRunningSession(_userId: string): Promise<AppwriteSession | null> {
  const db = getDatabases();
  const response = await db.listDocuments(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.sessionsCollectionId,
    [Query.equal("status", "running"), Query.limit(1)]
  );
  return (response.documents[0] as unknown as AppwriteSession) || null;
}

export async function createRemoteSession(
  userId: string,
  data: {
    activityId: string;
    startTime: Date;
    clientId: string;
  }
): Promise<AppwriteSession> {
  const db = getDatabases();

  // Check for existing running session
  const running = await getRunningSession(userId);
  if (running) {
    throw new Error("RUNNING_SESSION_EXISTS");
  }

  const doc = await db.createDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.sessionsCollectionId,
    ID.unique(),
    {
      activityId: data.activityId,
      startTime: data.startTime.toISOString(),
      endTime: null,
      duration: null,
      status: "running",
      syncStatus: "synced",
      clientId: data.clientId,
    },
    getUserPermissions(userId)
  );
  return doc as unknown as AppwriteSession;
}

export async function stopRemoteSession(
  sessionId: string,
  endTime: Date
): Promise<AppwriteSession> {
  const db = getDatabases();

  // Get current session to calculate duration
  const session = await db.getDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.sessionsCollectionId,
    sessionId
  ) as unknown as AppwriteSession;

  const startTime = new Date(session.startTime);
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  const doc = await db.updateDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.sessionsCollectionId,
    sessionId,
    {
      endTime: endTime.toISOString(),
      duration,
      status: "stopped",
    }
  );
  return doc as unknown as AppwriteSession;
}

export async function updateRemoteSession(
  sessionId: string,
  data: Partial<{
    activityId: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: "running" | "stopped";
    syncStatus: "pending" | "synced" | "conflict";
  }>
): Promise<AppwriteSession> {
  const db = getDatabases();
  const doc = await db.updateDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.sessionsCollectionId,
    sessionId,
    data
  );
  return doc as unknown as AppwriteSession;
}

export async function deleteRemoteSession(sessionId: string): Promise<void> {
  const db = getDatabases();
  await db.deleteDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.sessionsCollectionId,
    sessionId
  );
}

// ============================================
// SYNC HELPERS - Check for duplicates by clientId
// ============================================

export async function findSessionByClientId(
  clientId: string
): Promise<AppwriteSession | null> {
  const db = getDatabases();
  try {
    const response = await db.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.sessionsCollectionId,
      [Query.equal("clientId", clientId), Query.limit(1)]
    );
    return (response.documents[0] as unknown as AppwriteSession) || null;
  } catch {
    return null;
  }
}

export async function syncSessionToRemote(
  userId: string,
  localSession: {
    clientId: string;
    activityId: string;
    startTime: number;
    endTime: number | null;
    duration: number | null;
    status: "running" | "stopped";
  }
): Promise<{ success: boolean; remoteId?: string; error?: string }> {
  try {
    // Check if already synced
    const existing = await findSessionByClientId(localSession.clientId);
    if (existing) {
      return { success: true, remoteId: existing.$id };
    }

    // Create new remote session
    const db = getDatabases();
    const doc = await db.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.sessionsCollectionId,
      ID.unique(),
      {
        activityId: localSession.activityId,
        startTime: new Date(localSession.startTime).toISOString(),
        endTime: localSession.endTime
          ? new Date(localSession.endTime).toISOString()
          : null,
        duration: localSession.duration,
        status: localSession.status === "running" ? "running" : "stopped",
        syncStatus: "synced",
        clientId: localSession.clientId,
      },
      getUserPermissions(userId)
    );

    return { success: true, remoteId: doc.$id };
  } catch (error: unknown) {
    // Handle duplicate clientId (409 conflict)
    const appwriteError = error as { code?: number; message?: string };
    if (appwriteError?.code === 409) {
      const existing = await findSessionByClientId(localSession.clientId);
      if (existing) {
        return { success: true, remoteId: existing.$id };
      }
    }
    return { success: false, error: appwriteError?.message || "Sync failed" };
  }
}
