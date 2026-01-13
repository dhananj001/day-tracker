"use client";

// ============================================
// TIMELINE - Visual timeline of today's sessions
// ============================================

import { motion } from "framer-motion";
import { Activity, TimeSession } from "@/lib/types";
import { ActivityIcon } from "@/components/activity-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface TimelineProps {
    sessions: TimeSession[];
    activities: Activity[];
    isLoading?: boolean;
}

function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m`;
    }
    return `${seconds}s`;
}

export function Timeline({ sessions, activities, isLoading }: TimelineProps) {
    const getActivity = (id: string) => activities.find((a) => a.id === id);

    // Filter completed sessions and sort by start time
    const completedSessions = sessions
        .filter((s) => s.endTime !== null)
        .sort((a, b) => b.startTime - a.startTime);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4" />
                        Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-32 items-center justify-center text-muted-foreground">
                        Loading...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (completedSessions.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4" />
                        Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-32 items-center justify-center text-muted-foreground">
                        No sessions today
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4" />
                    Timeline
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative space-y-0">
                    {/* Vertical line */}
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />

                    {completedSessions.map((session, index) => {
                        const activity = getActivity(session.activityId);
                        if (!activity) return null;

                        return (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="relative flex gap-4 pb-4 last:pb-0"
                            >
                                {/* Timeline dot */}
                                <div
                                    className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                    style={{ backgroundColor: activity.color }}
                                >
                                    <ActivityIcon
                                        name={activity.icon}
                                        className="h-3 w-3 text-white"
                                    />
                                </div>

                                {/* Session details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium truncate">{activity.name}</span>
                                        <span className="text-sm text-muted-foreground shrink-0">
                                            {formatDuration(session.duration || 0)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatTime(session.startTime)} – {formatTime(session.endTime!)}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
