"use client";

// ============================================
// GLOBAL TIMER HOOK - Cross-device timer coordination
// ============================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTimerState as getLocalTimerState,
  setTimerState as setLocalTimerState,
  createSession,
  updateSession,
  getSession,
} from "@/lib/db";
import {
  getGlobalTimerState,
  createOrUpdateGlobalTimerState,
  clearGlobalTimerState,
  transferTimerToDevice,
} from "@/lib/appwrite-db";
import { useAuth } from "@/contexts/auth-context";
import { useSync } from "@/hooks/use-sync";
import {
  getDeviceId,
  getDeviceName,
  registerCurrentDevice,
  updateDeviceActivity,
} from "@/lib/device";
import { TimerState, GlobalTimerState } from "@/lib/types";

interface GlobalTimerHookState {
  // Local timer state (for UI responsiveness)
  localTimer: TimerState;
  // Global timer state (from remote)
  globalTimer: GlobalTimerState | null;
  // Device coordination
  currentDeviceId: string;
  currentDeviceName: string;
  // Status
  isLoading: boolean;
  conflictDetected: boolean;
  conflictMessage: string;
  canTakeOver: boolean;
  // Real-time elapsed seconds
  elapsedSeconds: number;
}

export function useGlobalTimer() {
  const { user, isAuthenticated } = useAuth();
  const { isOnline } = useSync();

  const [state, setState] = useState<GlobalTimerHookState>({
    localTimer: {
      isRunning: false,
      currentSessionId: null,
      currentActivityId: null,
      startTime: null,
    },
    globalTimer: null,
    currentDeviceId: "",
    currentDeviceName: "",
    isLoading: true,
    conflictDetected: false,
    conflictMessage: "",
    canTakeOver: false,
    elapsedSeconds: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceRegisteredRef = useRef(false);

  // Initialize device and load states
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initialize = async () => {
      try {
        // Register device if not already done
        if (!deviceRegisteredRef.current) {
          await registerCurrentDevice(user.$id);
          deviceRegisteredRef.current = true;
        }

        // Get device info
        const deviceId = getDeviceId();
        const deviceName = getDeviceName();

        // Load local timer state
        const localTimer = await getLocalTimerState();

        // Load global timer state
        const globalTimerData = await getGlobalTimerState(user.$id);
        let globalTimer: GlobalTimerState | null = null;

        if (globalTimerData) {
          globalTimer = {
            id: globalTimerData.$id,
            userId: globalTimerData.userId,
            deviceId: globalTimerData.deviceId,
            deviceName: globalTimerData.deviceName,
            isRunning: globalTimerData.isRunning,
            currentSessionId: globalTimerData.currentSessionId,
            currentActivityId: globalTimerData.currentActivityId,
            startTime: globalTimerData.startTime
              ? new Date(globalTimerData.startTime).getTime()
              : null,
            lastActivity: new Date(globalTimerData.lastActivity).getTime(),
            createdAt: new Date(globalTimerData.$createdAt).getTime(),
            updatedAt: new Date(globalTimerData.$updatedAt).getTime(),
          };
        }

        // Check for conflicts
        const conflictDetected =
          globalTimer?.isRunning && globalTimer.deviceId !== deviceId;
        const canTakeOver = conflictDetected;

        setState((prev) => ({
          ...prev,
          localTimer,
          globalTimer,
          currentDeviceId: deviceId,
          currentDeviceName: deviceName,
          isLoading: false,
          conflictDetected: conflictDetected || false,
          canTakeOver: canTakeOver || false,
          conflictMessage: conflictDetected
            ? `Timer is running on ${
                globalTimer?.deviceName || "another device"
              }`
            : "",
        }));
      } catch (error) {
        console.error("Failed to initialize global timer:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initialize();
  }, [isAuthenticated, user]);

  // Update device activity periodically
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const updateActivity = () => {
      updateDeviceActivity(user.$id);
    };

    // Update immediately and then every 5 minutes
    updateActivity();
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  // Timer tick (for elapsed time display)
  useEffect(() => {
    if (state.localTimer.isRunning && state.localTimer.startTime) {
      intervalRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsedSeconds: Math.floor(
            (Date.now() - prev.localTimer.startTime!) / 1000
          ),
        }));
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
  }, [state.localTimer.isRunning, state.localTimer.startTime]);

  // Start timer with global coordination
  const startTimer = useCallback(
    async (activityId: string) => {
      if (!isAuthenticated || !user || !isOnline) {
        throw new Error("Must be authenticated and online to start timer");
      }

      // Check if another device has a running timer
      if (
        state.globalTimer?.isRunning &&
        state.globalTimer.deviceId !== state.currentDeviceId
      ) {
        throw new Error(
          `Timer is already running on ${state.globalTimer.deviceName}`
        );
      }

      const now = Date.now();

      // Create session locally
      const session = await createSession({
        activityId,
        startTime: now,
        endTime: null,
        duration: null,
        syncStatus: "pending",
      });

      const newTimerState: TimerState = {
        isRunning: true,
        currentSessionId: session.id,
        currentActivityId: activityId,
        startTime: now,
      };

      // Update local state
      await setLocalTimerState(newTimerState);

      // Update global state
      await createOrUpdateGlobalTimerState(
        user.$id,
        state.currentDeviceId,
        state.currentDeviceName,
        newTimerState
      );

      setState((prev) => ({
        ...prev,
        localTimer: newTimerState,
        globalTimer: {
          id: prev.globalTimer?.id || "",
          userId: user.$id,
          deviceId: state.currentDeviceId,
          deviceName: state.currentDeviceName,
          isRunning: true,
          currentSessionId: session.id,
          currentActivityId: activityId,
          startTime: now,
          lastActivity: now,
          createdAt: prev.globalTimer?.createdAt || now,
          updatedAt: now,
        },
        conflictDetected: false,
        conflictMessage: "",
        canTakeOver: false,
      }));

      return session;
    },
    [
      isAuthenticated,
      user,
      isOnline,
      state.globalTimer,
      state.currentDeviceId,
      state.currentDeviceName,
    ]
  );

  // Stop timer
  const stopTimer = useCallback(async () => {
    if (!state.localTimer.currentSessionId || !state.localTimer.startTime) {
      return null;
    }

    if (!isAuthenticated || !user) {
      throw new Error("Must be authenticated to stop timer");
    }

    const now = Date.now();
    const duration = Math.floor((now - state.localTimer.startTime) / 1000);

    // Update session locally
    const session = await updateSession(state.localTimer.currentSessionId, {
      endTime: now,
      duration,
    });

    const newTimerState: TimerState = {
      isRunning: false,
      currentSessionId: null,
      currentActivityId: null,
      startTime: null,
    };

    // Update local state
    await setLocalTimerState(newTimerState);

    // Clear global state
    await clearGlobalTimerState(user.$id);

    setState((prev) => ({
      ...prev,
      localTimer: newTimerState,
      globalTimer: null,
      conflictDetected: false,
      conflictMessage: "",
      canTakeOver: false,
      elapsedSeconds: 0,
    }));

    return session;
  }, [state.localTimer, isAuthenticated, user]);

  // Take over timer from another device
  const takeOverTimer = useCallback(async () => {
    if (!isAuthenticated || !user || !state.globalTimer) {
      return;
    }

    // Transfer ownership to this device
    const updatedGlobal = await transferTimerToDevice(
      user.$id,
      state.currentDeviceId,
      state.currentDeviceName
    );

    if (updatedGlobal) {
      // Update local timer state to match global
      const localTimerState: TimerState = {
        isRunning: updatedGlobal.isRunning,
        currentSessionId: updatedGlobal.currentSessionId,
        currentActivityId: updatedGlobal.currentActivityId,
        startTime: updatedGlobal.startTime
          ? new Date(updatedGlobal.startTime).getTime()
          : null,
      };

      await setLocalTimerState(localTimerState);

      setState((prev) => ({
        ...prev,
        localTimer: localTimerState,
        globalTimer: {
          id: updatedGlobal.$id,
          userId: updatedGlobal.userId,
          deviceId: updatedGlobal.deviceId,
          deviceName: updatedGlobal.deviceName,
          isRunning: updatedGlobal.isRunning,
          currentSessionId: updatedGlobal.currentSessionId,
          currentActivityId: updatedGlobal.currentActivityId,
          startTime: updatedGlobal.startTime
            ? new Date(updatedGlobal.startTime).getTime()
            : null,
          lastActivity: new Date(updatedGlobal.lastActivity).getTime(),
          createdAt: new Date(updatedGlobal.$createdAt).getTime(),
          updatedAt: new Date(updatedGlobal.$updatedAt).getTime(),
        },
        conflictDetected: false,
        conflictMessage: "",
        canTakeOver: false,
      }));
    }
  }, [
    isAuthenticated,
    user,
    state.globalTimer,
    state.currentDeviceId,
    state.currentDeviceName,
  ]);

  // Switch activity (stops current, starts new)
  const switchActivity = useCallback(
    async (activityId: string) => {
      if (state.localTimer.isRunning) {
        await stopTimer();
      }
      return startTimer(activityId);
    },
    [state.localTimer.isRunning, stopTimer, startTimer]
  );

  // Get current session details
  const getCurrentSession = useCallback(async () => {
    if (!state.localTimer.currentSessionId) return null;
    return getSession(state.localTimer.currentSessionId);
  }, [state.localTimer.currentSessionId]);

  // Computed values
  const isTimerOwnedByThisDevice =
    state.globalTimer?.deviceId === state.currentDeviceId;

  return {
    // Timer state
    timerState: state.localTimer,
    elapsedSeconds: state.elapsedSeconds,
    isLoading: state.isLoading,

    // Global coordination
    globalTimer: state.globalTimer,
    conflictDetected: state.conflictDetected,
    conflictMessage: state.conflictMessage,
    canTakeOver: state.canTakeOver,
    isTimerOwnedByThisDevice,

    // Device info
    currentDeviceId: state.currentDeviceId,
    currentDeviceName: state.currentDeviceName,

    // Actions
    startTimer,
    stopTimer,
    switchActivity,
    takeOverTimer,
    getCurrentSession,
  };
}
