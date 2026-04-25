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
        return () => unsubscribe();
    }, []);

    return { user, authChecked, loginWithGoogle, logout };
};
