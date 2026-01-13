// ============================================
// INDEXEDDB STORAGE LAYER - Offline-first
// ============================================

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Activity, TimeSession, TimerState, DEFAULT_ACTIVITIES } from "./types";

interface TimeTrackerDB extends DBSchema {
  activities: {
    key: string;
    value: Activity;
    indexes: { "by-name": string };
  };
  sessions: {
    key: string;
    value: TimeSession;
    indexes: {
      "by-activity": string;
      "by-start-time": number;
      "by-sync-status": string;
    };
  };
  timerState: {
    key: string;
    value: TimerState;
  };
}

const DB_NAME_PREFIX = "time-tracker-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TimeTrackerDB>> | null = null;
let currentUserId: string | null = null;

// Get the database name for a specific user
function getDBName(userId?: string): string {
  return userId ? `${DB_NAME_PREFIX}-${userId}` : DB_NAME_PREFIX;
}

// Initialize/switch database for a user
export function setCurrentUser(userId: string | null): void {
  if (currentUserId !== userId) {
    // Close existing connection and create new one for new user
    dbPromise = null;
    currentUserId = userId;
    console.log(`DB: Switched to user database: ${userId || 'anonymous'}`);
  }
}

// Get current user ID
export function getCurrentUserId(): string | null {
  return currentUserId;
}

function getDB(): Promise<IDBPDatabase<TimeTrackerDB>> {
  if (!dbPromise) {
    const dbName = getDBName(currentUserId || undefined);
    console.log(`DB: Opening database: ${dbName}`);
    dbPromise = openDB<TimeTrackerDB>(dbName, DB_VERSION, {
      upgrade(db) {
        // Activities store
        if (!db.objectStoreNames.contains("activities")) {
          const activityStore = db.createObjectStore("activities", {
            keyPath: "id",
          });
          activityStore.createIndex("by-name", "name");
        }

        // Sessions store
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionStore = db.createObjectStore("sessions", {
            keyPath: "id",
          });
          sessionStore.createIndex("by-activity", "activityId");
          sessionStore.createIndex("by-start-time", "startTime");
          sessionStore.createIndex("by-sync-status", "syncStatus");
        }

        // Timer state store (singleton)
        if (!db.objectStoreNames.contains("timerState")) {
          db.createObjectStore("timerState", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

// ============================================
// ACTIVITIES CRUD
// ============================================

export async function getActivities(): Promise<Activity[]> {
  const db = await getDB();
  return db.getAll("activities");
}

export async function getActivity(id: string): Promise<Activity | undefined> {
  const db = await getDB();
  return db.get("activities", id);
}

export async function createActivity(
  data: Omit<Activity, "id" | "createdAt" | "updatedAt">
): Promise<Activity> {
  const db = await getDB();
  const now = Date.now();
  const activity: Activity = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.put("activities", activity);
  return activity;
}

export async function updateActivity(
  id: string,
  data: Partial<Omit<Activity, "id" | "createdAt">>
): Promise<Activity | null> {
  const db = await getDB();
  const existing = await db.get("activities", id);
  if (!existing) return null;

  const updated: Activity = {
    ...existing,
    ...data,
    updatedAt: Date.now(),
  };
  await db.put("activities", updated);
  return updated;
}

export async function deleteActivity(id: string): Promise<boolean> {
  const db = await getDB();
  await db.delete("activities", id);
  return true;
}

// ============================================
// SESSIONS CRUD
// ============================================

export async function getSessions(): Promise<TimeSession[]> {
  const db = await getDB();
  return db.getAll("sessions");
}

export async function getSessionsByDate(date: string): Promise<TimeSession[]> {
  const db = await getDB();
  const allSessions = await db.getAll("sessions");
  return allSessions.filter((s) => getDateKey(s.startTime) === date);
}

export async function getSessionsByActivity(
  activityId: string
): Promise<TimeSession[]> {
  const db = await getDB();
  return db.getAllFromIndex("sessions", "by-activity", activityId);
}

export async function getSession(id: string): Promise<TimeSession | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function createSession(
  data: Omit<TimeSession, "id" | "createdAt" | "updatedAt">
): Promise<TimeSession> {
  const db = await getDB();
  const now = Date.now();
  const session: TimeSession = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.put("sessions", session);
  return session;
}

export async function updateSession(
  id: string,
  data: Partial<Omit<TimeSession, "id" | "createdAt">>
): Promise<TimeSession | null> {
  const db = await getDB();
  const existing = await db.get("sessions", id);
  if (!existing) return null;

  const updated: TimeSession = {
    ...existing,
    ...data,
    updatedAt: Date.now(),
  };
  await db.put("sessions", updated);
  return updated;
}

export async function deleteSession(id: string): Promise<boolean> {
  const db = await getDB();
  await db.delete("sessions", id);
  return true;
}

export async function getPendingSessions(): Promise<TimeSession[]> {
  const db = await getDB();
  return db.getAllFromIndex("sessions", "by-sync-status", "pending");
}

// ============================================
// TIMER STATE (Singleton)
// ============================================

const TIMER_STATE_KEY = "current";

export async function getTimerState(): Promise<TimerState> {
  const db = await getDB();
  const state = await db.get("timerState", TIMER_STATE_KEY);
  return (
    state || {
      isRunning: false,
      currentSessionId: null,
      currentActivityId: null,
      startTime: null,
    }
  );
}

export async function setTimerState(state: TimerState): Promise<void> {
  const db = await getDB();
  await db.put("timerState", { ...state, id: TIMER_STATE_KEY } as TimerState & {
    id: string;
  });
}

// ============================================
// INITIALIZATION
// ============================================

export async function initializeDB(): Promise<void> {
  const activities = await getActivities();
  if (activities.length === 0) {
    // Seed with default activities
    for (const activity of DEFAULT_ACTIVITIES) {
      await createActivity(activity);
    }
  }
}

// ============================================
// AGGREGATIONS
// ============================================

export async function getDailySummary(date: string) {
  const sessions = await getSessionsByDate(date);
  const completedSessions = sessions.filter((s) => s.endTime !== null);

  const activityMap = new Map<
    string,
    { totalSeconds: number; sessionCount: number }
  >();

  let totalSeconds = 0;

  for (const session of completedSessions) {
    const duration = session.duration || 0;
    totalSeconds += duration;

    const existing = activityMap.get(session.activityId) || {
      totalSeconds: 0,
      sessionCount: 0,
    };
    activityMap.set(session.activityId, {
      totalSeconds: existing.totalSeconds + duration,
      sessionCount: existing.sessionCount + 1,
    });
  }

  return {
    date,
    totalSeconds,
    activities: Array.from(activityMap.entries()).map(([activityId, data]) => ({
      activityId,
      ...data,
    })),
  };
}
