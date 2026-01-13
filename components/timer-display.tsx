"use client";

// ============================================
// TIMER DISPLAY - Big timer with start/stop
// ============================================

import { motion } from "framer-motion";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
    isRunning: boolean;
    elapsedSeconds: number;
    activityName?: string;
    activityColor?: string;
    onStop: () => void;
    disabled?: boolean;
}

function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
}

export function TimerDisplay({
    isRunning,
    elapsedSeconds,
    activityName,
    activityColor,
    onStop,
    disabled,
}: TimerDisplayProps) {
    return (
        <div className="flex flex-col items-center gap-6">
            {/* Timer Display */}
            <motion.div
                className="relative"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Pulsing ring when running */}
                {isRunning && (
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: activityColor || "#3B82F6" }}
                        initial={{ scale: 1, opacity: 0.3 }}
                        animate={{ scale: 1.1, opacity: 0 }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut",
                        }}
                    />
                )}

                <div
                    className={cn(
                        "flex h-48 w-48 flex-col items-center justify-center rounded-full border-4 transition-colors sm:h-56 sm:w-56",
                        isRunning
                            ? "border-current bg-card"
                            : "border-muted-foreground/20 bg-card"
                    )}
                    style={isRunning ? { borderColor: activityColor } : undefined}
                >
                    <span className="text-4xl font-bold tabular-nums sm:text-5xl">
                        {formatTime(elapsedSeconds)}
                    </span>
                    {isRunning && activityName && (
                        <span
                            className="mt-2 text-sm font-medium"
                            style={{ color: activityColor }}
                        >
                            {activityName}
                        </span>
                    )}
                    {!isRunning && (
                        <span className="mt-2 text-sm text-muted-foreground">
                            Select an activity
                        </span>
                    )}
                </div>
            </motion.div>

            {/* Stop Button (only visible when running) */}
            {isRunning && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                >
                    <Button
                        size="lg"
                        variant="destructive"
                        className="h-14 w-14 rounded-full p-0"
                        onClick={onStop}
                        disabled={disabled}
                    >
                        <Square className="h-6 w-6 fill-current" />
                        <span className="sr-only">Stop timer</span>
                    </Button>
                </motion.div>
            )}
        </div>
    );
}

// Compact timer for header/status bar
export function TimerBadge({
    isRunning,
    elapsedSeconds,
    activityName,
    activityColor,
}: {
    isRunning: boolean;
    elapsedSeconds: number;
    activityName?: string;
    activityColor?: string;
}) {
    if (!isRunning) return null;

    return (
        <motion.div
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: activityColor || "#3B82F6" }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
        >
            <motion.div
                className="h-2 w-2 rounded-full bg-white"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="tabular-nums">{formatTime(elapsedSeconds)}</span>
            {activityName && <span className="hidden sm:inline">• {activityName}</span>}
        </motion.div>
    );
}
