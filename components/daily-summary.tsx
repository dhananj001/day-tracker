"use client";

// ============================================
// DAILY SUMMARY - Today's time breakdown
// ============================================

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, DailySummary as DailySummaryType } from "@/lib/types";
import { ActivityIcon } from "@/components/activity-icon";

interface DailySummaryProps {
    summary: DailySummaryType | null;
    activities: Activity[];
    isLoading?: boolean;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function formatTotalTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes} minutes`;
    }
    return "0 minutes";
}

export function DailySummary({
    summary,
    activities,
    isLoading,
}: DailySummaryProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4" />
                        Today
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-20 items-center justify-center text-muted-foreground">
                        Loading...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!summary || summary.totalSeconds === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4" />
                        Today
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-20 items-center justify-center text-muted-foreground">
                        No tracked time yet
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getActivity = (id: string) => activities.find((a) => a.id === id);

    // Sort by total time descending
    const sortedActivities = [...summary.activities].sort(
        (a, b) => b.totalSeconds - a.totalSeconds
    );

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4" />
                        Today
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                        {formatTotalTime(summary.totalSeconds)} tracked
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {sortedActivities.map((item, index) => {
                    const activity = getActivity(item.activityId);
                    if (!activity) return null;

                    const percentage = Math.round(
                        (item.totalSeconds / summary.totalSeconds) * 100
                    );

                    return (
                        <motion.div
                            key={item.activityId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="space-y-1.5"
                        >
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="flex h-6 w-6 items-center justify-center rounded-full"
                                        style={{ backgroundColor: activity.color + "20", color: activity.color }}
                                    >
                                        <ActivityIcon name={activity.icon} className="h-3 w-3" />
                                    </div>
                                    <span className="font-medium">{activity.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <span>{formatDuration(item.totalSeconds)}</span>
                                    <span className="text-xs">({percentage}%)</span>
                                </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: activity.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
