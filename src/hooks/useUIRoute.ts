import { useState } from 'react';

export const useUIRoute = () => {
    const [activeScreen, setActiveScreen] = useState<'home' | 'add' | 'manage' | 'settings'>('home');
    const [alertDialog, setAlertDialog] = useState<any>(null);
    const [promptDialog, setPromptDialog] = useState<any>(null);

    return { 
        activeScreen, setActiveScreen, 
        alertDialog, setAlertDialog,
        promptDialog, setPromptDialog 
    };
};
