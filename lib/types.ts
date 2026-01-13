// ============================================
// CORE TYPES - Single source of truth
// ============================================

export interface Activity {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
}

export interface TimeSession {
  id: string;
  activityId: string;
  startTime: number; // Unix timestamp
  endTime: number | null; // null = running
  duration: number | null; // in seconds, calculated on stop
  syncStatus: "pending" | "synced";
  createdAt: number;
  updatedAt: number;
}

export interface TimerState {
  isRunning: boolean;
  currentSessionId: string | null;
  currentActivityId: string | null;
  startTime: number | null;
}

export interface GlobalTimerState {
  id: string; // Will be userId for singleton per user
  userId: string;
  deviceId: string; // Unique device identifier
  deviceName: string; // Human-readable device name
  isRunning: boolean;
  currentSessionId: string | null;
  currentActivityId: string | null;
  startTime: number | null;
  lastActivity: number; // Timestamp of last activity
  createdAt: number;
  updatedAt: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  userAgent: string;
  lastSeen: number;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  activities: {
    activityId: string;
    totalSeconds: number;
    sessionCount: number;
  }[];
}

// Default activities to seed the app
export const DEFAULT_ACTIVITIES: Omit<
  Activity,
  "id" | "createdAt" | "updatedAt"
>[] = [
  { name: "Work", color: "#3B82F6", icon: "Briefcase" },
  { name: "Coding", color: "#8B5CF6", icon: "Code" },
  { name: "Reading", color: "#10B981", icon: "BookOpen" },
  { name: "Exercise", color: "#F59E0B", icon: "Dumbbell" },
  { name: "Scrolling", color: "#EF4444", icon: "Smartphone" },
  { name: "Rest", color: "#6B7280", icon: "Coffee" },
];
