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
import { Models, OAuthProvider } from "appwrite";
import { getAccount } from "@/lib/appwrite";

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Refresh session (for manual refresh after login)
    const refresh = useCallback(async () => {
        setIsLoading(true);
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

    // Initial load - check for existing session
    useEffect(() => {
        // Use a flag to prevent state updates after unmount
        let isMounted = true;

        const checkAuth = async () => {
            // Check if this is an OAuth callback with userId and secret
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const userId = urlParams.get('userId');
                const secret = urlParams.get('secret');

                if (userId && secret) {
                    console.log('Auth: OAuth token callback detected, creating session...');
                    try {
                        const account = getAccount();
                        await account.createSession(userId, secret);
                        console.log('Auth: ✅ Session created from OAuth token!');
                        // Clean up URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                        const currentUser = await account.get();
                        console.log('Auth: ✅ User:', currentUser.email);
                        if (isMounted) {
                            setUser(currentUser);
                            setIsLoading(false);
                        }
                        return;
                    } catch (error) {
                        console.error('Auth: Failed to create session from token:', error);
                    }
                }
            }

            // Try to get existing session
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    const account = getAccount();
                    const currentUser = await account.get();
                    console.log('Auth: ✅ Session found! User:', currentUser.email);
                    if (isMounted) {
                        setUser(currentUser);
                        setIsLoading(false);
                    }
                    return;
                } catch {
                    console.log(`Auth: ❌ Attempt ${attempt}/5 failed`);
                    if (attempt < 5) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            console.log('Auth: No session found');
            if (isMounted) {
                setUser(null);
                setIsLoading(false);
            }
        };

        checkAuth();

        return () => {
            isMounted = false;
        };
    }, []);

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

    // Login with Google OAuth (using token-based flow to avoid cookie issues)
    const loginWithGoogle = useCallback(async () => {
        try {
            const account = getAccount();
            // Use createOAuth2Token which returns userId and secret in the redirect URL
            // This avoids third-party cookie issues that createOAuth2Session has
            account.createOAuth2Token(
                OAuthProvider.Google,
                window.location.origin + '/', // Success URL - will include userId & secret params
                window.location.origin + '/login', // Failure URL
                [] // Scopes (optional)
            );
            // Note: This redirects the browser, code after this won't execute
        } catch (error) {
            console.error('OAuth Error:', error);
            throw error;
        }
    }, []);

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
        loginWithGoogle,
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
