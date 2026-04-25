import { useState } from 'react';

export const useUIRoute = () => {
    const [activeScreen, setActiveScreen] = useState<'home' | 'add' | 'manage' | 'settings'>('home');
    const [confirmDialog, setConfirmDialog] = useState<any>(null);
    const [alertDialog, setAlertDialog] = useState<any>(null);
    const [promptDialog, setPromptDialog] = useState<any>(null);

    return { 
        activeScreen, setActiveScreen, 
        confirmDialog, setConfirmDialog,
        alertDialog, setAlertDialog,
        promptDialog, setPromptDialog 
    };
};
