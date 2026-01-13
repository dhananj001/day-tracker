"use client";

// ============================================
// AUTH GUARD - Protect routes that require auth
// ============================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <motion.div
                    className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
