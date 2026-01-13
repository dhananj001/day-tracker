"use client";

// ============================================
// AUTH CONTEXT - User authentication state
// ============================================

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    ReactNode,
} from "react";
import { Models } from "appwrite";
import { getAccount } from "@/lib/appwrite";

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check current session
    const refresh = useCallback(async () => {
        try {
            const account = getAccount();
            const currentUser = await account.get();
            setUser(currentUser);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        refresh();
    }, [refresh]);

    // Login with email/password
    const login = useCallback(async (email: string, password: string) => {
        const account = getAccount();
        await account.createEmailPasswordSession(email, password);
        await refresh();
    }, [refresh]);

    // Register new user
    const register = useCallback(
        async (email: string, password: string, name: string) => {
            const account = getAccount();
            await account.create("unique()", email, password, name);
            await login(email, password);
        },
        [login]
    );

    // Logout
    const logout = useCallback(async () => {
        const account = getAccount();
        await account.deleteSession("current");
        setUser(null);
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refresh,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
