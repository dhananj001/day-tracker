"use client";

// ============================================
// TIMER HOOK - Core timer logic
// ============================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTimerState,
  setTimerState,
  createSession,
  updateSession,
  getSession,
} from "@/lib/db";
import { TimerState } from "@/lib/types";

export function useTimer() {
  const [timerState, setTimerStateLocal] = useState<TimerState>({
    isRunning: false,
    currentSessionId: null,
    currentActivityId: null,
    startTime: null,
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load timer state from IndexedDB on mount
  useEffect(() => {
    async function loadState() {
      try {
        const state = await getTimerState();
        setTimerStateLocal(state);

        // If timer was running, calculate elapsed time
        if (state.isRunning && state.startTime) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          setElapsedSeconds(elapsed);
        }
      } catch (error) {
        console.error("Failed to load timer state:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadState();
  }, []);

  // Tick every second when running
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerState.startTime!) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.startTime]);

  // Start timer for an activity
  const startTimer = useCallback(async (activityId: string) => {
    const now = Date.now();

    // Create a new session
    const session = await createSession({
      activityId,
      startTime: now,
      endTime: null,
      duration: null,
      syncStatus: "pending",
    });

    const newState: TimerState = {
      isRunning: true,
      currentSessionId: session.id,
      currentActivityId: activityId,
      startTime: now,
    };

    await setTimerState(newState);
    setTimerStateLocal(newState);
    setElapsedSeconds(0);

    return session;
  }, []);

  // Stop the current timer
  const stopTimer = useCallback(async () => {
    if (!timerState.currentSessionId || !timerState.startTime) {
      return null;
    }

    const now = Date.now();
    const duration = Math.floor((now - timerState.startTime) / 1000);

    // Update the session with end time and duration
    const session = await updateSession(timerState.currentSessionId, {
      endTime: now,
      duration,
    });

    const newState: TimerState = {
      isRunning: false,
      currentSessionId: null,
      currentActivityId: null,
      startTime: null,
    };

    await setTimerState(newState);
    setTimerStateLocal(newState);
    setElapsedSeconds(0);

    return session;
  }, [timerState.currentSessionId, timerState.startTime]);

  // Switch to a different activity (stops current, starts new)
  const switchActivity = useCallback(
    async (activityId: string) => {
      if (timerState.isRunning) {
        await stopTimer();
      }
      return startTimer(activityId);
    },
    [timerState.isRunning, stopTimer, startTimer]
  );

  // Get current session details
  const getCurrentSession = useCallback(async () => {
    if (!timerState.currentSessionId) return null;
    return getSession(timerState.currentSessionId);
  }, [timerState.currentSessionId]);

  return {
    timerState,
    elapsedSeconds,
    isLoading,
    startTimer,
    stopTimer,
    switchActivity,
    getCurrentSession,
  };
}
