import { useState, useEffect } from 'react';
import { onAuthChange, loginWithGoogle, logout } from '../services/supabaseService';

export const useAuth = () => {
    const [user, setUser] = useState<any>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    
    useEffect(() => {
        console.log("useAuth: Initializing auth listener...");
        const unsubscribe = onAuthChange((u) => {
            console.log("useAuth: State changed. User:", u?.email || 'null');
            setUser(u);
            setAuthChecked(true);
        });
        
        // Safety fallback: if no event within 5s, assume checked
        const timer = setTimeout(() => {
            if (!authChecked) {
                console.log("useAuth: Auth check timeout reached.");
                setAuthChecked(true);
            }
        }, 5000);
        
        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    return { user, authChecked, authError, loginWithGoogle, logout };
};
