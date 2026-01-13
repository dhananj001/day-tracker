"use client";

// ============================================
// HISTORY PAGE - Past sessions and summaries
// ============================================

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DailySummary } from "@/components/daily-summary";
import { Timeline } from "@/components/timeline";

import { useActivities } from "@/hooks/use-activities";
import { useSessions } from "@/hooks/use-sessions";
import { DailySummary as DailySummaryType, TimeSession } from "@/lib/types";
import { getDateKey } from "@/lib/db";

function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = getDateKey(today.getTime());
    const yesterdayStr = getDateKey(yesterday.getTime());

    if (dateStr === todayStr) return "Today";
    if (dateStr === yesterdayStr) return "Yesterday";

    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
}

export default function HistoryPage() {
    const [selectedDate, setSelectedDate] = useState(() => getDateKey(Date.now()));
    const [summary, setSummary] = useState<DailySummaryType | null>(null);
    const [sessions, setSessions] = useState<TimeSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { activities, isLoading: activitiesLoading } = useActivities();
    const { getSummaryForDate, getSessionsForDate } = useSessions();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [summaryData, sessionsData] = await Promise.all([
                getSummaryForDate(selectedDate),
                getSessionsForDate(selectedDate),
            ]);
            setSummary(summaryData);
            setSessions(sessionsData);
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, getSummaryForDate, getSessionsForDate]);

    useEffect(() => {
        if (!activitiesLoading) {
            loadData();
        }
    }, [activitiesLoading, loadData]);

    const goToPreviousDay = () => {
        const date = new Date(selectedDate + "T00:00:00");
        date.setDate(date.getDate() - 1);
        setSelectedDate(getDateKey(date.getTime()));
    };

    const goToNextDay = () => {
        const date = new Date(selectedDate + "T00:00:00");
        date.setDate(date.getDate() + 1);
        const tomorrow = getDateKey(date.getTime());
        const today = getDateKey(Date.now());
        if (tomorrow <= today) {
            setSelectedDate(tomorrow);
        }
    };

    const isToday = selectedDate === getDateKey(Date.now());

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-2xl items-center gap-4 px-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Back</span>
                        </Button>
                    </Link>
                    <h1 className="text-lg font-semibold">History</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-2xl px-4 py-6">
                {/* Date Navigation */}
                <Card className="mb-6">
                    <CardContent className="flex items-center justify-between py-4">
                        <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="font-medium">{formatDate(selectedDate)}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNextDay}
                            disabled={isToday}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </CardContent>
                </Card>

                {activitiesLoading || isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <motion.div
                            className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                ) : (
                    <motion.div
                        className="space-y-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={selectedDate}
                    >
                        {/* Summary */}
                        <DailySummary
                            summary={summary}
                            activities={activities}
                            isLoading={false}
                        />

                        {/* Timeline */}
                        <Timeline
                            sessions={sessions}
                            activities={activities}
                            isLoading={false}
                        />
                    </motion.div>
                )}
            </main>
        </div>
    );
}
