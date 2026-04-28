
import { useState, useCallback } from 'react';

export const useAdminDialogs = () => {
    const [confirmDialog, setConfirmDialog] = useState<any>(null);
    const [alertDialog, setAlertDialog] = useState<any>(null);
    const [promptDialog, setPromptDialog] = useState<any>(null);
    const [promptValue, setPromptValue] = useState('');

    const wrappedSetPromptDialog = useCallback((dialog: any) => {
        if (dialog === null) {
            setPromptValue('');
        }
        setPromptDialog(dialog);
    }, []);

    return {
        confirmDialog, setConfirmDialog,
        alertDialog, setAlertDialog,
        promptDialog, setPromptDialog: wrappedSetPromptDialog,
        promptValue, setPromptValue,
    };
};
