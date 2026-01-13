"use client";

// ============================================
// MAIN PAGE - Timer + Activity Selection
// ============================================

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { History, Settings } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TimerDisplay, TimerBadge } from "@/components/timer-display";
import { ActivitySelector } from "@/components/activity-selector";
import { DailySummary } from "@/components/daily-summary";
import { Timeline } from "@/components/timeline";
import { AddActivityDialog } from "@/components/add-activity-dialog";

import { useTimer } from "@/hooks/use-timer";
import { useActivities } from "@/hooks/use-activities";
import { useSessions } from "@/hooks/use-sessions";
import { Activity, DailySummary as DailySummaryType, TimeSession } from "@/lib/types";

export default function HomePage() {
  const {
    timerState,
    elapsedSeconds,
    isLoading: timerLoading,
    startTimer,
    stopTimer,
  } = useTimer();

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
          <h1 className="text-lg font-semibold">Day Tracker</h1>
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
            {/* Timer Display */}
            <section className="flex justify-center py-4">
              <TimerDisplay
                isRunning={timerState.isRunning}
                elapsedSeconds={elapsedSeconds}
                activityName={currentActivity?.name}
                activityColor={currentActivity?.color}
                onStop={handleStopTimer}
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
