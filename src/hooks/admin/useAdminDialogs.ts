import { useGalleryStore } from '@/store';

export const useAdminDialogs = () => {
  const alertDialog = useGalleryStore(state => state.alertDialog);
  const setAlertDialog = useGalleryStore(state => state.setAlertDialog);
  const promptDialog = useGalleryStore(state => state.promptDialog);
  const setPromptDialog = useGalleryStore(state => state.setPromptDialog);

  return {
    alertDialog,
    setAlertDialog,
    promptDialog,
    setPromptDialog,
    promptValue: '', // Add stub or implement if needed
    setPromptValue: () => {}
  };
};
