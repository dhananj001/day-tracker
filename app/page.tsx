"use client";

// ============================================
// MAIN PAGE - Timer + Activity Selection
// ============================================

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { History, Settings, Cloud, CloudOff, RefreshCw, LogOut } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TimerDisplay, TimerBadge } from "@/components/timer-display";
import { ActivitySelector } from "@/components/activity-selector";
import { DailySummary } from "@/components/daily-summary";
import { Timeline } from "@/components/timeline";
import { AddActivityDialog } from "@/components/add-activity-dialog";
import { AuthGuard } from "@/components/auth-guard";

import { useTimer } from "@/hooks/use-timer";
import { useActivities } from "@/hooks/use-activities";
import { useSessions } from "@/hooks/use-sessions";
import { useSync } from "@/hooks/use-sync";
import { useAuth } from "@/contexts/auth-context";
import { useGlobalTimer } from "@/hooks/use-global-timer";
import { Activity, DailySummary as DailySummaryType, TimeSession } from "@/lib/types";

function HomeContent() {
  const { logout } = useAuth();
  const { isSyncing, isOnline, sync } = useSync();

  const {
    timerState,
    elapsedSeconds,
    isLoading: timerLoading,
    startTimer,
    stopTimer,
    globalTimer,
    conflictDetected,
    conflictMessage,
    canTakeOver,
    takeOverTimer,
    isTimerOwnedByThisDevice,
    currentDeviceName,
  } = useGlobalTimer();

  const {
    activities,
    isLoading: activitiesLoading,
    addActivity,
    getActivityById,
  } = useActivities();

  const {
    getTodaySummary,
    getTodaySessions,
    refresh: refreshSessions,
  } = useSessions();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [todaySummary, setTodaySummary] = useState<DailySummaryType | null>(null);
  const [todaySessions, setTodaySessions] = useState<TimeSession[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Load today's data
  const loadTodayData = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const [summary, sessions] = await Promise.all([
        getTodaySummary(),
        getTodaySessions(),
      ]);
      setTodaySummary(summary);
      setTodaySessions(sessions);
    } catch (error) {
      console.error("Failed to load today's data:", error);
    } finally {
      setSummaryLoading(false);
    }
  }, [getTodaySummary, getTodaySessions]);

  useEffect(() => {
    if (!activitiesLoading) {
      loadTodayData();
    }
  }, [activitiesLoading, loadTodayData]);

  // Get current activity details
  const currentActivity = timerState.currentActivityId
    ? getActivityById(timerState.currentActivityId)
    : undefined;

  // Handle activity selection
  const handleSelectActivity = async (activity: Activity) => {
    if (timerState.isRunning && timerState.currentActivityId === activity.id) {
      // Clicking the same activity stops it
      await stopTimer();
    } else if (timerState.isRunning) {
      // Switch to different activity (stop current, start new)
      await stopTimer();
      await startTimer(activity.id);
    } else {
      // Start new timer
      await startTimer(activity.id);
    }
    // Refresh data after state change
    setTimeout(loadTodayData, 100);
  };

  // Handle stop timer
  const handleStopTimer = async () => {
    await stopTimer();
    // Refresh data after stopping
    setTimeout(loadTodayData, 100);
  };

  // Handle add activity
  const handleAddActivity = async (data: {
    name: string;
    color: string;
    icon: string;
  }) => {
    await addActivity(data);
  };

  const isLoading = timerLoading || activitiesLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Day Tracker</h1>
            {/* Sync Status Indicator */}
            <button
              onClick={() => sync()}
              disabled={isSyncing}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              title={isOnline ? "Synced" : "Offline"}
            >
              {isSyncing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : isOnline ? (
                <Cloud className="h-3 w-3 text-green-500" />
              ) : (
                <CloudOff className="h-3 w-3 text-amber-500" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <TimerBadge
              isRunning={timerState.isRunning}
              elapsedSeconds={elapsedSeconds}
              activityName={currentActivity?.name}
              activityColor={currentActivity?.color}
            />
            <Link href="/history">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <History className="h-5 w-5" />
                <span className="sr-only">History</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={logout}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <motion.div
              className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : (
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Device Conflict Banner */}
            {conflictDetected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                      <CloudOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Timer Running on Another Device
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {conflictMessage}
                      </p>
                    </div>
                  </div>
                  {canTakeOver && (
                    <Button
                      onClick={takeOverTimer}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Take Over
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Device Info Banner */}
            {globalTimer && !conflictDetected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <Cloud className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Timer active on {isTimerOwnedByThisDevice ? 'this device' : globalTimer.deviceName}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Timer Display */}
            <section className="flex justify-center py-4">
              <TimerDisplay
                isRunning={timerState.isRunning}
                elapsedSeconds={elapsedSeconds}
                activityName={currentActivity?.name}
                activityColor={currentActivity?.color}
                onStop={handleStopTimer}
                disabled={conflictDetected && !isTimerOwnedByThisDevice}
              />
            </section>

            {/* Activity Selector */}
            <section>
              <ActivitySelector
                activities={activities}
                selectedActivityId={timerState.currentActivityId}
                isTimerRunning={timerState.isRunning}
                onSelectActivity={handleSelectActivity}
                onAddActivity={() => setShowAddDialog(true)}
                disabled={conflictDetected}
              />
            </section>

            {/* Daily Summary */}
            <section>
              <DailySummary
                summary={todaySummary}
                activities={activities}
                isLoading={summaryLoading}
              />
            </section>

            {/* Timeline */}
            <section>
              <Timeline
                sessions={todaySessions}
                activities={activities}
                isLoading={summaryLoading}
              />
            </section>
          </motion.div>
        )}
      </main>

      {/* Add Activity Dialog */}
      <AddActivityDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddActivity}
      />
    </div>
  );
}

// Wrap with AuthGuard
export default function HomePage() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}