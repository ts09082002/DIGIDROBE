import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    /** Call after updateProfile() to refresh the user object in context */
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    /**
     * Force-reload the current user from Firebase and update state.
     * Call this after updateProfile() so displayName / photoURL changes
     * are reflected immediately across the app.
     */
    const refreshUser = useCallback(async () => {
        const current = auth.currentUser;
        if (current) {
            await current.reload();
            // Create a fresh reference so React detects the change
            setUser({ ...current } as User);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
