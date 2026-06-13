import { useUIStore } from '../../store/useUIStore';
import React from 'react';
import { StaffUnlockDialog } from '@/components/admin/StaffUnlockDialog';
import { WhatsAppChoiceDialog } from '@/components/shared/WhatsAppChoiceDialog';
import { AppSettings, TranslationType } from '../../types';

interface GalleryDialogsProps {
  showPassPrompt: boolean; passInput: string;
  setPassInput: (val: string) => void;
  passError: boolean;
  setPassError: (err: boolean) => void;
  labels: TranslationType;
  loginWithGoogle?: () => Promise<void>;
  settings?: AppSettings;
  setIsStaffMode: (is: boolean) => void;
  navigate: (options: { to: string }) => void;
  showWhatsAppChoice: boolean; openWhatsApp: (num: string) => void;
}

export function GalleryDialogs(props: GalleryDialogsProps) {
  const update = useUIStore((s) => s.update);

  return (
    <>
      {props.showPassPrompt && (
        <StaffUnlockDialog 
          isOpen={props.showPassPrompt}
          onClose={() => { update({ showPassPrompt: false }); props.setPassInput(''); props.setPassError(false); }}
          passInput={props.passInput}
          setPassInput={props.setPassInput}
          passError={props.passError}
          labels={props.labels}
          loginWithGoogle={props.loginWithGoogle}
          onSubmit={(e) => {
            e.preventDefault();
            if (props.passInput === props.settings?.access_passcode) {
              props.setIsStaffMode(true);
              update({ showPassPrompt: false });
              props.setPassInput('');
              props.navigate({ to: '/admin' });
            } else {
              props.setPassError(true);
            }
          }}
        />
      )}

      <WhatsAppChoiceDialog 
        isOpen={props.showWhatsAppChoice}
        onClose={() => update({ showWhatsAppChoice: false })}
        settings={props.settings || null}
        labels={props.labels}
        onSelect={(num) => props.openWhatsApp(num)}
      />
    </>
  );
};
