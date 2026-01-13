"use client";

// ============================================
// ADD ACTIVITY DIALOG
// ============================================

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActivityIcon, AVAILABLE_ICONS } from "@/components/activity-icon";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
    "#3B82F6", // Blue
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#EF4444", // Red
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#06B6D4", // Cyan
    "#6366F1", // Indigo
    "#84CC16", // Lime
    "#6B7280", // Gray
];

interface AddActivityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (data: { name: string; color: string; icon: string }) => void;
}

export function AddActivityDialog({
    open,
    onOpenChange,
    onAdd,
}: AddActivityDialogProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [icon, setIcon] = useState(AVAILABLE_ICONS[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        onAdd({ name: name.trim(), color, icon });
        setName("");
        setColor(PRESET_COLORS[0]);
        setIcon(AVAILABLE_ICONS[0]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Activity</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Activity name..."
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            autoFocus
                        />
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "h-8 w-8 rounded-full transition-transform hover:scale-110",
                                        color === c && "ring-2 ring-offset-2 ring-foreground"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Icon Picker */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Icon</label>
                        <div className="grid grid-cols-8 gap-2">
                            {AVAILABLE_ICONS.map((iconName) => (
                                <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => setIcon(iconName)}
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                                        icon === iconName
                                            ? "border-foreground bg-foreground text-background"
                                            : "border-border hover:bg-muted"
                                    )}
                                >
                                    <ActivityIcon name={iconName} className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: color }}
                        >
                            <ActivityIcon name={icon} className="h-5 w-5" />
                        </div>
                        <span className="font-medium">{name || "Activity name"}</span>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name.trim()}>
                            Add Activity
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
