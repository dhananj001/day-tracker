"use client";

// ============================================
// LOGIN PAGE - Email/Password Authentication
// ============================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, Mail, Lock, User, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

type Mode = "login" | "register";

export default function LoginPage() {
    const router = useRouter();
    const { login, register, isLoading: authLoading } = useAuth();

    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            if (mode === "login") {
                await login(email, password);
            } else {
                await register(email, password, name);
            }
            router.push("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleMode = () => {
        setMode(mode === "login" ? "register" : "login");
        setError("");
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                {/* Logo */}
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                        <Clock className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold">Day Tracker</h1>
                    <p className="text-sm text-muted-foreground">Track your time, own your day</p>
                </div>

                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-center text-lg">
                            {mode === "login" ? "Welcome back" : "Create account"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === "register" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your name"
                                            required
                                            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                        className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting || authLoading}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {mode === "login" ? "Signing in..." : "Creating account..."}
                                    </>
                                ) : mode === "login" ? (
                                    "Sign in"
                                ) : (
                                    "Create account"
                                )}
                            </Button>
                        </form>

                        <div className="mt-4 text-center text-sm">
                            <span className="text-muted-foreground">
                                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                            </span>
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="font-medium text-primary hover:underline"
                            >
                                {mode === "login" ? "Sign up" : "Sign in"}
                            </button>
                        </div>
                    </CardContent>
                </Card>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                    Your data is stored locally and synced securely.
                </p>
            </motion.div>
        </div>
    );
}
