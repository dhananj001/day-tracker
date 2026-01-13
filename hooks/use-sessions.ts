"use client";

// ============================================
// SESSIONS HOOK - Session history management
// ============================================

import { useState, useEffect, useCallback } from "react";
import {
  getSessions,
  getSessionsByDate,
  deleteSession,
  getDailySummary,
  getDateKey,
} from "@/lib/db";
import { TimeSession, DailySummary } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";

export function useSessions() {
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load all sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      // Sort by start time descending (newest first)
      data.sort((a, b) => b.startTime - a.startTime);
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadSessions();
    } else {
      setSessions([]);
      setIsLoading(false);
    }
  }, [loadSessions, user]);

  // Get sessions for a specific date
  const getSessionsForDate = useCallback(async (date: string) => {
    const data = await getSessionsByDate(date);
    data.sort((a, b) => a.startTime - b.startTime);
    return data;
  }, []);

  // Get summary for a specific date
  const getSummaryForDate = useCallback(
    async (date: string): Promise<DailySummary> => {
      return getDailySummary(date);
    },
    []
  );

  // Get today's sessions
  const getTodaySessions = useCallback(async () => {
    const today = getDateKey(Date.now());
    return getSessionsForDate(today);
  }, [getSessionsForDate]);

  // Get today's summary
  const getTodaySummary = useCallback(async () => {
    const today = getDateKey(Date.now());
    return getSummaryForDate(today);
  }, [getSummaryForDate]);

  // Remove session
  const removeSession = useCallback(async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    sessions,
    isLoading,
    getSessionsForDate,
    getSummaryForDate,
    getTodaySessions,
    getTodaySummary,
    removeSession,
    refresh: loadSessions,
  };
}
