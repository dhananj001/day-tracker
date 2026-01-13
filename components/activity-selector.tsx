"use client";

// ============================================
// ACTIVITY SELECTOR - Grid of activity buttons
// ============================================

import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Activity } from "@/lib/types";
import { ActivityIcon } from "@/components/activity-icon";
import { cn } from "@/lib/utils";

interface ActivitySelectorProps {
    activities: Activity[];
    selectedActivityId: string | null;
    isTimerRunning: boolean;
    onSelectActivity: (activity: Activity) => void;
    onAddActivity: () => void;
    disabled?: boolean;
}

export function ActivitySelector({
    activities,
    selectedActivityId,
    isTimerRunning,
    onSelectActivity,
    onAddActivity,
    disabled = false,
}: ActivitySelectorProps) {
    return (
        <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Activities</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-muted-foreground"
                    onClick={onAddActivity}
                    disabled={disabled}
                >
                    <Plus className="h-4 w-4" />
                    Add
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {activities.map((activity, index) => {
                    const isSelected = selectedActivityId === activity.id;
                    const isActive = isTimerRunning && isSelected;

                    return (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <button
                                onClick={() => !disabled && onSelectActivity(activity)}
                                disabled={disabled}
                                className={cn(
                                    "flex w-full flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                                    disabled
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:scale-105 active:scale-95",
                                    isActive
                                        ? "border-current bg-card shadow-lg"
                                        : "border-transparent bg-muted/50 hover:bg-muted"
                                )}
                                style={isActive ? { borderColor: activity.color } : undefined}
                            >
                                <div
                                    className={cn(
                                        "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                                        isActive ? "text-white" : "bg-muted"
                                    )}
                                    style={
                                        isActive
                                            ? { backgroundColor: activity.color }
                                            : { color: activity.color }
                                    }
                                >
                                    {isActive ? (
                                        <Check className="h-5 w-5" />
                                    ) : (
                                        <ActivityIcon name={activity.icon} className="h-5 w-5" />
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "text-xs font-medium",
                                        isActive ? "text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {activity.name}
                                </span>
                            </button>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
