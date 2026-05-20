import { useState, useEffect } from 'react';
import { onAuthChange, loginWithGoogle, logout } from '../services/supabaseService';

import { User } from '../types';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    
    useEffect(() => {
        const unsubscribe = onAuthChange((u) => {
            setUser(u);
            setAuthChecked(true);
        });
        
        // Safety fallback: if no event within 5s, assume checked
        const timer = setTimeout(() => {
            if (!authChecked) {
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
