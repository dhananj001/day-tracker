"use client";

// ============================================
// ACTIVITIES HOOK - Activity management with sync
// ============================================

import { useState, useEffect, useCallback } from "react";
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  initializeDB,
} from "@/lib/db";
import { syncActivityToRemote } from "@/lib/sync";
import { Activity } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  // Load activities on mount
  const loadActivities = useCallback(async () => {
    try {
      await initializeDB(); // Ensure DB is initialized with defaults
      const data = await getActivities();
      setActivities(data);
    } catch (error) {
      console.error("Failed to load activities:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadActivities();
    } else {
      setActivities([]);
      setIsLoading(false);
    }
  }, [loadActivities, user]);

  // Add new activity (with remote sync if authenticated)
  const addActivity = useCallback(
    async (data: Omit<Activity, "id" | "createdAt" | "updatedAt">) => {
      const activity = await createActivity(data);
      setActivities((prev) => [...prev, activity]);

      // Sync to Appwrite if authenticated
      if (isAuthenticated && user) {
        syncActivityToRemote(user.$id, activity).catch(console.error);
      }

      return activity;
    },
    [isAuthenticated, user]
  );

  // Update existing activity
  const editActivity = useCallback(
    async (id: string, data: Partial<Omit<Activity, "id" | "createdAt">>) => {
      const updated = await updateActivity(id, data);
      if (updated) {
        setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)));
      }
      return updated;
    },
    []
  );

  // Remove activity
  const removeActivity = useCallback(async (id: string) => {
    await deleteActivity(id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Get activity by ID
  const getActivityById = useCallback(
    (id: string) => activities.find((a) => a.id === id),
    [activities]
  );

  return {
    activities,
    isLoading,
    addActivity,
    editActivity,
    removeActivity,
    getActivityById,
    refresh: loadActivities,
  };
}
