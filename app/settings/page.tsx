"use client";

// ============================================
// SETTINGS PAGE - Manage activities & sync
// ============================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Trash2,
    Edit2,
    Plus,
    RefreshCw,
    Cloud,
    CloudOff,
    Check,
    AlertTriangle,
    LogOut,
    User,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

import { useActivities } from "@/hooks/use-activities";
import { useSync } from "@/hooks/use-sync";
import { useAuth } from "@/contexts/auth-context";
import { useGlobalTimer } from "@/hooks/use-global-timer";
import { ActivityIcon, AVAILABLE_ICONS } from "@/components/activity-icon";
import { AddActivityDialog } from "@/components/add-activity-dialog";
import { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getSessions, getPendingSessions } from "@/lib/db";
import { getUserDevices, transferTimerToDevice } from "@/lib/appwrite-db";
import { AppwriteDevice } from "@/lib/appwrite-db";

const PRESET_COLORS = [
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#EF4444",
    "#F59E0B",
    "#10B981",
    "#06B6D4",
    "#6366F1",
    "#84CC16",
    "#6B7280",
];

export default function SettingsPage() {
    const { activities, isLoading, addActivity, editActivity, removeActivity } =
        useActivities();
    const { isOnline, isSyncing, lastSyncAt, lastResult, fullSync } = useSync();
    const { user, isAuthenticated, logout } = useAuth();
    const { globalTimer, currentDeviceId, currentDeviceName } = useGlobalTimer();

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [totalSessions, setTotalSessions] = useState(0);
    const [devices, setDevices] = useState<AppwriteDevice[]>([]);
    const [devicesLoading, setDevicesLoading] = useState(false);

    // Load pending session count
    useEffect(() => {
        const loadCounts = async () => {
            const pending = await getPendingSessions();
            const all = await getSessions();
            setPendingCount(pending.length);
            setTotalSessions(all.length);
        };
        loadCounts();
    }, [lastSyncAt]);

    // Load user devices
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const loadDevices = async () => {
            setDevicesLoading(true);
            try {
                const userDevices = await getUserDevices(user.$id);
                setDevices(userDevices);
            } catch (error) {
                console.error('Failed to load devices:', error);
            } finally {
                setDevicesLoading(false);
            }
        };

        loadDevices();
    }, [isAuthenticated, user]);

    const handleEditActivity = async (data: Partial<Activity>) => {
        if (!editingActivity) return;
        await editActivity(editingActivity.id, data);
        setEditingActivity(null);
    };

    const handleDeleteActivity = async () => {
        if (!deletingActivity) return;
        await removeActivity(deletingActivity.id);
        setDeletingActivity(null);
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = "/login";
    };

    const formatLastSync = (timestamp: number | null) => {
        if (!timestamp) return "Never";
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const formatLastSeen = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const handleTransferTimerToDevice = async (targetDeviceId: string) => {
        if (!user || !globalTimer) return;

        try {
            const targetDevice = devices.find(d => d.$id === targetDeviceId);
            if (!targetDevice) return;

            await transferTimerToDevice(user.$id, targetDevice.deviceId, targetDevice.deviceName);
            // Refresh devices list to show updated state
            const userDevices = await getUserDevices(user.$id);
            setDevices(userDevices);
        } catch (error) {
            console.error('Failed to transfer timer:', error);
            // Could add toast notification here
        }
    };

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
                    <h1 className="text-lg font-semibold">Settings</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-2xl px-4 py-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Activities</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setShowAddDialog(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Add
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {isLoading ? (
                            <div className="flex h-32 items-center justify-center text-muted-foreground">
                                Loading...
                            </div>
                        ) : activities.length === 0 ? (
                            <div className="flex h-32 items-center justify-center text-muted-foreground">
                                No activities yet
                            </div>
                        ) : (
                            activities.map((activity, index) => (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                                            style={{ backgroundColor: activity.color }}
                                        >
                                            <ActivityIcon name={activity.icon} className="h-5 w-5" />
                                        </div>
                                        <span className="font-medium">{activity.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setEditingActivity(activity)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setDeletingActivity(activity)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* App Info */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="text-base">About</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <p>Day Tracker v1.0.0</p>
                        <p className="mt-2">
                            Personal time tracking app with cloud sync.
                        </p>
                    </CardContent>
                </Card>

                {/* Sync & Account Section */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Cloud className="h-4 w-4" />
                            Sync & Account
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Account Info */}
                        {isAuthenticated && user ? (
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{user.name || "User"}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </Button>
                            </div>
                        ) : (
                            <Link href="/login">
                                <Button variant="outline" className="w-full">
                                    Sign in to enable sync
                                </Button>
                            </Link>
                        )}

                        {/* Sync Status */}
                        {isAuthenticated && (
                            <>
                                <div className="space-y-3">
                                    {/* Online Status */}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <span className={cn(
                                            "flex items-center gap-1.5 font-medium",
                                            isOnline ? "text-green-600" : "text-yellow-600"
                                        )}>
                                            {isOnline ? (
                                                <>
                                                    <Cloud className="h-4 w-4" />
                                                    Online
                                                </>
                                            ) : (
                                                <>
                                                    <CloudOff className="h-4 w-4" />
                                                    Offline
                                                </>
                                            )}
                                        </span>
                                    </div>

                                    {/* Last Sync */}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Last sync</span>
                                        <span className="font-medium">{formatLastSync(lastSyncAt)}</span>
                                    </div>

                                    {/* Pending Sessions */}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Pending uploads</span>
                                        <span className={cn(
                                            "font-medium",
                                            pendingCount > 0 ? "text-yellow-600" : "text-green-600"
                                        )}>
                                            {pendingCount === 0 ? (
                                                <span className="flex items-center gap-1">
                                                    <Check className="h-4 w-4" />
                                                    All synced
                                                </span>
                                            ) : (
                                                `${pendingCount} pending`
                                            )}
                                        </span>
                                    </div>

                                    {/* Total Sessions */}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Total sessions</span>
                                        <span className="font-medium">{totalSessions}</span>
                                    </div>
                                </div>

                                {/* Last Sync Result */}
                                {lastResult && (
                                    <div className="rounded-lg border p-3 text-sm">
                                        <p className="font-medium mb-2 flex items-center gap-2">
                                            {lastResult.success ? (
                                                <>
                                                    <Check className="h-4 w-4 text-green-600" />
                                                    Last sync successful
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                                    Sync completed with errors
                                                </>
                                            )}
                                        </p>
                                        <div className="space-y-1 text-muted-foreground">
                                            <p>Activities: +{lastResult.activities.pushed} pushed, +{lastResult.activities.pulled} pulled</p>
                                            <p>Sessions: {lastResult.sessions.synced} synced, {lastResult.sessionsPulled.pulled} pulled</p>
                                        </div>
                                    </div>
                                )}

                                {/* Manual Sync Button */}
                                <Button
                                    onClick={() => fullSync()}
                                    disabled={isSyncing || !isOnline}
                                    className="w-full"
                                >
                                    {isSyncing ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Syncing...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Sync Now
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Devices Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Connected Devices
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {devicesLoading ? (
                            <div className="flex h-16 items-center justify-center text-muted-foreground">
                                Loading devices...
                            </div>
                        ) : devices.length === 0 ? (
                            <div className="flex h-16 items-center justify-center text-muted-foreground">
                                No devices registered
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {devices.map((device) => (
                                    <div
                                        key={device.$id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {device.deviceName}
                                                    {device.deviceId === globalTimer?.deviceId && (
                                                        <span className="ml-2 inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                                            <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                                                            Active Timer
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Last seen: {formatLastSeen(new Date(device.lastSeen).getTime())}
                                                </p>
                                            </div>
                                        </div>
                                        {device.deviceId !== globalTimer?.deviceId && globalTimer?.isRunning && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTransferTimerToDevice(device.$id)}
                                                className="text-xs"
                                            >
                                                Take Over Timer
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <div className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded">
                                    <p className="font-medium mb-1">Multi-device Timer Sync</p>
                                    <p>Your timer state is synchronized across all devices. Only one device can run the timer at a time. Use "Take Over Timer" to transfer control to another device.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Add Activity Dialog */}
            <AddActivityDialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                onAdd={addActivity}
            />

            {/* Edit Activity Dialog */}
            <EditActivityDialog
                activity={editingActivity}
                open={!!editingActivity}
                onOpenChange={(open) => !open && setEditingActivity(null)}
                onSave={handleEditActivity}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={!!deletingActivity}
                onOpenChange={(open) => !open && setDeletingActivity(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Activity</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &ldquo;{deletingActivity?.name}&rdquo;? This
                            will not delete your tracked sessions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setDeletingActivity(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteActivity}>
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Edit Activity Dialog Component
function EditActivityDialog({
    activity,
    open,
    onOpenChange,
    onSave,
}: {
    activity: Activity | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: Partial<Activity>) => void;
}) {
    const [name, setName] = useState("");
    const [color, setColor] = useState("");
    const [icon, setIcon] = useState("");

    // Reset form when activity changes
    useState(() => {
        if (activity) {
            setName(activity.name);
            setColor(activity.color);
            setIcon(activity.icon);
        }
    });

    // Update state when activity changes
    if (activity && name !== activity.name && color !== activity.color) {
        setName(activity.name);
        setColor(activity.color);
        setIcon(activity.icon);
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name: name.trim(), color, icon });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Activity</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

                    {/* Submit */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name.trim()}>
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
