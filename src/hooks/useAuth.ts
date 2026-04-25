import { useState, useEffect } from 'react';
import { onAuthChange, loginWithGoogle, logout } from '../services/supabaseService';

export const useAuth = () => {
    const [user, setUser] = useState<any>(null);
    const [authChecked, setAuthChecked] = useState(false);
    
    useEffect(() => {
        const unsubscribe = onAuthChange((u) => {
            setUser(u);
            setAuthChecked(true);
        });
        
        // Safety fallback in case Supabase anon key is misconfigured
        const timer = setTimeout(() => setAuthChecked(true), 2500);
        
        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    return { user, authChecked, loginWithGoogle, logout };
};
